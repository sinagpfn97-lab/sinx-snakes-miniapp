# SINX HOKM — Phase 1 preview

## Included in this branch

- Adds a Cyber Neon SINX HOKM preview page at `hokm-preview.html`.
- Adds an entry for the preview to the SINX game hub.
- Bumps the visible app version from `v1.0.52` to `v1.0.53`.
- Provides a local four-seat playable prototype: one human player and three bots.
- Implements a 52-card deck, five-card initial deal, trump selection, remaining eight-card deal, follow-suit validation, trick resolution, and thirteen-trick hands.
- Implements match targets of 1, 3, 5, or 7 points, with 7 as the default.
- Implements hand scoring: ordinary win = 1, kout = 2, hakem-kout = 3.
- Uses the final trick winner as the next hakem when that player belongs to the winning team; otherwise selects a seat from the winning team. The next hakem leads the next hand.

## Important scope boundary

This is a **visual and local-play prototype**, not the completed online game. The online button is intentionally informational and does not connect to Supabase. No production database, Edge Function, RPC, migration, Telegram invite flow, or existing Snakes/Ludo game logic is changed in this phase.

Before enabling online play, a separate implementation must:
1. Add server-authoritative Hokm RPCs and a migration after reconciling the repository's migration history with the ten migrations already applied to Supabase.
2. Ensure the public room snapshot never returns private hands or the undealt deck.
3. Implement private per-player state retrieval and atomic turn validation.
4. Add explicit online and bot-filled room modes, with bot seats stored independently from human accounts.
5. Route Hokm actions through the existing Edge Function without changing Snakes/Ludo RPC behavior.
6. Add automated engine, privacy, concurrency, and regression tests.

## Validation status

- Source-level checks: verify version marker, hub link, target-score options, and score constants.
- Browser gameplay, Supabase integration, Telegram integration, and end-to-end multiplayer tests have **not** been run.
- This PR must remain unmerged and undeployed until the online phase and the required tests are complete and separately approved.
