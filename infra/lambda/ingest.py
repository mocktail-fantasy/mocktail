"""
Mocktail nightly ingestion Lambda.

Runs nightly via EventBridge. Fetches FantasyPros rankings + NflVerse roster
data, builds active_rosters.json and rankings.json, uploads to S3, and
invalidates CloudFront.

Attribution: Rankings data via FantasyPros (fantasypros.com)
"""
import datetime
import gzip
import http.client
import json
import os
import re
import ssl
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import boto3
import pandas as pd

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BUCKET = os.environ["BUCKET"]
DIST_ID = os.environ["DISTRIBUTION_ID"]

NFLVERSE_HOST = "github.com"
NFLVERSE_BASE = "/nflverse/nflverse-data/releases/download"
FANTASY_POSITIONS = {"QB", "RB", "WR", "TE"}
DEPTH_CHARTS_YEAR = datetime.date.today().year

STAGE_DIR = Path("/tmp/stage")
OUTPUT_DIR = Path("/tmp/exports")

RANKING_URLS = {
    "std":         "/nfl/rankings/consensus-cheatsheets.php",
    "half_ppr":    "/nfl/rankings/half-point-ppr-cheatsheets.php",
    "ppr":         "/nfl/rankings/ppr-cheatsheets.php",
    "sf_std":      "/nfl/rankings/superflex-cheatsheets.php",
    "sf_half_ppr": "/nfl/rankings/half-point-ppr-superflex-cheatsheets.php",
    "sf_ppr":      "/nfl/rankings/ppr-superflex-cheatsheets.php",
}

s3 = boto3.client("s3")
cf = boto3.client("cloudfront")

# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def _fetch(host: str, path: str, max_redirects: int = 5) -> bytes:
    if max_redirects <= 0:
        raise RuntimeError("Too many redirects")
    conn = http.client.HTTPSConnection(host, context=ssl.create_default_context())
    conn.request("GET", path)
    resp = conn.getresponse()
    if resp.status == 200:
        data = resp.read()
        conn.close()
        return data
    elif resp.status in (301, 302):
        loc = resp.getheader("Location")
        conn.close()
        parsed = urlparse(loc)
        new_path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        return _fetch(parsed.netloc, new_path, max_redirects - 1)
    else:
        conn.close()
        raise RuntimeError(f"HTTP {resp.status} {resp.reason} — {host}{path}")


def _stage_file(dest: Path, host: str, url_path: str, gzipped: bool = False):
    """Always downloads fresh — no caching in Lambda."""
    print(f"  Downloading {dest.name} ...")
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = _fetch(host, url_path)
    if gzipped:
        with gzip.GzipFile(fileobj=BytesIO(data)) as gz:
            data = gz.read()
    dest.write_bytes(data)


# ---------------------------------------------------------------------------
# FantasyPros rankings
# ---------------------------------------------------------------------------

def _fetch_ecr(path: str) -> list:
    conn = http.client.HTTPSConnection(
        "www.fantasypros.com", context=ssl.create_default_context()
    )
    conn.request(
        "GET",
        path,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "text/html",
        },
    )
    resp = conn.getresponse()
    html = resp.read().decode("utf-8", errors="ignore")
    match = re.search(r"ecrData\s*=\s*(\{.*?\});\s*\n", html)
    if not match:
        raise ValueError(f"ecrData not found in {path}")
    data = json.loads(match.group(1))
    return data["players"]


def build_rankings() -> dict:
    merged: dict = {}
    for fmt, path in RANKING_URLS.items():
        print(f"  Fetching rankings: {fmt}")
        players = _fetch_ecr(path)
        for p in players:
            pid = p["player_id"]
            if pid not in merged:
                merged[pid] = {
                    "player_id":          pid,
                    "player_name":        p["player_name"],
                    "player_team_id":     p["player_team_id"],
                    "player_position_id": p["player_position_id"],
                    "rankings":           {},
                }
            delta = p.get("player_ecr_delta")
            adp = round(p["rank_ecr"] - delta) if delta is not None else None
            merged[pid]["rankings"][fmt] = {**p, "adp": adp}
    return merged


