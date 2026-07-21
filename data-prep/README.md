# Data prep

`build_dataset.py` downloads the full Lichess puzzle database (~5M puzzles,
~250MB compressed) and filters it down into sharded JSON files the frontend
can serve statically.

## Run it

```bash
cd data-prep
python3 -m venv venv
source venv/bin/activate
pip install requests zstandard
python build_dataset.py
```

This will:
1. Download `lichess_db_puzzle.csv.zst` from database.lichess.org (cached locally after the first run — delete the file to re-download)
2. Stream-decompress and filter rows by rating range and minimum play count
3. Cap the number of puzzles kept per primary theme (`MAX_PER_THEME`, default 800) so the final site stays a reasonable size
4. Write one JSON shard per theme to `frontend/src/data/puzzles/`, replacing the sample fixtures
5. Write `frontend/src/data/meta.json` with the full theme list and rating range

## Tuning

Open the constants at the top of the script to adjust:
- `MAX_PER_THEME` — raise for more variety, lower to keep the repo smaller
- `MIN_RATING` / `MAX_RATING` — puzzle difficulty range to include
- `MIN_NB_PLAYS` — filters out obscure/rarely-solved puzzles

With defaults you'll end up with roughly a few hundred shards and tens of
thousands of puzzles — check the printed summary at the end of the run for
exact counts.

After running, just `cd ../frontend && npm run dev` to see the real data.
