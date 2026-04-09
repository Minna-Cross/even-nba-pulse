```
    __    __  _______    ______                                                 
   |  \  |  \|       \  /      \                                                
   | $$\ | $$| $$$$$$$\|  $$$$$$\                                               
   | $$$\| $$| $$__/ $$| $$__| $$                                               
   | $$$$\ $$| $$    $$| $$    $$                                               
   | $$\$$ $$| $$$$$$$\| $$$$$$$$                                               
   | $$ \$$$$| $$__/ $$| $$  | $$                                               
   | $$  \$$$| $$    $$| $$  | $$                                               
    \$$   \$$ \$$$$$$$  \$$   \$$                                               
     ________  ___  ___  ___       ________  _______                            
    |\   __  \|\  \|\  \|\  \     |\   ____\|\  ___ \                           
    \ \  \|\  \ \  \\\  \ \  \    \ \  \___|\ \   __/|                          
     \ \   ____\ \  \\\  \ \  \    \ \_____  \ \  \_|/__                        
      \ \  \___|\ \  \\\  \ \  \____\|____|\  \ \  \_|\ \                       
       \ \__\    \ \_______\ \_______\____\_\  \ \_______\                      
        \|__|     \|_______|\|_______|\_________\|_______|                      
                                     \|_________|                               
```

# NBA Pulse for Even Hub

A minimal Even Realities G2 app that shows one NBA game at a time:

- matchup + score + game state
- a descending or ascending play timeline
- tap to cycle games
- double tap to toggle sort order
- swipe up/down to page through the event list

## Overview

### Core Features

#### Live Game Feed
- Auto-selects active (live) games
- Falls back to upcoming games if none live

#### Play Timeline
- Scrollable play-by-play events
- Compact formatting for 576×288 display

#### Multi-Game Navigation
- Cycle through games with tap
- Maintains state per session

#### Sort Modes
- Toggle ascending / descending timeline

#### Pagination
- Handles long play logs within text limits
- Uses boundary scroll events

### Interaction Model

| Input | Action |
|------|--------|
| Tap / Click | Next game |
| Double Tap | Toggle sort (ASC/DESC) |
| Scroll Down | Next page |
| Scroll Up | Previous page |

Built on Even input system:
- CLICK_EVENT, DOUBLE_CLICK_EVENT  
- SCROLL_TOP_EVENT, SCROLL_BOTTOM_EVENT  

---

# Developer Notes

- This app is intentionally optimized for the current Even Hub constraints.
- The app uses the official Even Hub SDK package at runtime.
- In a plain desktop browser with no Even bridge present, it falls back to a mock bridge so you can still preview the phone-side UI and verify data formatting.
- This scaffold intentionally flattens build output filenames in `vite.config.js` to avoid packaging friction from nested asset paths.
- One active view, not a dense dashboard
- Ring / glasses taps for lightweight control
- Fixed text layout with in-place updates after startup
- No image assets, so packaging is simple and stable

## Data source

The NBA has an unusually usable public live-data surface:

- a public scoreboard feed for today’s games
- a public play-by-play feed per game
- simple state model: game status, quarter, clock, score

The app uses the NBA live data CDN endpoints behind a browser-safe API base.

Default dev behavior:

- browser -> `/api/nba/scoreboard`
- browser -> `/api/nba/playbyplay/{game_id}`

NBA live data CDN endpoints:

- scoreboard: `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`
- play-by-play: `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{game_id}.json`

Vite proxies those to the NBA CDN during local development. For packaged or hosted builds, set `VITE_NBA_API_BASE` to your own proxy service.

**Note**: If the feed changes in the future

The NBA live feed is structured and easier to work with than many unofficial sports sources, but any third-party endpoint can still change.

If the schema changes:

1. inspect the raw JSON for scoreboard and play-by-play
2. update the field mapping in `src/lib/nbaApi.js`
3. update or add tests in `tests/nba.test.mjs`
4. rerun `npm test`

That is **why the normalization logic is isolated** from the Even UI layer.

## UI Architecture

### Display Constraints
- Canvas: **576 × 288 px**
- 4-bit grayscale (16 levels)
- Max ~4 containers per page  

### Lifecycle

- `createStartUpPageContainer` → once at boot
- `textContainerUpgrade` → fast updates
- `rebuildPageContainer` → layout changes  

### Event Handling

- Centralized event normalization
- Handles simulator vs hardware differences
- Guards against:
  - Missing indices
  - Undefined click events

## Why the hidden capture layer exists

Public G2 examples show that a hidden text container with `isEventCapture: 1` is a reliable pattern for receiving input while keeping the visible layout free for content.

## Why build output is flattened

Some community reports note packaging friction when Vite outputs nested files under `dist/assets`. This scaffold flattens the output names so the packed app stays simple.

## Important note about browser fetches

Direct browser fetches to the NBA CDN can fail in some environments. This scaffold now uses a local Vite proxy in development and includes a tiny Node proxy example in `proxy/`.

## Future Improvements (Wishlist)

- Team filtering
- Favorite team auto-focus
- Score change alerts
- Shot chart (image-based mode)
- Multi-game dashboard view
- Date selector (today / yesterday / tomorrow)
- Clutch mode (last N minutes only)
- Team logos via small image overlays

## If `Failed to fetch`

That usually means the browser/WebView could not fetch the NBA CDN directly.

### Local development

The updated scaffold already fixes local dev by routing browser calls through Vite:

- `/api/nba/scoreboard`
- `/api/nba/playbyplay/{gameId}`

So just restart `npm run dev`.

### Packaged / hosted app

For a packaged app or hosted build, you need a public proxy because the final app is static. Run the included proxy or deploy it somewhere public, then set:

```bash
VITE_NBA_API_BASE=https://your-proxy.example.com/nba
```

Rebuild after setting that environment variable.

### Update `app.json` for packaged builds

If you deploy a public proxy, change the `network.whitelist` entry in `app.json` from `https://cdn.nba.com` to your proxy origin, for example:

```json
"permissions": [
  {
    "name": "network",
    "desc": "Fetches live NBA data through a proxy.",
    "whitelist": ["https://nba-proxy.example.com"]
  }
]
```
---

# Acknowledgements

- Even Realities SDK & Even Hub
- NBA live data endpoints
- https://github.com/nickustinov/