# ---------------------------------------------------------------------------
# NflVerse loaders
# ---------------------------------------------------------------------------

def load_players() -> pd.DataFrame:
    df = pd.read_csv(
        STAGE_DIR / "players.csv",
        usecols=["gsis_id", "display_name", "birth_date", "headshot", "position_group"],
        dtype=str,
    )
    return df.dropna(subset=["gsis_id"]).reset_index(drop=True)


def load_depth_charts() -> pd.DataFrame:
    df = pd.read_csv(
        STAGE_DIR / f"depth_charts_{DEPTH_CHARTS_YEAR}.csv",
        usecols=["dt", "team", "player_name", "gsis_id", "pos_abb", "pos_rank"],
        dtype=str,
    )
    df = df.dropna(subset=["gsis_id"]).reset_index(drop=True)
    df["gsis_id"] = df["gsis_id"].replace("00-0023500", "00-0039471")
    return df


def load_config() -> dict:
    """Load allow/deny config from S3. Falls back to empty config if not found."""
    try:
        obj = s3.get_object(Bucket=BUCKET, Key="config/config.json")
        return json.loads(obj["Body"].read())
    except s3.exceptions.NoSuchKey:
        return {"allow": [], "deny": []}


# ---------------------------------------------------------------------------
# Roster builders
# ---------------------------------------------------------------------------

def build_tier1_rosters(depth_charts: pd.DataFrame) -> pd.DataFrame:
    latest_dt = depth_charts["dt"].max()
    dc = depth_charts[
        (depth_charts["dt"] == latest_dt) & depth_charts["pos_abb"].isin(FANTASY_POSITIONS)
    ].copy()

    rosters = (
        dc.groupby("gsis_id")
        .agg(
            team=("team", "first"),
            player_name=("player_name", "first"),
            pos_abbs=("pos_abb", lambda x: sorted(set(x.dropna()))),
        )
        .reset_index()
    )
    return rosters[
        rosters["pos_abbs"].apply(lambda p: bool(FANTASY_POSITIONS & set(p)))
    ].reset_index(drop=True)


def build_tier2_rosters(
    tier1_ids: set,
    players: pd.DataFrame,
    ranked_names: set | None = None,
) -> pd.DataFrame:
    skill_players = players[
        ~players["gsis_id"].isin(tier1_ids) &
        players["position_group"].isin(FANTASY_POSITIONS)
    ].copy()

    if ranked_names is not None:
        skill_players["name_lower"] = skill_players["display_name"].str.lower()
        merged = skill_players[skill_players["name_lower"].isin(ranked_names)].copy()
    else:
        merged = skill_players.copy()

    merged["pos_abbs"]    = merged["position_group"].apply(lambda p: [p])
    merged["team"]        = "FA"
    merged["player_name"] = merged["display_name"]
    return merged[["gsis_id", "team", "player_name", "pos_abbs"]].reset_index(drop=True)


def apply_config(
    rosters: pd.DataFrame,
    config: dict,
    depth_charts: pd.DataFrame,
    players: pd.DataFrame,
) -> pd.DataFrame:
    deny_ids = set(config.get("deny", []))
    allow_ids = set(config.get("allow", []))

    rosters = rosters[~rosters["gsis_id"].isin(deny_ids)].reset_index(drop=True)

    to_add = allow_ids - set(rosters["gsis_id"])
    if not to_add:
        return rosters

    latest_dt = depth_charts["dt"].max()
    dc = depth_charts[depth_charts["dt"] == latest_dt]
    dc_index = (
        dc.groupby("gsis_id")
        .agg(team=("team", "first"), pos_abbs=("pos_abb", lambda x: sorted(set(x.dropna()))))
        .to_dict("index")
    )

    rows = []
    for gsis_id in to_add:
        p = players[players["gsis_id"] == gsis_id]
        if p.empty:
            print(f"  Warning: allow-listed {gsis_id} not found in players.csv — skipping")
            continue
        p = p.iloc[0]
        if gsis_id in dc_index:
            team     = dc_index[gsis_id]["team"]
            pos_abbs = [pos for pos in dc_index[gsis_id]["pos_abbs"] if pos in FANTASY_POSITIONS]
        else:
            team     = "FA"
            pos_group = p.get("position_group")
            pos_abbs  = [pos_group] if pd.notna(pos_group) and pos_group in FANTASY_POSITIONS else []
        if not pos_abbs:
            print(f"  Warning: allow-listed {gsis_id} has no fantasy positions — skipping")
            continue
        rows.append({"gsis_id": gsis_id, "team": team, "player_name": p["display_name"], "pos_abbs": pos_abbs})

    if rows:
        rosters = pd.concat([rosters, pd.DataFrame(rows)], ignore_index=True)
    return rosters


