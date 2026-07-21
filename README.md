# squarerb — Lichess Puzzle Explorer

**[Live demo →](https://squarerb.github.io/lichess-puzzle-explorer/)**

An interactive chess tactics trainer built on the full [Lichess puzzle
database](https://database.lichess.org/#puzzles) — browse and filter over
30,000 puzzles by theme and rating, solve them on a real interactive board,
and track your progress over time.

<!-- Add a screenshot or short GIF here once you have one, e.g.: -->
<!-- ![Screenshot of the puzzle explorer](./docs/screenshot.png) -->

## Features

- **Browse & filter** — search by theme (forks, pins, skewers, mating
  patterns, and more), rating range, or free text
- **Solve on a real board** — drag-and-drop interaction powered by `chess.js`
  and `react-chessboard`; validates every move against the actual puzzle
  solution, auto-plays the opponent's replies
- **Progress tracking** — solve streaks, accuracy, and a per-theme breakdown,
  with export/import so you can back up your stats
- **Fully static** — no backend, no database, no server costs. Deployed
  entirely on GitHub Pages

## Why I built this

I wanted a personal puzzle explorer — a way to browse and drill chess tactics
by theme and rating instead of just taking whatever puzzle Lichess serves up
next. The trickiest part was working within a fully static site: no backend
meant figuring out how to turn a multi-million-row database into something a
browser could filter instantly, and how to track solve history and streaks
with nothing but `localStorage`.

## Tech stack

`React` · `Vite` · `chess.js` · `react-chessboard` · `Python` (data pipeline)
· `GitHub Actions` (CI/CD) · `GitHub Pages` (hosting)

## How the data pipeline works

The full Lichess puzzle database (~6M puzzles, updated regularly by Lichess)
is too large to ship directly to a static site. `data-prep/build_dataset.py`
downloads it, filters by rating and popularity, caps the count per theme, and
shards it into JSON files the frontend loads on demand — turning a multi-GB
dataset into a fast, static-hostable site.

## Running it locally

```bash
cd frontend
npm install
npm run dev
```

Ships with a small sample dataset — see `data-prep/README.md` to pull the
full ~30K-puzzle dataset.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via the workflow in
`.github/workflows/deploy.yml`.

## License

MIT
