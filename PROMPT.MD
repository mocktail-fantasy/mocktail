## Overview

I am designing an app that will be used for creating Fantasy Football projections.  Users should be able to enter/edit stats for active NFL players. These stats will then be converted to fantasy points.  These points will then be used to create rankings for the players.  

This app is intended to be created in stages over several iterations. I will provide a rough outline below of the stages of development that give a loose description of how I plan to evolve the app.  This is provided only so that you have context for the long term vision. Your design decisions should consider both the immediate requirements and long term requirements.  

ALL design decisions I have made ARE negotiable.  I am only providing my design as guidance on how I envision it to work.

Here are the requirements for this specific prompt:
1. Read the below requirements and design. 
2. Review and comment on the design and ask clarifying questions/make suggestions. 
3. Finalize design for the initial build and for the long term future
4. Once the design is finalized create a write up and place it in a DESIGN.MD file. 

The DESIGN.MD will be used to create the first dev iteration and should be referenced for future development as well. 

—————————————————————————————————————————————————-

** DO NOT INCLUDE THIS INFORMATION IN THE DESIGN.MD **

## Additional Context

- I have several years of backend software development experience so I may at times write code to handle the backend.  There might times that I require you to create scaffolding but I will actually implement the service calls. I will still lean on you for bootstrapping services, giving design recommendations, and reviewing changes for the backend when I do want to write the code myself. Any time a backend change is needed be sure to ask before making the change.
- Although initially out of scope when we start to work with cloud services, I will be highly bias toward AWS and AWS CDK for infra as code. I have a lot of experience in these areas and it will be a lot easier for me to understand the code and discuss design decisions if we use tools I am familiar with. I will be open to using other services from different providers but only if it has substantial cost savings or performance benefits.
- I have almost no frontend experience.  Most of the front end will be designed and implemented by you. I have a general knowledge of frameworks so I can talk about high level decisions but implementation details I will be less helpful with. I have 0 UI/UX knowledge so do not UI directions as rigid orders.  This should be collaborative please help me create a design that will be the most aesthetic and easy to use for users.
- Cost is a huge constraint.  Some decisions I have outlined in this document are purely motivated by reducing costs.  Please keep this in mind when making recommendations.
- I am relatively inexperienced with using GenAI tools to develop software so if you believe that my iterations outlined below can be spaced out more let me know. For example if you believe the calculation engine in the first iteration is more than what we should do in beginning that is fine.  There is no requirement to do everything all at once.  If you think requirements are too ambitious for the initial design let me know. If you think I am being too conservative and spacing it out too much let me know as well.
- I will be providing you with the NFL data. At some point we may need to create an ingestion system that is automated but for the initial run I will be writing queries on a local db to generate the JSON files for you.  If the data I have provided you is formatted in a way that does not work for your optimal design DO NOT code around the bad data design.  DO tell me what is a better format for the data and I will provide you better data. DO NOT use tokens reformatting JSON or other files.

—————————————————————————————————————————————————-

## Initial MVP

### Requirements

The initial dev design will be an MVP that can be ran locally and does not use any databases or cloud services.  This phase will be used for testing the UI and making sure the design feels right.  I want to nail down the very basic requirements of the project before making larger changes. Here are the basic MVP requirements:

- Users should be able to explore NFL rosters and see all current players. (see: data model section)
- Users should be able to click on a player and a page with player info should be opened up.
- On the new page users should see metadata on the player. This includes their historical data that I will provide in the format of JSON (see: data model section).
- On the player page Users should be able to to enter in the following data based on position:
    - if position = “QB”:
        - Passing TDs
        - Passing Yards
        - Rushing Yards
        - Rushing TDs
        - Interceptions
        - Fumbles
    - if posistion = “RB”, “TE”, “WR”:
        - Receptions
        - Recieving TDs
        - Recieving Yards
        - Rushing Yards
        - Rushing TDs
        - Fumbles
- If a user has not yet entered in data for a player.  Values will be populated with the latest year of historical data (2025 for this year as an example).
- When users enter in values it sums up the points and displays it on the player page. These values should be persisted.
    - The values can be calculated as below:
        - Rushing/Receiving TD: 6pts/TD
        - Passing TD: 4pts/TD
        - Rushing/Receiving Yards: .10 pts/yard
        - Passing Yard: .04 pts/yard
        - Interception: -2pts/interception
        - Fumbles: -2pts/fumble
    - Note: If the above calculation engine is too much work for the initial dev build let me know and we can move it to the next phase.

### Data Model

