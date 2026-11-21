## 1.0.57 — 2026-11-22
- Added persistent Dark and Light themes shared across the main dashboard, Snakes, Ludo, and Hokm.
- Removed non-functional sound, music, and vibration controls because no corresponding audio or haptic engine exists yet.
- Removed the floating build/version badge from game screens; the app version remains in Settings.
- Added light-theme styling for the Hokm standalone game page and the shared game interface.

## 1.0.56 — 2026-11-22
- Added a five-section main dashboard with persistent bottom navigation.
- Added account profile controls and device-saved preferences.
- Added authenticated friend requests, acceptance, rejection, and removal using unique SINX usernames.
- Preserved existing game entry points and game rules.

## 1.0.55 — 2026-11-21
- رفع ناهماهنگی صفحهٔ بازی هنگام ورود با لینک دعوت منچ؛ صفحهٔ بازی اکنون بر اساس نوع واقعی اتاق دریافتی از سرور رندر می‌شود.

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
