#!/usr/bin/env python3
"""
NFL Data Generator
==================
Downloads data from NflVerse, transforms it, and writes JSON exports.
This is the local dev equivalent of the production ingestion Lambda.

Usage:
    uv run generate_data.py              # use cached CSVs, regenerate JSON
    uv run generate_data.py --download   # force re-download all CSVs first

Outputs (written to scripts/exports/):
    active_rosters.json   - flat JSON array of current skill position players
    historical_data.json  - JSON object keyed by player_id with season history

To sync exports to the web app for local dev:
    pnpm data:sync
"""

import argparse
import datetime
import gzip
import http.client
import json
import ssl
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

NFLVERSE_HOST = "github.com"
NFLVERSE_BASE = "/nflverse/nflverse-data/releases/download"

WEEKLY_START_YEAR = 1999
DEPTH_CHARTS_YEAR = 2025
FANTASY_POSITIONS = {"QB", "RB", "WR", "TE"}

_HERE = Path(__file__).parent
STAGE_DIR = _HERE / "stage"
OUTPUT_DIR = _HERE / "exports"

FA_MIN_POINTS = 75.0  # minimum fantasy points in a recent season to qualify as a free agent

# ---------------------------------------------------------------------------
# HTTP fetcher (mirrors file_repo.py)
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


# ---------------------------------------------------------------------------
# Staging: download CSVs to disk with caching
# ---------------------------------------------------------------------------

def _current_season() -> int:
    """Return the current NFL season year."""
    today = datetime.date.today()
    year = today.year
    sept_first = datetime.date(year, 9, 1)
    offset = (0 - sept_first.weekday()) % 7
    labor_day = sept_first + datetime.timedelta(days=offset)
    first_nfl_sunday = labor_day + datetime.timedelta(days=6)
    return year if today >= first_nfl_sunday else year - 1


def _recent_seasons(n: int = 2) -> list[int]:
    """Return the n most recently completed NFL seasons."""
    current = _current_season()
    return list(range(current - n + 1, current + 1))


def _stage_file(dest: Path, host: str, url_path: str, force: bool, gzipped: bool = False):
    if dest.exists() and not force:
        return
    print(f"  Downloading {dest.name} ...")
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = _fetch(host, url_path)
    if gzipped:
        with gzip.GzipFile(fileobj=BytesIO(data)) as gz:
            data = gz.read()
    dest.write_bytes(data)



def stage_all(force: bool = False):
    """
    Download all required source CSVs to STAGE_DIR.
    Files already on disk are skipped unless force=True.

    Weekly stats are staged per year so a single failed download
    doesn't require re-fetching everything.
    """
    print("=== Staging CSVs ===")
    current = _current_season()

    _stage_file(
        STAGE_DIR / "players.csv",
        NFLVERSE_HOST,
        f"{NFLVERSE_BASE}/players/players.csv",
        force,
    )

    _stage_file(
        STAGE_DIR / "teams_colors_logos.csv",
        NFLVERSE_HOST,
        f"{NFLVERSE_BASE}/teams/teams_colors_logos.csv",
        force,
    )

    _stage_file(
        STAGE_DIR / f"depth_charts_{DEPTH_CHARTS_YEAR}.csv",
        NFLVERSE_HOST,
        f"{NFLVERSE_BASE}/depth_charts/depth_charts_{DEPTH_CHARTS_YEAR}.csv",
        force,
    )

    for year in range(WEEKLY_START_YEAR, current + 1):
        _stage_file(
            STAGE_DIR / "weekly" / f"{year}.csv",
            NFLVERSE_HOST,
            f"{NFLVERSE_BASE}/stats_player/stats_player_week_{year}.csv",
            force,
        )

    print(f"=== Staging complete ({WEEKLY_START_YEAR}–{current} weekly files) ===\n")


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

