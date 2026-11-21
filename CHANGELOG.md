# SINX Changelog

## 1.0.54 — 2026-11-21
- Made room invitation URLs explicitly game-specific for Snakes and Ludo.
- Prioritized typed Telegram start parameters and validated the expected game type before joining, preventing cross-game room entry.


## 1.0.53 — 2026-11-21
- Added semantic application versioning and a published `version.json` manifest.
- Added server-side minimum-version enforcement for creating, joining, and starting new matches.
- Existing seated players can finish active matches without being interrupted by a release.
- Added an in-app update prompt with cache-busting reload.
- Added visible version/build identifiers to the main arcade and Hokm client.
