# Squarerb — Lichess Puzzle Explorer

Browse, filter, and solve chess tactics puzzles from the Lichess puzzle
database.

## Structure

```
data-prep/     Python script that downloads + filters the Lichess puzzle DB into JSON shards
frontend/      Vite + React app (the actual site)
```

## How puzzles work here

Each puzzle stores:
- `fen` — position **before** the first move in `moves`
- `moves` — a UCI move list where `moves[0]` is auto-played as the "setup"
  move, then the player must find `moves[1]`, the opponent auto-replies with
  `moves[2]`, and so on. This matches the raw Lichess puzzle database format
  directly, so no conversion is needed between data-prep and the frontend.

## Stats / progress tracking

There's no backend, so "personal stats" (solved count, streaks, per-theme
accuracy) live in `localStorage` — per-browser, not synced across devices.
The Stats tab has Export/Import buttons so progress can be backed up or
moved manually. If you later want real accounts and cross-device sync,
you'd need to add an actual backend (e.g. a free-tier Render/Fly service +
a database) — the React frontend can stay on GitHub Pages and just call
that API.
