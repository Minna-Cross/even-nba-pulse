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

A minimal Even Realities G2 app that shows NBA games with live play-by-play timeline.

- Matchup + score + game state
- Play-by-play timeline with perfect alignment
- Tap to cycle through games
- Green glow indicator when game is live
- Scroll to page through events

## Overview

### Core Features

#### Live Game Feed
- Auto-selects active (live) games
- Falls back to upcoming games if none live
- Green glowing "Live Feed" badge when game is in progress
- Auto-refreshes every 15 seconds

#### Play Timeline
- Monospace font (Consolas) for perfect character alignment
- Continuation lines indent correctly under play text
- Browser: Scrollable with mouse wheel (max 50% viewport height)
- Glasses: Shows `v` arrow at bottom when more pages below

#### Multi-Game Navigation
- Tap / Click: Cycle to next game
- Games shown in order: Live → Upcoming
- Header shows `[LIVE]`, `[FINAL]`, or `[UPCOMING]` indicator

#### Pagination
- 7 plays per page
- Browser: Mouse wheel or trackpad scroll
- Glasses: Ring swipe up/down to page

### Interaction Model

| Input | Action |
|------|--------|
| Tap / Click | Next game |
| Double Tap | Exit confirmation dialog |
| Scroll Down (Glasses) | Next page |
| Scroll Up (Glasses) | Previous page |
| Mouse Wheel (Browser) | Scroll timeline |

### Display Features

#### Browser
- "Live Feed" badge glows green when game is live
- Summary card has green glow during live games
- Timeline scrolls vertically when content exceeds 50vh
- No refresh button needed (auto-refresh every 15s)

#### Glasses (G2)
- Header: `NBA PULSE` + game info
- Body: Play-by-play timeline (38 chars max per line)
- Footer: `tap next • dbl tap exit • scroll pages`
- Down arrow (`v`) shown when more pages below
- Splash screen simplified: `NBA PULSE` / `Loading...`

---

## Tech Stack

- **Framework:** Vite 7.x
- **Even SDK:** `@evenrealities/even_hub_sdk`
- **NBA API:** Cloudflare Worker proxy (CORS-enabled)
- **Font:** Consolas (timeline), Roboto (UI)

---

# Acknowledgements

- Even Realities SDK & Even Hub
- NBA live data endpoints
- https://github.com/nickustinov/

---

# Additional Resources

https://github.com/Minna-Cross/even-nba-pulse/wiki