# Columns we want from the weekly CSV. NflVerse renamed some columns across
# versions — we list both names and normalise after loading.
_WEEKLY_COLS_WANTED = [
    "player_id", "season", "week", "season_type", "team",
    "completions", "attempts",
    "passing_yards", "passing_tds",
    "interceptions", "passing_interceptions",   # renamed in newer releases
    "sacks", "sacks_suffered",                  # renamed in newer releases
    "sack_yards", "sack_yards_lost",            # renamed in newer releases
    "sack_fumbles", "sack_fumbles_lost",
    "carries",
    "rushing_yards", "rushing_tds",
    "rushing_fumbles", "rushing_fumbles_lost",
    "receptions", "targets",
    "receiving_yards", "receiving_tds",
    "receiving_fumbles", "receiving_fumbles_lost",
    "fantasy_points", "fantasy_points_ppr",
]

# Old name -> canonical name
_WEEKLY_RENAMES = {
    "passing_interceptions": "interceptions",
    "sacks_suffered":        "sacks",
    "sack_yards_lost":       "sack_yards",
}

# All numeric columns after renaming
_NUMERIC_COLS = [
    "completions", "attempts", "passing_yards", "passing_tds", "interceptions",
    "sacks", "sack_yards", "sack_fumbles", "sack_fumbles_lost",
    "carries", "rushing_yards", "rushing_tds", "rushing_fumbles", "rushing_fumbles_lost",
    "receptions", "targets", "receiving_yards", "receiving_tds",
    "receiving_fumbles", "receiving_fumbles_lost",
    "fantasy_points", "fantasy_points_ppr",
]


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

    # Frank Gore Sr. (00-0023500) is incorrectly mapped to Frank Gore Jr. (00-0039471)
    # in the depth chart source due to name-matching that strips "Jr." suffixes.
    # Both were RBs on the Bills, making this an undetectable collision in the source data.
    df["gsis_id"] = df["gsis_id"].replace("00-0023500", "00-0039471")

    return df


def load_config() -> dict:
    """Load allow/deny gsis_id lists from config.json."""
    config_path = _HERE / "config.json"
    if not config_path.exists():
        return {"allow": [], "deny": []}
    with open(config_path) as f:
        return json.load(f)


_ANNUAL_AGG = dict(
    games_played=("week", "count"),
    completions=("completions", "sum"),
    attempts=("attempts", "sum"),
    passing_yards=("passing_yards", "sum"),
    passing_tds=("passing_tds", "sum"),
    interceptions=("interceptions", "sum"),
    sack_fumbles=("sack_fumbles", "sum"),
    sack_fumbles_lost=("sack_fumbles_lost", "sum"),
    carries=("carries", "sum"),
    rushing_yards=("rushing_yards", "sum"),
    rushing_tds=("rushing_tds", "sum"),
    rushing_fumbles=("rushing_fumbles", "sum"),
    rushing_fumbles_lost=("rushing_fumbles_lost", "sum"),
    receptions=("receptions", "sum"),
    targets=("targets", "sum"),
    receiving_yards=("receiving_yards", "sum"),
    receiving_tds=("receiving_tds", "sum"),
    receiving_fumbles=("receiving_fumbles", "sum"),
    receiving_fumbles_lost=("receiving_fumbles_lost", "sum"),
    fantasy_points=("fantasy_points", "sum"),
    fantasy_points_ppr=("fantasy_points_ppr", "sum"),
)


def _load_weekly_df() -> pd.DataFrame:
    """
    Load all staged weekly CSVs, filter to regular season, and normalise columns.
    Returns the raw weekly DataFrame; does not aggregate.
    """
    print("=== Loading & aggregating weekly stats ===")
    frames = []
    weekly_dir = STAGE_DIR / "weekly"

    for path in sorted(weekly_dir.glob("*.csv")):
        try:
            available = pd.read_csv(path, nrows=0).columns.tolist()
            cols = [c for c in _WEEKLY_COLS_WANTED if c in available]
            df = pd.read_csv(path, usecols=cols, dtype=str, low_memory=False)

            df.rename(columns={k: v for k, v in _WEEKLY_RENAMES.items() if k in df.columns}, inplace=True)

            if "season_type" in df.columns:
                df = df[df["season_type"] == "REG"]

            frames.append(df)
        except Exception as e:
            print(f"  Warning: skipping {path.name} — {e}")

    print(f"  Loaded {len(frames)} yearly files")
    weekly = pd.concat(frames, ignore_index=True)

    # Ensure every numeric column exists (older files may be missing newer columns)
    for col in _NUMERIC_COLS:
        if col not in weekly.columns:
            weekly[col] = 0
        weekly[col] = pd.to_numeric(weekly[col], errors="coerce").fillna(0)

    weekly["season"] = pd.to_numeric(weekly["season"], errors="coerce")
    return weekly.dropna(subset=["player_id", "season"])


