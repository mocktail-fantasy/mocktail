# Player News

## Overview/Context

We now need to build a feature that allows us to displayer Player News.  I have developed an AI in a separate from this repository that will supply the data. We may need to incorporate the agent at some point but that would be at a much later date. 

### What the Agent does:

The agent runs on a schedule and produces a JSON file containing plain-language news summaries for NFL skill-position players (QB, RB, WR, TE). It sources news from r/DynastyFF, filters to only official NFL news and injury reports, and summarizes relevant articles per player. The output is designed to be consumed
directly by the app — no post-processing required.

**Output File**

This file is the master store. It persists across runs and is updated incrementally — players are only updated when new articles exist about them. Players with no recent news retain their last summary.

**Shape:**
A single JSON snapshot is written per run. The master store (`player_summaries.json`) persists and is additive across runs.

```json

```json
{
  "generated_at": "2026-03-10T17:14:56",
  "players": {
    "00-0034857": {
      "player_name": "Josh Allen",
      "team": "BUF",
      "summary": "Allen is dealing with a minor elbow concern heading into OTAs...",
      "sources": [
        "https://reddit.com/r/DynastyFF/comments/..."
      ],
      "article_count": 2,
      "generated_at": "2026-03-10T17:14:56"
    }
  }
}
```
```

**Key Characteristics**

- AI Agent has been created using the exact same roster that is used in the web app. This means the player Ids will mapped 1:1 exactly.
- Not every player has a summary. Only players with recent news appear in the file. The app should handle missing entries gracefully.
- Summaries are factual, not analytical. They report what happened (signings, trades, injuries) without fantasy recommendations or editorializing. The user draws their own conclusions.
- generated_at indicates freshness. The app can use this to show how recent a summary is or to visually flag stale entries.
- player_id is the join key between this file and the app's existing player data.

---

## Implementation Details

### Incorporation

Since the playerIds are perfectly mapped all we need to do is search for each player by ID in the player_summaries.json.  I have added the file to the public directory where the other data resides. If you believe we should combine these sources before placing them into the public directory I can add them to an inputs folder in the scripts directory. Please advise on how what you think is the best way.  Besides this the logic has been mostly abstracted away all we need to do is combine the data sources. 

### UI

The UI component is largely undefined but it should adhere to the following requirements:

- News Summaries should not clutter the player views.  The summaries should be at most 3 sentences.
- News stories should be easy to access/read by users. This data was not easy to acquire so it is important that users are aware of the feature.
- UI should handle cases where there are no news stories. There should not be empty boxes that say “no news” as this will be common for many players.
- Implementation should consider how the feature affects the mobile view.

Please give suggestions on how these types of features can be implemented in an already busy UI. I have some ideas that I will outline below but I am open to any solution that is outside of my suggestions:

1. Have a box that displays the news above the projections box that can be minimized if necessary. 
    1. This may be too cluttered we are already having space issues so defaulting to a news box might be too much.
    2. Counterpoint: News stories are not provided for teams which is the page that has the the least real estate. Player views might be fine to add. 
2. Have an Icon that is highlighted a bright color so users know they can click it for information. 
    1. Making it a bright color should draw the attention to users but it could still be missed. 
3. Display the information elsewhere on the page. 
    1. Sleeper displays news on the side of their card.
    2. This feels like it entirely breaks the design we currently have. We could do a complete tear down and redesign. 
    3. We do not utilize any space on the margins as is.