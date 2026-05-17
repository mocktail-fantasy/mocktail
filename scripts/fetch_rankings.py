#!/usr/bin/env python3
"""
Fetch consensus ECR rankings from FantasyPros.
Outputs exports/rankings.json with all 6 formats merged by player_id.

Attribution: Rankings data via FantasyPros (fantasypros.com)

Usage:
    uv run fetch_rankings.py
"""
import http.client
import json
import re
import ssl
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "exports"

RANKING_URLS = {
    "std":         "/nfl/rankings/consensus-cheatsheets.php",
    "half_ppr":    "/nfl/rankings/half-point-ppr-cheatsheets.php",
    "ppr":         "/nfl/rankings/ppr-cheatsheets.php",
    "sf_std":      "/nfl/rankings/superflex-cheatsheets.php",
    "sf_half_ppr": "/nfl/rankings/half-point-ppr-superflex-cheatsheets.php",
    "sf_ppr":      "/nfl/rankings/ppr-superflex-cheatsheets.php",
}


def fetch_ecr(path: str) -> list:
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
    """
    Returns dict keyed by FantasyPros player_id. Each entry has top-level
    player metadata and a 'rankings' dict keyed by format (std, half_ppr, etc).
    Each format stores the full ecrData player object plus a derived 'adp' field.
    """
    merged: dict = {}

    for fmt, path in RANKING_URLS.items():
        print(f"  Fetching {fmt}...")
        players = fetch_ecr(path)
        print(f"    {len(players)} players")

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

            merged[pid]["rankings"][fmt] = {
                **p,
                "adp": adp,  # derived: rank_ecr - player_ecr_delta
            }

    return merged


if __name__ == "__main__":
    print("=== Fetching FantasyPros rankings ===")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rankings = build_rankings()
    out = OUTPUT_DIR / "rankings.json"
    out.write_text(json.dumps(rankings, indent=2))
    print(f"\n  {len(rankings)} players -> {out}")