def load_annual_stats() -> pd.DataFrame:
    """
    Load all staged weekly CSVs, filter to regular season, and aggregate
    to one row per (player_id, season).
    """
    weekly = _load_weekly_df()
    annual = weekly.groupby(["player_id", "season"]).agg(**_ANNUAL_AGG).reset_index()
    annual["season"] = annual["season"].astype(int)
    print(f"  Annual stats: {len(annual)} player-season rows\n")
    return annual


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------

def build_tier1_rosters(depth_charts: pd.DataFrame) -> pd.DataFrame:
    """All players currently on a roster at a fantasy position, regardless of depth rank."""
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
    annual: pd.DataFrame,
    tier1_ids: set,
    players: pd.DataFrame,
) -> pd.DataFrame:
    """Free agents: scored FA_MIN_POINTS+ in any of the three most recent seasons and not on a current roster."""
    recent = annual[annual["season"].isin(_recent_seasons(n=3))]
    top = (
        recent.groupby("player_id")["fantasy_points"]
        .max()
        .reset_index()
    )
    top = top[(top["fantasy_points"] >= FA_MIN_POINTS) & (~top["player_id"].isin(tier1_ids))]

    merged = top.merge(
        players[["gsis_id", "display_name", "position_group"]],
        left_on="player_id", right_on="gsis_id", how="inner",
    )
    merged = merged[merged["position_group"].isin(FANTASY_POSITIONS)].reset_index(drop=True)
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
    """Remove denied players and add any manually allow-listed players."""
    deny_ids = set(config.get("deny", []))
    allow_ids = set(config.get("allow", []))

    rosters = rosters[~rosters["gsis_id"].isin(deny_ids)].reset_index(drop=True)

    to_add = allow_ids - set(rosters["gsis_id"])
    if not to_add:
        return rosters

    # Build a depth-chart index (any depth) for allow-listed players that may be on a team
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


def _r1(val) -> float:
    """Round to 1 decimal place, returning 0.0 on error."""
    try:
        return round(float(val), 1)
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Export builders
# ---------------------------------------------------------------------------

def build_rosters_export(rosters: pd.DataFrame, players: pd.DataFrame) -> list:
    """
    Returns a list of player dicts — serialises to a flat JSON array.
    Matches the format of exports/active_rosters.json.
    """
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


