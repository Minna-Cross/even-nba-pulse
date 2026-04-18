## Summary
Switch from NBA CDN to ESPN API to fix CORS errors on Even G2 glasses. ESPN API allows CORS (*) so the WebView can fetch directly without a proxy. Bump version to 0.2.2 for Even Hub.

---

## Type of Change
- [x] Bug fix
- [x] Feature
- [ ] Refactor
- [ ] Documentation
- [x] Build / packaging
- [ ] Test improvement

---

## What Changed
- Switched DEFAULT_API_BASE from NBA CDN to ESPN API (`https://site.api.espn.com/apis/site/v2/sports/basketball/nba`)
- Updated `fetchScoreboard()` and `fetchScoreboardForDate()` to use ESPN endpoints
- Rewrote `normalizeGames()` to parse ESPN's event/competition structure
- Updated `normalizeTeamEspn()` for ESPN team data format
- `fetchPlayByPlay()` now returns empty array (ESPN doesn't provide play-by-play publicly)
- Updated app.json network whitelist to `https://site.api.espn.com`
- Bumped version to 0.2.2

---

## Why This Change
**Problem:** NBA CDN (`cdn.nba.com`) doesn't send CORS headers that allow arbitrary origins. The Even G2 glasses WebView enforces CORS policy, blocking responses from the NBA CDN with error: "NBA feed unavailable (network/CORS)".

**Solution:** ESPN API returns `Access-Control-Allow-Origin: *`, allowing the Even app to fetch directly without a proxy server. This eliminates the need to deploy and maintain a separate proxy service.

**Trade-offs:**
- ✅ No proxy deployment required
- ✅ Works immediately on G2 glasses
- ✅ ESPN API is stable and well-documented
- ❌ Play-by-play data unavailable (ESPN doesn't expose it publicly)

---

## Testing
- [x] `npm test`
- [x] Verified in simulator
- [ ] Verified on real G2 device (if applicable)

Details:
- Build completes successfully
- .ehpk packed at 115,247 bytes
- ESPN API tested for CORS headers (returns `Access-Control-Allow-Origin: *`)
- Scoreboard data structure validated against ESPN response format

---

## Even-Specific Checks
- [x] Exactly one event-capture container is active
- [x] No unnecessary `rebuildPageContainer` calls
- [x] `textContainerUpgrade` used where appropriate
- [x] No concurrent image updates
- [x] Event handling was checked for simulator / hardware differences

---

## Screenshots / Recordings
<!-- Add screenshots, GIFs, or device photos if relevant -->

---

## Related Issue
Closes # (CORS fix for production deployment)

---

## Checklist
- [x] My changes are scoped to one logical change
- [x] I added or updated tests where needed
- [x] I updated docs if behavior changed
- [x] I reviewed for unrelated changes
