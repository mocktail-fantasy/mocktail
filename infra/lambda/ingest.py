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
import ssl
import time
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode, urlparse

import boto3
import pandas as pd

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BUCKET = os.environ["BUCKET"]
DIST_ID = os.environ["DISTRIBUTION_ID"]
FP_API_KEY = os.environ.get("FP_API_KEY", "")

NFLVERSE_HOST = "github.com"
NFLVERSE_BASE = "/nflverse/nflverse-data/releases/download"
FANTASY_POSITIONS = {"QB", "RB", "WR", "TE"}
DEPTH_CHARTS_YEAR = datetime.date.today().year

FP_HOST = "api.fantasypros.com"
FP_BASE = "/public/v2/json"
FP_SEASON = 2026

RANKING_FORMATS = [
    ("std",         "ALL", "STD"),
    ("half_ppr",    "ALL", "HALF"),
    ("ppr",         "ALL", "PPR"),
    ("sf_std",      "OP",  "STD"),
    ("sf_half_ppr", "OP",  "HALF"),
    ("sf_ppr",      "OP",  "PPR"),
]

STAGE_DIR = Path("/tmp/stage")
OUTPUT_DIR = Path("/tmp/exports")

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


def _fp_get(path: str, params: dict = None) -> dict:
    qs = ("?" + urlencode(params)) if params else ""
    full = f"{FP_BASE}{path}{qs}"
    for attempt in range(3):
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(FP_HOST, context=ctx)
        conn.request("GET", full, headers={"x-api-key": FP_API_KEY})
        resp = conn.getresponse()
        body = resp.read().decode("utf-8", errors="ignore")
        conn.close()
        if resp.status == 200:
            return json.loads(body)
        if resp.status == 429 and attempt < 2:
            wait = 2 ** (attempt + 1)
            print(f"    Rate limited, waiting {wait}s ...")
            time.sleep(wait)
            continue
        raise RuntimeError(f"FP API {resp.status} {resp.reason} — {full}\n{body[:300]}")
    raise RuntimeError(f"FP API failed after retries — {full}")


# ---------------------------------------------------------------------------
# FantasyPros — player ID mapping
# ---------------------------------------------------------------------------

def build_fp_to_gsis_map(players_df: pd.DataFrame) -> dict[int, str]:
    """Returns {fp_player_id: gsis_id} via ESPN ID bridge."""
    data = _fp_get("/NFL/players", {"external_ids": "espn", "ecr": "included"})
    fp_to_espn: dict[int, str] = {}
    for p in data.get("players", []):
        if p.get("position_id") in FANTASY_POSITIONS and p.get("espn_id"):
            fp_to_espn[p["player_id"]] = str(p["espn_id"])

    mask = players_df["espn_id"].notna()
    espn_to_gsis = dict(zip(players_df.loc[mask, "espn_id"], players_df.loc[mask, "gsis_id"]))
    return {
        fp_id: espn_to_gsis[espn_id]
        for fp_id, espn_id in fp_to_espn.items()
        if espn_id in espn_to_gsis
    }


# ---------------------------------------------------------------------------
# FantasyPros rankings
# ---------------------------------------------------------------------------

def build_rankings(fp_to_gsis: dict[int, str]) -> dict:
    """Returns dict keyed by gsis_id with rankings by format and half PPR ADP."""
    merged: dict[str, dict] = {}

    for fmt, position, scoring in RANKING_FORMATS:
        print(f"  Fetching rankings: {fmt}")
        data = _fp_get(
            f"/nfl/{FP_SEASON}/consensus-rankings",
            {"position": position, "scoring": scoring, "type": "DRAFT"},
        )
        players = data.get("players", [])
        for p in players:
            gsis_id = fp_to_gsis.get(p["player_id"])
            if not gsis_id:
                continue
            if gsis_id not in merged:
                merged[gsis_id] = {
                    "fp_id":              p["player_id"],
                    "player_name":        p["player_name"],
                    "player_team_id":     p["player_team_id"],
                    "player_position_id": p["player_position_id"],
                    "rankings":           {},
                    "adp":                None,
                }
            merged[gsis_id]["rankings"][fmt] = {
                "rank_ecr": p["rank_ecr"],
                "rank_min": p["rank_min"],
                "rank_max": p["rank_max"],
                "rank_ave": p["rank_ave"],
                "rank_std": p["rank_std"],
                "pos_rank": p["pos_rank"],
                "tier":     p["tier"],
            }

    print("  Fetching ADP (half PPR)")
    adp_data = _fp_get(
        f"/nfl/{FP_SEASON}/consensus-rankings",
        {"position": "ALL", "scoring": "HALF", "type": "ADP"},
    )
    for p in adp_data.get("players", []):
        gsis_id = fp_to_gsis.get(p["player_id"])
        if gsis_id and gsis_id in merged:
            merged[gsis_id]["adp"] = p["rank_ecr"]

    return merged