def build_historical_export(
    annual: pd.DataFrame,
    rosters: pd.DataFrame,
    players: pd.DataFrame,
) -> dict:
    """
    Returns a dict keyed by player_id — serialises to a JSON object.
    Matches the format of exports/weekly_historical_data.json.
    """
    data = (
        annual
        .merge(rosters[["gsis_id", "team", "pos_abbs"]], left_on="player_id", right_on="gsis_id", how="inner")
        .merge(players[["gsis_id", "display_name", "birth_date", "headshot"]], on="gsis_id", how="inner")
    )

    result = {}
    for player_id, group in data.groupby("player_id"):
        row0 = group.iloc[0]

        # Per-season entries
        seasons = []
        for _, s in group.sort_values("season").iterrows():
            seasons.append({
                "season":             int(s["season"]),
                "games_played":       int(s["games_played"]),
                "fantasy_points":     _r1(s["fantasy_points"]),
                "fantasy_points_ppr": _r1(s["fantasy_points_ppr"]),
                "fumbles":            int(s["sack_fumbles"] + s["rushing_fumbles"] + s["receiving_fumbles"]),
                "fumbles_lost":       int(s["rushing_fumbles_lost"] + s["receiving_fumbles_lost"]),
                "passing": {
                    "attempts":      int(s["attempts"]),
                    "completions":   int(s["completions"]),
                    "yards":         _r1(s["passing_yards"]),
                    "tds":           int(s["passing_tds"]),
                    "interceptions": int(s["interceptions"]),
                },
                "rushing": {
                    "attempts": int(s["carries"]),
                    "yards":    _r1(s["rushing_yards"]),
                    "tds":      int(s["rushing_tds"]),
                },
                "receiving": {
                    "receptions": int(s["receptions"]),
                    "targets":    int(s["targets"]),
                    "yards":      _r1(s["receiving_yards"]),
                    "tds":        int(s["receiving_tds"]),
                },
            })

        # Cross-season aggregate
        total_attempts = group["attempts"].sum()
        total_completions = group["completions"].sum()
        comp_pct = _r1(total_completions / total_attempts * 100) if total_attempts > 0 else 0.0

        aggregate = {
            "games_played":       _r1(group["games_played"].mean()),
            "fantasy_points":     _r1(group["fantasy_points"].mean()),
            "fantasy_points_ppr": _r1(group["fantasy_points_ppr"].mean()),
            "fumbles":            _r1((group["sack_fumbles"] + group["rushing_fumbles"] + group["receiving_fumbles"]).mean()),
            "fumbles_lost":       _r1((group["rushing_fumbles_lost"] + group["receiving_fumbles_lost"]).mean()),
            "passing": {
                "average_completion_percentage": comp_pct,
                "yards":         _r1(group["passing_yards"].mean()),
                "tds":           _r1(group["passing_tds"].mean()),
                "interceptions": _r1(group["interceptions"].mean()),
            },
            "rushing": {
                "attempts": _r1(group["carries"].mean()),
                "yards":    _r1(group["rushing_yards"].mean()),
                "tds":      _r1(group["rushing_tds"].mean()),
            },
            "receiving": {
                "receptions": _r1(group["receptions"].mean()),
                "targets":    _r1(group["targets"].mean()),
                "yards":      _r1(group["receiving_yards"].mean()),
                "tds":        _r1(group["receiving_tds"].mean()),
            },
        }

        result[player_id] = {
            "player_id":   player_id,
            "player_name": row0["display_name"],
            "positions":   row0["pos_abbs"],
            "team":        row0["team"],
            "aggregate":   aggregate,
            "seasons":     seasons,
        }

    return result


def build_teams_export() -> dict:
    """
    Returns a dict keyed by team_abbr — serialises to teams.json.
    Includes full team name, colors, and all logo URL variants from NFLVerse.
    """
    df = pd.read_csv(STAGE_DIR / "teams_colors_logos.csv", dtype=str)

    def _val(v):
        return None if pd.isna(v) else str(v).strip()

    result = {}
    for _, row in df.iterrows():
        abbr = _val(row.get("team_abbr"))
        if not abbr:
            continue
        result[abbr] = {
            "team_abbr":            abbr,
            "team_name":            _val(row.get("team_name")),
            "team_nick":            _val(row.get("team_nick")),
            "team_conf":            _val(row.get("team_conf")),
            "team_division":        _val(row.get("team_division")),
            "team_color":           _val(row.get("team_color")),
            "team_color2":          _val(row.get("team_color2")),
            "team_color3":          _val(row.get("team_color3")),
            "team_color4":          _val(row.get("team_color4")),
            "team_logo_wikipedia":  _val(row.get("team_logo_wikipedia")),
            "team_logo_espn":       _val(row.get("team_logo_espn")),
            "team_wordmark":        _val(row.get("team_wordmark")),
            "team_conference_logo": _val(row.get("team_conference_logo")),
            "team_league_logo":     _val(row.get("team_league_logo")),
            "team_logo_squared":    _val(row.get("team_logo_squared")),
        }
    return result


