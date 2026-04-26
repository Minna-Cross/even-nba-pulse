# NBA Pulse - Release Package

## Package Information

| Field | Value |
|-------|-------|
| **Package ID** | `com.openai.nbapulse` |
| **Name** | NBA Pulse |
| **Version** | 0.2.5 |
| **Edition** | 202601 |
| **Min App Version** | 2.0.0 |
| **Min SDK Version** | 0.0.9 |
| **Author** | Minna-Cross, OpenAI |
| **Entrypoint** | `index.html` |
| **License** | MIT |

## Build & Pack

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build

# Pack into .ehpk
npm run pack
```

Output: `even-nba-pulse.ehpk`

## Permissions

| Name | Description | Whitelist |
|------|-------------|-----------|
| `network` | Fetches NBA data via Cloudflare Worker proxy (CORS-enabled) | `https://summer-tooth-2846.minnacross.workers.dev` |

## Supported Languages

- English (`en`)

## Distribution

1. Build: `npm run build`
2. Pack: `npm run pack`
3. Upload `.ehpk` to Even Hub portal
4. Test on G2 hardware

## Release Notes (v0.2.5)

**Key Features:**
- Live NBA scores and play-by-play timeline
- Green glow indicator when game is live
- Tap to cycle through games
- Double-tap for exit confirmation
- Scroll to page through events (glasses ring or browser mouse wheel)
- Glasses footer: `tap next • dbl tap exit • scroll pages`
- Down arrow (`v`) shows when more pages below

**Platform Support:**
- Even Realities G2 glasses
- Even Hub SDK 0.0.9+
- Even App 2.0.0+

**Known Limitations:**
- Completed games not shown in rotation (live + upcoming only)
- No retry button on error (auto-refresh handles recovery)
- Glasses footer may truncate on older firmware (35 chars)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.