# ---------------------------------------------------------------------------
# FantasyPros projections
# ---------------------------------------------------------------------------

def fetch_projections(fp_to_gsis: dict[int, str]) -> dict:
    """Fetch QB/RB/WR/TE projections, map to gsis_id."""
    result = {}
    for pos in ["QB", "RB", "WR", "TE"]:
        print(f"  Fetching projections: {pos}")
        data = _fp_get(f"/nfl/{FP_SEASON}/projections", {"position": pos, "week": 0})
        players = data.get("players", [])
        for p in players:
            gsis_id = fp_to_gsis.get(p.get("fpid"))
            if not gsis_id:
                continue
            s = p.get("stats", {})
            result[gsis_id] = {
                "passing_yards":   round(float(s.get("pass_yds", 0))),
                "passing_tds":     round(float(s.get("pass_tds", 0))),
                "interceptions":   round(float(s.get("pass_ints", 0))),
                "rushing_yards":   round(float(s.get("rush_yds", 0))),
                "rushing_tds":     round(float(s.get("rush_tds", 0))),
                "receptions":      round(float(s.get("rec_rec", 0))),
                "receiving_yards": round(float(s.get("rec_yds", 0))),
                "receiving_tds":   round(float(s.get("rec_tds", 0))),
                "fumbles_lost":    round(float(s.get("fumbles", 0)), 1),
            }
    return result


# ---------------------------------------------------------------------------
# NflVerse loaders
# ---------------------------------------------------------------------------

def load_players() -> pd.DataFrame:
    df = pd.read_csv(
        STAGE_DIR / "players.csv",
        usecols=["gsis_id", "display_name", "birth_date", "headshot", "position_group", "espn_id"],
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
    ranked_ids: set | None = None,
) -> pd.DataFrame:
    skill_players = players[
        ~players["gsis_id"].isin(tier1_ids) &
        players["position_group"].isin(FANTASY_POSITIONS)
    ].copy()

    if ranked_ids is not None:
        merged = skill_players[skill_players["gsis_id"].isin(ranked_ids)].copy()
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

    # 1. Download NflVerse CSVs (always fresh)
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

    # 2. Load NflVerse players (needed for ID mapping and roster building)
    players = load_players()

    # 3. Fetch FantasyPros rankings (API)
    print("=== Fetching FantasyPros rankings ===")
    fp_to_gsis = build_fp_to_gsis_map(players)
    print(f"  {len(fp_to_gsis)} FP players mapped to gsis_id")
    rankings = build_rankings(fp_to_gsis)
    ranked_ids = {gsis_id for gsis_id, p in rankings.items() if "half_ppr" in p["rankings"]}
    print(f"  {len(rankings)} players ranked")

    # 3b. Fetch FantasyPros projections
    print("=== Fetching FantasyPros projections ===")
    projections = fetch_projections(fp_to_gsis)
    print(f"  {len(projections)} players with projections")

    # 4. Build active_rosters.json
    print("=== Building active_rosters.json ===")
    config = load_config()
    depth_charts = load_depth_charts()
    tier1 = build_tier1_rosters(depth_charts)
    tier2 = build_tier2_rosters(set(tier1["gsis_id"]), players, ranked_ids)
    rosters = apply_config(
        pd.concat([tier1, tier2], ignore_index=True),
        config, depth_charts, players,
    )
    rosters_out = build_rosters_export(rosters, players)
    print(f"  {len(tier1)} rostered + {len(tier2)} free agents = {len(rosters_out)} total")

    # 5. Write outputs to /tmp
    (OUTPUT_DIR / "active_rosters.json").write_text(json.dumps(rosters_out))
    (OUTPUT_DIR / "rankings.json").write_text(json.dumps(rankings))
    (OUTPUT_DIR / "projections.json").write_text(json.dumps(projections))

    # 6. Upload to S3
    print("=== Uploading to S3 ===")
    for filename in ["active_rosters.json", "rankings.json", "projections.json"]:
        s3.upload_file(
            str(OUTPUT_DIR / filename),
            BUCKET,
            filename,
            ExtraArgs={"ContentType": "application/json"},
        )
        print(f"  Uploaded {filename}")

    # 7. Invalidate CloudFront
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
