#!/usr/bin/env bash
set -e

BUCKET="mocktail-data-prod"
PUBLIC_DIR="$(dirname "$0")/../apps/web/public"

FILES=(
  active_rosters.json
  historical_data.json
  teams.json
  team_history.json
  player_summaries.json
  team_summaries.json
)

for file in "${FILES[@]}"; do
  if [ -f "$PUBLIC_DIR/$file" ]; then
    aws s3 cp "$PUBLIC_DIR/$file" "s3://$BUCKET/$file" --content-type "application/json"
    echo "Uploaded $file"
  else
    echo "Skipping $file (not found)"
  fi
done

echo "Done."
