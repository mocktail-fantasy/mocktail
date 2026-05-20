#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "=== Step 1: Fetch FantasyPros rankings + projections ==="
uv run fetch_rankings.py

echo ""
echo "=== Step 2: Generate data exports ==="
uv run generate_data.py "$@"

echo ""
echo "=== Step 3: Sync to web app ==="
pnpm --dir .. data:sync

echo ""
echo "=== All done ==="
