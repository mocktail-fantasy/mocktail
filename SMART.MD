### Smart Rankings

We now need to implement the smart rankings feature because the ordering of the rankings page by total points make’s it unusable.  This now has to be a p0 requirement.  Below are full details on how to implement the feature. Please read them and then determine the best plan forward. Once we agree on a plan we can move forward with implementation. 

---

## Problem

Currently rankings are determined by total projected points. However total points doesnt actually correlate to value.  QBs typically score the most points in Fantasy Football but because you only start 1 and their points above replacement is usually low they are actually much less valuable than other positions. 

---

## Overview

The Smart Rankings is a feature that allows positions to be ranked by their projected points relative to the position.  Smart Rankings can have several different strategies such as standard ones like VOLS (value over last starter), VORP (value over replacement) and complex 0RB or hero RB strategies.  Our first iteration will only use VORP but keep in mind when designing that many other strategies may be implemented in the future. 

---

## Assumptions

For most calculations strategies we will need to know the size of the league and the amount of starters at each position.  For our baseline calculation we are going to make some assumptions on those values but this might become a customizable parameter in the future. For our strategy “VORP” we will also need to assume how many of these positions are rostered.  Here are the assumptions:

League Size: 12 teams

QB: 1

WR: 2
RB: 2
TE: 2

Flex: 2

Bench: 15

Total Players Rostered:
QB: 15

RB: 40
WR: 50
TE: 15

---

## Implementation Details

For our first iteration we are going to use **VORP (Value Over Replacement Player).** Calculate VORP by comparing a player’s projected season total ($P_i$) to a Replacement Baseline ($P_{rep}$) for that specific position. 

 
$VORP = P_i - P_{rep}$

The projected points we already have but we will need to calculate the replacement baseline. To find this we simply need to find the next available player after all of the respective players have been drafted.  For example Josh Allen’s VORP P_i could be **364.6**  and the QB ranked at 16 (one more than rostered) is Sam Darnold at **235.4** points.  So Josh Allen’s VORP would be 111.2.  We need to do this for every position. Use the total players rostered in the assumptions to find  P_{rep} for each position. 

To implement this we have two options:
1. Calculate in real time. If these calculations can be done fast for every single player by simply storing the P_{rep} for each position and quickly performing simple subtraction for each player and ranking them by the result then we should prioritize this method. 
2. If option 1 isnt performant, a simple solution is to have a button that ranks them and users will have to wait for the calculations to occur.  One thing to consider with this approach is how will we handle the case where points are adjusted after the button is hit? Will we revert to a straight points ranking and users will need to hit this button every time they are on the rankings page? Please clarify your approach to prevent stale data if you go with this option.

---

## UI

Since the plan for the future is to have multiple ranking strategies we need a way to toggle each of their options.  My recommendation is to create a new section with a label “All” and have two options of: Total Points (what we have now) and Smart Rankings(VORP). This way the users have a way of choosing between positional rankings or different types of global rankings.  If you have a clean solution for how to segment these two I am open to any method. The only option we CANNOT do is have a single toggle that has all options such as: ALL SMART QB RB WR TE.