def build_team_history_export(annual_by_team: pd.DataFrame, players: pd.DataFrame) -> dict:
    """
    Returns a dict keyed by team abbreviation — serialises to team_history.json.
    Contains last season's stats for all fantasy-relevant players, grouped by team.
    Players traded mid-season appear under the team they were with during those weeks.
    """
    last_season = _current_season()
    season_df = annual_by_team[annual_by_team["season"] == last_season].copy()

    merged = season_df.merge(
        players[["gsis_id", "display_name", "birth_date", "headshot", "position_group"]],
        left_on="player_id", right_on="gsis_id", how="inner",
    )
    merged = merged[merged["position_group"].isin(FANTASY_POSITIONS)].copy()

    result: dict[str, list] = {}
    for team, group in merged.groupby("team"):
        if not team or pd.isna(team):
            continue
        players_list = []
        for _, row in group.sort_values("fantasy_points", ascending=False).iterrows():
            fumbles_lost = int(row["rushing_fumbles_lost"] + row["receiving_fumbles_lost"])
            players_list.append({
                "player_id":        row["player_id"],
                "player_name":      row["display_name"],
                "positions":        [row["position_group"]],
                "age":              _calc_age(row.get("birth_date")),
                "headshot":         row["headshot"] if pd.notna(row.get("headshot")) else None,
                "games_played":     int(row["games_played"]),
                "fantasy_points":   _r1(row["fantasy_points"]),
                "passing_attempts": int(row["attempts"]),
                "passing_yards":    int(row["passing_yards"]),
                "passing_tds":      int(row["passing_tds"]),
                "interceptions":    int(row["interceptions"]),
                "rushing_yards":    int(row["rushing_yards"]),
                "rushing_tds":      int(row["rushing_tds"]),
                "receptions":       int(row["receptions"]),
                "receiving_yards":  int(row["receiving_yards"]),
                "receiving_tds":    int(row["receiving_tds"]),
                "fumbles_lost":     fumbles_lost,
            })
        result[str(team)] = players_list

    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def generate_exports(force_download: bool = False):
    stage_all(force_download)

    config       = load_config()
    players      = load_players()
    depth_charts = load_depth_charts()

    # Load weekly data once; aggregate two ways
    weekly_df    = _load_weekly_df()
    annual_stats = weekly_df.groupby(["player_id", "season"]).agg(**_ANNUAL_AGG).reset_index()
    annual_stats["season"] = annual_stats["season"].astype(int)
    print(f"  Annual stats: {len(annual_stats)} player-season rows\n")

    annual_by_team = (
        weekly_df.dropna(subset=["team"])
        .groupby(["player_id", "season", "team"]).agg(**_ANNUAL_AGG).reset_index()
    )
    annual_by_team["season"] = annual_by_team["season"].astype(int)

    tier1   = build_tier1_rosters(depth_charts)
    tier2   = build_tier2_rosters(annual_stats, set(tier1["gsis_id"]), players)
    rosters = apply_config(
        pd.concat([tier1, tier2], ignore_index=True),
        config, depth_charts, players,
    )
    print(f"  Player pool: {len(tier1)} rostered + {len(tier2)} free agents = {len(rosters)} total\n")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Building active_rosters.json ===")
    rosters_out = build_rosters_export(rosters, players)
    out = OUTPUT_DIR / "active_rosters.json"
    out.write_text(json.dumps(rosters_out, indent=2))
    print(f"  {len(rosters_out)} players -> {out}\n")

    print("=== Building historical_data.json ===")
    historical_out = build_historical_export(annual_stats, rosters, players)
    out = OUTPUT_DIR / "historical_data.json"
    out.write_text(json.dumps(historical_out, indent=2))
    print(f"  {len(historical_out)} players -> {out}\n")

    print("=== Building team_history.json ===")
    team_history_out = build_team_history_export(annual_by_team, players)
    out = OUTPUT_DIR / "team_history.json"
    out.write_text(json.dumps(team_history_out, indent=2))
    print(f"  {len(team_history_out)} teams -> {out}\n")

    print("=== Building teams.json ===")
    teams_out = build_teams_export()
    out = OUTPUT_DIR / "teams.json"
    out.write_text(json.dumps(teams_out, indent=2))
    print(f"  {len(teams_out)} teams -> {out}\n")

    print("=== Export complete ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate NFL JSON exports from NflVerse data.")
    parser.add_argument(
        "--download",
        action="store_true",
        help="Force re-download all staged CSVs (otherwise uses cache)",
    )
    args = parser.parse_args()
    generate_exports(force_download=args.download)