def _calc_age(birth_date_str) -> float | None:
    try:
        bd = datetime.date.fromisoformat(str(birth_date_str)[:10])
        return round((datetime.date.today() - bd).days / 365.25, 1)
    except Exception:
        return None


def build_rosters_export(rosters: pd.DataFrame, players: pd.DataFrame) -> list:
    merged = rosters.merge(players, on="gsis_id", how="inner")
    result = []
    for _, row in merged.iterrows():
        result.append({
            "player_id":   row["gsis_id"],
            "player_name": row["player_name"],
            "positions":   row["pos_abbs"],
            "team":        row["team"],
            "age":         _calc_age(row.get("birth_date")),
            "headshot":    row["headshot"] if pd.notna(row.get("headshot")) else None,
        })
    return result


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Fetch FantasyPros rankings
    print("=== Fetching FantasyPros rankings ===")
    rankings = build_rankings()
    ranked_names = {
        p["player_name"].lower()
        for p in rankings.values()
        if "half_ppr" in p["rankings"]
    }
    print(f"  {len(rankings)} players ranked")

    # 2. Download NflVerse CSVs (always fresh)
    print("=== Downloading NflVerse data ===")
    _stage_file(
        STAGE_DIR / "players.csv",
        NFLVERSE_HOST,
        f"{NFLVERSE_BASE}/players/players.csv",
    )
    _stage_file(
        STAGE_DIR / f"depth_charts_{DEPTH_CHARTS_YEAR}.csv",
        NFLVERSE_HOST,
        f"{NFLVERSE_BASE}/depth_charts/depth_charts_{DEPTH_CHARTS_YEAR}.csv",
    )

    # 3. Build active_rosters.json
    print("=== Building active_rosters.json ===")
    config = load_config()
    players = load_players()
    depth_charts = load_depth_charts()
    tier1 = build_tier1_rosters(depth_charts)
    tier2 = build_tier2_rosters(set(tier1["gsis_id"]), players, ranked_names)
    rosters = apply_config(
        pd.concat([tier1, tier2], ignore_index=True),
        config, depth_charts, players,
    )
    rosters_out = build_rosters_export(rosters, players)
    print(f"  {len(tier1)} rostered + {len(tier2)} free agents = {len(rosters_out)} total")

    # 4. Write outputs to /tmp
    (OUTPUT_DIR / "active_rosters.json").write_text(json.dumps(rosters_out))
    (OUTPUT_DIR / "rankings.json").write_text(json.dumps(rankings))

    # 5. Upload to S3
    print("=== Uploading to S3 ===")
    for filename in ["active_rosters.json", "rankings.json"]:
        s3.upload_file(
            str(OUTPUT_DIR / filename),
            BUCKET,
            filename,
            ExtraArgs={"ContentType": "application/json"},
        )
        print(f"  Uploaded {filename}")

    # 6. Invalidate CloudFront
    print("=== Invalidating CloudFront ===")
    cf.create_invalidation(
        DistributionId=DIST_ID,
        InvalidationBatch={
            "Paths": {"Quantity": 1, "Items": ["/*"]},
            "CallerReference": context.aws_request_id,
        },
    )
    print("  Done")

    return {"status": "ok", "players": len(rosters_out), "ranked": len(rankings)}
