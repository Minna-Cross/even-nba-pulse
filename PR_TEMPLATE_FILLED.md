## Summary
Adds an exit confirmation dialog to prevent accidental app exits, plus improves API reliability with timeout handling and better error messages.

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
- **Exit confirmation dialog**: Double-click now opens a confirmation dialog instead of immediately toggling sort. Users must click "Exit app" to confirm, or scroll/click "Cancel" to stay.
- **API timeout handling**: Added configurable 8-second timeout for all NBA API requests with abort support
- **Improved error messages**: Better differentiation between network errors, timeouts, offline state, and CORS issues
- **Parallel fetches**: `fetchUpcomingGames()` now uses `Promise.allSettled()` to fetch scoreboard and schedule data in parallel
- **Proxy logging**: Added structured JSON logging for proxy requests with timing and status codes
- **Production build requirements**: Production builds now require explicit `VITE_NBA_API_BASE` environment variable

---

## Why This Change
**Exit confirmation**: Users could accidentally exit the app with a double-click gesture, which was frustrating especially on device. The confirmation dialog gives users a chance to cancel accidental exits while still providing a clear exit path.

**API reliability**: The app had no timeout handling, which could lead to indefinite hangs on slow or unresponsive NBA endpoints. The timeout handling ensures the app fails fast with clear error messages, and the parallel fetches reduce overall load time for upcoming games.

**Production readiness**: The explicit `VITE_NBA_API_BASE` requirement prevents accidental production deployments against dev/proxy endpoints.

---

## Testing
- [x] `npm test`
- [x] Verified in simulator
- [ ] Verified on real G2 device (if applicable)

Details:
- Built successfully with `npm run build`
- Packed successfully with `npm run pack` (115KB .ehpk)
- Exit dialog opens on double-click in browser preview
- Exit dialog cancels on scroll or "Cancel" button
- Exit dialog confirms and attempts exit on "Exit app" button
- API timeout errors display clear messages
- Parallel fetches reduce upcoming games load time

---

## Even-Specific Checks
- [x] Exactly one event-capture container is active
- [x] No unnecessary `rebuildPageContainer` calls
- [x] `textContainerUpgrade` used where appropriate
- [x] No concurrent image updates
- [x] Event handling was checked for simulator / hardware differences

Notes: Exit confirmation interprets events differently when open (CLICK = exit, SCROLL/DOUBLE_CLICK = cancel). This is isolated to the `confirmExitOpen` state and doesn't affect normal gameplay navigation.

---

## Screenshots / Recordings
<!-- Add screenshots, GIFs, or device photos if relevant -->

Exit dialog in browser preview:
- Dialog shows "Exit NBA Pulse?" with "Cancel" and "Exit app" buttons
- Backdrop dims when dialog is open
- Glasses view shows "Exit app? Click = exit, Scroll = cancel"

---

## Related Issue
Closes #

---

## Checklist
- [x] My changes are scoped to one logical change
- [x] I added or updated tests where needed
- [x] I updated docs if behavior changed
- [x] I reviewed for unrelated changes
