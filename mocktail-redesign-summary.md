# Mocktail Redesign — Master Summary

## What This Is

A phased UI/UX redesign converting Mocktail from an MVP prototype into a production-grade fantasy football projection tool. The goal is to make the app's purpose immediately clear, make projections feel like an active user action (not a data display), and give the app a visual identity that matches the energy of the fantasy football audience.

---

## The Four Phases

### Phase 1 — Design Tokens & Global Styles
Establish the foundational CSS variables, typography, color palette, and spacing system that every component will build on. No visible UI changes until this is in place. Everything else depends on this.

### Phase 2 — Header, Navigation & Scoring Settings
Redesign the persistent header to include a tagline, fix the scoring toggles to have clear on/off states, and reorganize the scoring config panel into labeled groups. This touches every page.

### Phase 3 — Rankings Page
Redesign the rankings table with stronger rank number hierarchy, color-coded position badges, stat preview column, and improved filter/search bar. Redesign the VORP vs. Total Points toggle.

### Phase 4 — Player Detail Page & Projection Form
Redesign the player hero card, news card, and projection form. The projection form is the most critical fix: it must clearly communicate that inputs are user-editable and that the pre-filled values are a baseline, not a final answer.

---

## Changes by Category

### Brand & Identity
- Add tagline "Your projections. Your rankings." to the header, directly below the logo name
- Establish `#E8593C` (orange-red) as the single primary brand color used consistently across CTAs, active states, and projected points

### Color System
- Background: white primary, light grey secondary (`#F5F4F1` equivalent)
- Text: near-black primary, medium grey secondary, light grey tertiary
- Brand accent: `#E8593C` — used for active nav underline, active toggle state, modified input highlight, projected points, and the Save button
- Position badge colors: RB = green, WR = blue, QB = amber, TE = pink
- Year-over-year deltas: green for improvements, red for declines

### Typography
- Establish a clear type scale: 22px hero, 18px section, 15–16px body, 13px secondary, 11–10px labels/caps
- All category labels in uppercase with letter-spacing (10–11px, weight 500)
- Rank numbers use tabular-nums for consistent column alignment
- Two weights only throughout: 400 (regular) and 500 (medium)

### Scoring Settings Panel
- Replace the current toggle row with a dedicated config panel
- Organize into two labeled groups: "Scoring" (Std / 0.5 PPR / PPR as segmented buttons) and "Modifiers" (TEP, 2QB, 6pt Pass TD as individual toggle pills)
- Each toggle pill shows a colored dot indicator — orange when active, grey when off
- Active scoring format button fills with `#E8593C` background and white text

### Rankings Page
- Rank numbers: 22px weight 500 for ranks 1–3, 18px muted grey for ranks 4+
- Position badges color-coded by position (see Color System above)
- Add "Projected stats" column showing the key stat line (e.g., "1,478 rush yds · 10 TD · 79 rec")
- News indicator remains as orange dot, placed inline after player name
- Filter chips (All / QB / RB / WR / TE) styled as pill buttons with a solid black active state
- Ranking mode toggle (Total Points / Smart VORP) as a compact button group with active fill
- Search input right-aligned in the filter bar

### Player Detail Page
- Player hero card becomes a structured card with two zones: header (avatar, name, team/position, projected pts) and a stats bar (key stats in equal-width cells)
- Projected points displayed large (28px) in brand orange in the top-right of the hero card
- Stats bar shows the 4–5 most relevant stats for the position in equal-width columns with dividers
- News card gets a prominent "Latest news" label in brand orange with a timestamp
- Projection form header: title "Your 2026 projection" on the left, amber "Baseline: 2025 season" badge on the right — this makes the default nature of the data explicit without hiding the inputs
- Modified inputs: orange border + very light orange background tint when user has changed a value from its default
- Projection form footer: live point total (large, orange) with scoring format and current rank displayed inline — updates as user types
- Save button: solid orange, right-aligned in the footer

### Teams Page
- Team header card shows team name, logo placeholder, and subtitle with the comparison years
- Team stats bar shows 4 key aggregate stats (pass yards, pass TDs, rec yards, rush yards) with year-over-year comparison and directional delta (green ▲ / red ▼)
- Player rows follow the same rank/name/stats/pts pattern as the rankings page for visual consistency

---

## What Is NOT Changing
- App routing and page structure (Rankings / Teams / Free Agents)
- The fantasy points calculation engine
- VORP calculation logic
- Data sources and player data
- Mobile responsive behavior (maintain existing breakpoints, apply new styles)
- localStorage persistence of scoring settings

---

## Implementation Order

Execute phases strictly in order. Each phase builds on the previous. Do a visual review after each phase before proceeding.

1. Phase 1 — Design tokens (no visible change, sets the foundation)
2. Phase 2 — Header + scoring settings (visible on every page)
3. Phase 3 — Rankings page
4. Phase 4 — Player detail + projection form