I am providing two JSONs in the /public directory that will help create the rosters and historical views of player data.  I am providing you sample data  with the general format so you do not need to scan the entire files. 

**Rosters:**

File name: /public/active_rosters.json

Roster data is a flat array where each element is a json object.

```
[
    {
        "age": 23.4,
        "team": "DAL",
        "headshot": "https://static.www.nfl.com/image/upload/f_auto,q_auto/league/uegr8w0frbrrqmlalg48",
        "position": "RB",
        "player_id": "00-0038389",
        "player_name": "Israel Abanikanda"
    },
]
```

**Historical:**

File name: /public/weekly_historical_data.json

Historical data is one json object where each object has a key which is the players id. 

```
  {
   "00-0039851": {
        "age": 23.5,
        "team": "NE",
        "seasons": [
            {
                "season": 2024,
                "passing": {
                    "tds": 15,
                    "yards": 2276,
                    "attempts": 338,
                    "completions": 225,
                    "sack_fumbles": 5,
                    "interceptions": 10,
                    "sack_fumbles_lost": 4
                },
                "rushing": {
                    "tds": 2,
                    "yards": 421,
                    "fumbles": 4,
                    "attempts": 54,
                    "fumbles_lost": 2
                },
                "receiving": {
                    "tds": 0,
                    "yards": 0,
                    "fumbles": 0,
                    "targets": 0,
                    "fumbles_lost": 0
                },
                "games_played": 13,
                "fantasy_points": 177.14000000000001,
                "fantasy_points_ppr": 177.14000000000001
            },
            {
                "season": 2025,
                "passing": {
                    "tds": 31,
                    "yards": 4394,
                    "attempts": 492,
                    "completions": 354,
                    "sack_fumbles": 6,
                    "interceptions": 8,
                    "sack_fumbles_lost": 3
                },
                "rushing": {
                    "tds": 4,
                    "yards": 450,
                    "fumbles": 2,
                    "attempts": 103,
                    "fumbles_lost": 0
                },
                "receiving": {
                    "tds": 0,
                    "yards": 2,
                    "fumbles": 0,
                    "targets": 1,
                    "fumbles_lost": 0
                },
                "games_played": 17,
                "fantasy_points": 350.96000000000004,
                "fantasy_points_ppr": 351.96000000000004
            }
        ],
        "headshot": "https://static.www.nfl.com/image/upload/f_auto,q_auto/league/oyap81gtzcvnfmripis1",
        "position": "QB",
        "player_id": "00-0039851",
        "player_name": "Drake Maye"
    }
 }
```

To reiterate. If this data format is suboptimal request a format that will lead to more efficiencies and I will provide it.

### Implementation Details

Below are my recommendations on how to achieve the build for the MVP but these are all negotiable.  Keep in mind though this is an MVP so it should ideally be as lightweight as possible.

- **Framework:** **Next.js 15+** (using the App Router).
- **Styling:** **Tailwind CSS** (for fast, responsive UI).
- **Language:** **TypeScript** (to keep the data models  strictly enforced).
- **Read-Only Data:** **Local JSON files** stored in the `/public` folder (fetched via standard `fetch`).
- **User Persistence (Dev):** **`localStorage`** or a **Local JSON file** (simulating a DB by reading/writing to a single file on your machine).

## Look and Feel

- The overall design should be professional and modern.  Please make it something similar to Underdog Fantasy.  Avoid styles like Sleeper as it feels too stylized. Avoid styles like fantasy pros as feels too strict and rigid and boring.
- Please advise on how the player pages where data is entered should look and feel. Help determine the exact flow of how a user discovers a player and how they access the player page.  Should the user be redirected to a page or should it be a simple card that pops up?
- When a user views a player page that does not already have data and we are using the default data from the previous season for the stats make the text a low shaded grey for the default values until new values are entered in which the text turns black.
- I have provided URLs to each players headshot.  Please add this picture to the player cards/pages. If this is not an efficient way of accessing the image, skip the requirement but let me know how to provide you the images and I can do that.

—————————————————————————————————————————————————-

## Dev v0

### Requirements

After the MVP is created and the UI and design is cemented, we will begin to start to flesh out some of the features.  This version will have most of the features that will end up in production but it will not be implemented as such. I expect that this section can be done through multiple iterations. This will allow us to iterate and establish the general flows of the app.  

Below are the requirements that need to be implemented in addition to the original MVP requirements:

- Users should be able to toggle different types of point calculation rules (Standard, PPR, .5PPR) as well as switch on rules for TEP and 6ptPassTDs.
    - These rules are as follows:
        - Standard
            - These are the original calculations from the MVP.
        - PPR (Point per reception)
            - Same rules as Standard but add an additional point for reception.
        - 0.5PPR (half point per reception)
            - Same rules as Standard but add an additional 1/2 point for reception.
            - This should be the default calculation.
        - TEP (Tight End Premium)
            - If toggled on. TE’s get .5 additional points per reception.
            - Can be toggled on for Standard, PPR, and 0.5PPR
        - 6ptPassTDs (6 point passing TDs)
            - If toggled on. Passing TDs count for 6 points not 4.
            - Can be toggled on for Standard, PPR, and 0.5PPR
- Users should be able to view team rosters as a whole. Allowing them to see the full picture of an entire teams stats.
- When users enter in stats there will be a “reconcile” button.  The concept of this feature is that users will be notified of inconsistencies within a team. For example if Jalen Hurts is projected to throw 15TDs but his WRs are projected to catch 30TDs it will be flagged.  Full design details are still undetermined. Reconciliation will either:
    - A: Let users know where inconsistencies are detected and simply flag it.
    - B: Force reconciliation and adjust stats: option to either adjust WRs down or QBs up.
- Users should be able to view a rankings page.  This rankings page allows users to see a players rankings based on the calculation engine result of each player.  If a user has not entered in a point total for a player the default data will be used for the ranking.

—————————————————————————————————————————————————-

## Production p0

### Requirements

Once the dev version has been fleshed out and the product works as intended.  We will need to start migrating the app to production.  Here are the new requirements that this will require:

- App should be accessible from the world wide web.
- When users visit the home page they should have the ability to sign in via gmail, discord, or github.
- Users ranking data should persist across sessions.
- Users should be able to manually adjust rankings even if they have not entered in stats.
    - Unsure how we will handle the stats on the backend.
- Users should be able to export results to CSV.
- Automation should exist to update the roster and historical data on a nightly job.

### Implementation Details

Again all of these implementation details are negotiable.  Please review and advise if necessary. 

- EC2 - For hosting the service
- API Gateway - Rate limiting users
- S3 - Stores Static roster and historical JSON data
- Cloudfront - cache static roster and historical data
    - This might not be necessary if retrieval from S3 is fast enough.
- Lambdas - Pulls data when historical data or roster data is updated and inserts into S3.
- DynamoDB - stores user rankings data
    - This was chosen over RDS as it is cost effective.

—————————————————————————————————————————————————-

## Production pN - Aspirational

### Potential Features

These features are out of scope but I want to give you context of where the app can go so you can factor it into your design decisions so the app scales well as development increases. 

- AI Analyze
    - This is a vast improvement on the original reconciliation concept.  This feature allows us to send the data of a specific player and do a sanity check on the stats using a very lightweight AI.  We will take the user data + relevant historical data of that player and all players.  For example: User inputs 15 receiving TDs for AJ Brown; we send this information along with AJ Browns average and max TDs to the AI and ask does this make sense with some templated things to look for.; AI responds saying something like “AJ Brown has never scored 15TDs in a season, this seems unlikely for an Age 29 season”
    - Analysis on total rankings should be available as well.  The idea being we compare a users rankings to ADP.  Anywhere there is a large deviation we send the information to the AI automatically and summarize the biggest swings the user is making and explain how this may or may not be possible.
- Payments
    - If AI Analyze is implemented  we will need to charge users for this feature.  Therefore a payments integration with something like stripe will be necessary.
- Smart Rankings
    - This feature will require me to come up with a math model that can take all players stats and weight the player based on their stats vs an optimal draft strategy to create a rankings of ALL players.  For example: QBs almost never go in the first round but if we were to rank all players simply on their total points projected, the first 10 rankings would be QBs. So we need a “Smart Ranking” math model that would appropriately adjust their ranking.  Conversely what if Josh Allen was projected to throw for 5,000 yards and 50 TDs while rushing for 10 more? Then we would actually want the model to rank him as number 1 overall but only because his projection is so astronomically high.  The model should be able to help people not only rank by position but determine how this fits into the global ranks.
- Customer Scoring
    - In the future I may decide to add the ability for custom scoring.  For example if someone wants to do 100 points for passing TDs they can do  that.  I would probably make this a premium feature.  It is not highly likely that I do this. However, it should be considered when creating a design.
- Export to Fantasy Apps
    - I am not even sure if this is possible.
    - Ideally we should have a way to sync these rankings to sites like sleeper, yahoo, ESPN, or Underdog.