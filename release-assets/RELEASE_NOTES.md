# NBA Pulse v0.2.5

## What's New

### 🏀 Play-by-Play Timeline Fixed
- **Fixed:** `normalizeActions()` now properly maps NBA play-by-play data
- **Before:** Timeline was empty (stub returned `[]`)
- **After:** Live play-by-play events display on G2 glasses

### 🔧 Cloudflare Worker Deployment
- **Added:** `wrangler.jsonc` configuration
- **Added:** `worker/index.js` with ES Modules syntax
- **Fixed:** Worker now compatible with Cloudflare Versions API
- **Worker URL:** `https://summer-tooth-2846.minnacross.workers.dev/nba`

### 📦 Build
- Version bumped from 0.2.4 to 0.2.5
- Even Hub deployment ready

---

## Installation

1. Download `even-nba-pulse.ehpk`
2. Upload to Even Hub portal
3. Install on G2 glasses via Even Realities app

---

## Known Issues

- Exit confirmation dialog implemented (double-click to exit)
- Network errors may occur if Cloudflare Worker is not deployed

---

## Build Date

April 25, 2026
