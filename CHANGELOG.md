# Changelog

All notable changes to NBA Pulse for Even Hub.

## [0.2.7] - 2026-04-27

### Fixed
- **Ring touch navigation** — Single tap/click on ring now cycles to next game (was broken due to incorrect event type mapping)
- **Silent 403 errors** — Future scoreboard dates no longer show scary "Access Denied" console errors (expected behavior when NBA hasn't published yet)

### Changed
- Touch events from ring/glasses detected via `eventSource` field instead of separate event type
- Console shows debug message instead of error for unpublished future games

---

## [0.2.6] - 2026-04-26

### Changed
- **Version bump** for Even Hub release

### Added
- Complete documentation (README.md, GUIDE.md, RELEASE.md)
- All tests passing (11/11)

---

## [0.2.5] - 2026-04-26

### Added
- **Live Feed glow indicator** — Green glow on "Live Feed" badge and summary card when game is live
- **Glasses footer** — Full text: `tap next • dbl tap exit • scroll pages`
- **Glasses continuation arrow** — Shows `v` at bottom when more pages below
- **Browser scrolling** — Timeline scrolls with mouse wheel (max 50vh)
- **Mode indicators** — Header shows `[LIVE]`, `[FINAL]`, or `[UPCOMING]`

### Changed
- **Timeline font** — Changed to Consolas (monospace) for perfect alignment
- **Continuation indent** — Fixed calculation: `timeSlot.length + 3 + score.length + 3`
- **Double tap action** — Now opens exit confirmation (was: toggle sort)
- **Splash screen** — Simplified glasses loading screen
- **Browser UI** — Removed redundant refresh button

### Removed
- Sort toggle (ASC/DESC) — Now always descending (newest first)
- "LIVE" badge from summary card (redundant with header indicator)

### Fixed
- Play continuation lines now align correctly under text column
- Glasses footer text no longer truncated

---

## [0.2.4] - 2026-04-25

### Added
- Auto-refresh every 15 seconds
- Pagination (7 plays per page)
- Exit confirmation dialog on double-tap

### Changed
- Updated NBA API proxy URL
- Improved error handling

---

## [0.2.0] - 2026-04-09

### Added
- Initial release for Even Hub
- Live scoreboard fetch
- Play-by-play timeline
- Multi-game navigation
- Even G2 glasses support
