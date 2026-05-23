#!/usr/bin/env python3
"""
Fetch consensus ECR rankings, projections, and news from FantasyPros API.
Outputs exports/{rankings,projections,news}.json.

Attribution: FantasyPros (fantasypros.com)

Usage:
    uv run fetch_rankings.py
"""
import datetime
import http.client
import json
import os
import ssl
import time
from pathlib import Path
from urllib.parse import urlencode

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

API_KEY = os.environ.get("FP_API_KEY", "")
if not API_KEY:
    raise RuntimeError("FP_API_KEY not set")

STAGE_DIR = Path(__file__).parent / "stage"
OUTPUT_DIR = Path(__file__).parent / "exports"

FP_HOST = "api.fantasypros.com"
FP_BASE = "/public/v2/json"
SEASON = 2026

# 6 ranking formats: 3 standard (ALL positions) + 3 superflex (OP positions)
RANKING_FORMATS = [
    ("std",         "ALL", "STD"),
    ("half_ppr",    "ALL", "HALF"),
    ("ppr",         "ALL", "PPR"),
    ("sf_std",      "OP",  "STD"),
    ("sf_half_ppr", "OP",  "HALF"),
    ("sf_ppr",      "OP",  "PPR"),
]


def _get(path: str, params: dict = None) -> dict:
    qs = ("?" + urlencode(params)) if params else ""
    full = f"{FP_BASE}{path}{qs}"
    for attempt in range(3):
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(FP_HOST, context=ctx)
        conn.request("GET", full, headers={"x-api-key": API_KEY})
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


def fetch_fp_to_espn_map() -> dict[int, str]:
    """Returns {fp_player_id: espn_id_str} for skill position players."""
    data = _get("/NFL/players", {"external_ids": "espn", "ecr": "included"})
    result = {}
    for p in data.get("players", []):
        if p.get("position_id") in ("QB", "RB", "WR", "TE") and p.get("espn_id"):
            result[p["player_id"]] = str(p["espn_id"])
    return result


def build_fp_to_gsis_map(fp_to_espn: dict[int, str]) -> dict[int, str]:
    """Returns {fp_player_id: gsis_id} via ESPN ID bridge from NflVerse players.csv."""
    import pandas as pd
    players_csv = STAGE_DIR / "players.csv"
    if not players_csv.exists():
        raise FileNotFoundError(f"NflVerse players.csv not found at {players_csv}. Run generate_data.py --download first.")
    df = pd.read_csv(players_csv, usecols=["gsis_id", "espn_id"], dtype=str).dropna()
    espn_to_gsis = dict(zip(df["espn_id"], df["gsis_id"]))
    return {
        fp_id: espn_to_gsis[espn_id]
        for fp_id, espn_id in fp_to_espn.items()
        if espn_id in espn_to_gsis
    }


def build_rankings(fp_to_gsis: dict[int, str]) -> dict:
    """
    Returns dict keyed by gsis_id. Each entry has top-level player metadata,
    a 'rankings' dict keyed by format, and a top-level 'adp' field (half PPR ADP).
    """
    merged: dict[str, dict] = {}

    # Fetch all 6 ranking formats
    for fmt, position, scoring in RANKING_FORMATS:
        print(f"  Fetching rankings: {fmt} ...")
        data = _get(
            f"/nfl/{SEASON}/consensus-rankings",
            {"position": position, "scoring": scoring, "type": "DRAFT"},
        )
        players = data.get("players", [])
        print(f"    {len(players)} players")

        for p in players:
            fp_id = p["player_id"]
            gsis_id = fp_to_gsis.get(fp_id)
            if not gsis_id:
                continue
            if gsis_id not in merged:
                merged[gsis_id] = {
                    "fp_id":              fp_id,
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

    # Fetch ADP (half PPR, all positions)
    print("  Fetching ADP (half PPR) ...")
    adp_data = _get(
        f"/nfl/{SEASON}/consensus-rankings",
        {"position": "ALL", "scoring": "HALF", "type": "ADP"},
    )
    adp_players = adp_data.get("players", [])
    print(f"    {len(adp_players)} players")
    for p in adp_players:
        gsis_id = fp_to_gsis.get(p["player_id"])
        if gsis_id and gsis_id in merged:
            merged[gsis_id]["adp"] = p["rank_ecr"]

    return merged


# News: rolling 30-day window. See plan "Freshness & cutoff policy".
NEWS_WINDOW_DAYS = 30
NEWS_FETCH_LIMIT = 100


def fetch_news() -> list[dict]:
    """Fetch up to NEWS_FETCH_LIMIT most recent news items from FP /news."""
    print(f"  Fetching news (limit={NEWS_FETCH_LIMIT}) ...")
    data = _get("/NFL/news", {"limit": NEWS_FETCH_LIMIT, "order_by": "created"})
    items = data.get("items", [])
    print(f"    {len(items)} items")
    return items


def _parse_created(s: str) -> datetime.datetime | None:
    """Parse FP's 'YYYY-MM-DD HH:MM:SS' UTC timestamps."""
    try:
        return datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


def merge_news(existing: list[dict], fresh: list[dict]) -> list[dict]:
    """
    Merge fresh items into existing, dedup by id, evict items older than
    NEWS_WINDOW_DAYS, and sort newest-first.
    """
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=NEWS_WINDOW_DAYS)
    by_id: dict[int, dict] = {}
    for item in list(existing) + list(fresh):
        # Fresh wins on collision (later in iteration order) — picks up edits/corrections.
        item_id = item.get("id")
        if item_id is None:
            continue
        created = _parse_created(item.get("created", ""))
        if created is None or created < cutoff:
            continue
        by_id[item_id] = item
    return sorted(by_id.values(), key=lambda i: i.get("created", ""), reverse=True)


def load_existing_news(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
        return data.get("items", [])
    except (json.JSONDecodeError, KeyError):
        return []


def fetch_projections(fp_to_gsis: dict[int, str]) -> dict:
    """Fetch QB/RB/WR/TE projections, map to gsis_id."""
    result = {}
    for pos in ["QB", "RB", "WR", "TE"]:
        print(f"  Fetching projections: {pos} ...")
        data = _get(f"/nfl/{SEASON}/projections", {"position": pos, "week": 0})
        players = data.get("players", [])
        print(f"    {len(players)} players")
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


if __name__ == "__main__":
    print("=== Building FP → gsis_id mapping ===")
    fp_to_espn = fetch_fp_to_espn_map()
    fp_to_gsis = build_fp_to_gsis_map(fp_to_espn)
    print(f"  {len(fp_to_gsis)} FP players mapped to gsis_id")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=== Fetching FantasyPros rankings ===")
    rankings = build_rankings(fp_to_gsis)
    out = OUTPUT_DIR / "rankings.json"
    out.write_text(json.dumps(rankings, indent=2))
    print(f"\n  {len(rankings)} players → {out}")

    print("\n=== Fetching FantasyPros projections ===")
    projections = fetch_projections(fp_to_gsis)
    out = OUTPUT_DIR / "projections.json"
    out.write_text(json.dumps(projections, indent=2))
    print(f"\n  {len(projections)} players → {out}")

    print("\n=== Fetching FantasyPros news ===")
    news_path = OUTPUT_DIR / "news.json"
    existing = load_existing_news(news_path)
    fresh = fetch_news()
    merged = merge_news(existing, fresh)
    news_file = {
        "generated_at": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "items": merged,
    }
    news_path.write_text(json.dumps(news_file, indent=2))
    print(f"\n  {len(merged)} items in 30-day window ({len(fresh)} fetched, {len(existing)} prior) → {news_path}")
