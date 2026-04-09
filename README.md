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

# Acknowledgements

- Even Realities SDK & Even Hub
- NBA live data endpoints
- https://github.com/nickustinov/

---

# Additional Resources

https://github.com/Minna-Cross/even-nba-pulse/wiki