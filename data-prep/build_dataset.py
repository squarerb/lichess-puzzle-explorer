#!/usr/bin/env python3
"""
Downloads the Lichess puzzle database, filters/samples it, and writes
sharded JSON files for the static frontend to consume.

Run this LOCALLY (not in a sandboxed environment) since it needs to reach
database.lichess.org and download ~250MB compressed / ~5M rows.

Usage:
    pip install requests zstandard
    python build_dataset.py

Output:
    frontend/src/data/puzzles/<theme>.json   (sharded by primary theme)
    frontend/src/data/meta.json              (theme list, rating range, counts)
"""
import csv
import io
import json
import os
import sys
from collections import defaultdict

import requests
import zstandard as zstd

DB_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
LOCAL_ZST = "lichess_db_puzzle.csv.zst"
OUTPUT_DIR = os.path.join("..", "frontend", "src", "data", "puzzles")
META_PATH = os.path.join("..", "frontend", "src", "data", "meta.json")

# Tune these to control final site size. Lichess has ~5M puzzles;
# we don't want to ship all of them to a static site.
MAX_PER_THEME = 800          # cap puzzles kept per primary theme
MIN_RATING = 400
MAX_RATING = 3200
MIN_NB_PLAYS = 50            # skip obscure/rarely-played puzzles


def download():
    existing_size = os.path.getsize(LOCAL_ZST) if os.path.exists(LOCAL_ZST) else 0

    # Check the remote file size first so we know whether an existing
    # partial file is actually complete or needs resuming.
    head = requests.head(DB_URL, allow_redirects=True)
    remote_size = int(head.headers.get("content-length", 0))

    if existing_size and remote_size and existing_size >= remote_size:
        print(f"Found complete {LOCAL_ZST} ({existing_size / 1e6:.0f}MB), skipping download.")
        return

    headers = {}
    mode = "wb"
    done = existing_size
    if existing_size:
        print(f"Resuming {LOCAL_ZST} from {existing_size / 1e6:.0f}MB...")
        headers["Range"] = f"bytes={existing_size}-"
        mode = "ab"
    else:
        print(f"Downloading {DB_URL} ...")

    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            with requests.get(DB_URL, stream=True, headers=headers, timeout=30) as r:
                r.raise_for_status()
                with open(LOCAL_ZST, mode) as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        f.write(chunk)
                        done += len(chunk)
                        if remote_size:
                            pct = done / remote_size * 100
                            print(f"\r  {done / 1e6:.0f}MB / {remote_size / 1e6:.0f}MB ({pct:.1f}%)", end="")
            print("\nDownload complete.")
            return
        except (requests.exceptions.RequestException, ConnectionError) as e:
            print(f"\nDownload interrupted ({e}). Retrying ({attempt}/{max_retries})...")
            existing_size = os.path.getsize(LOCAL_ZST) if os.path.exists(LOCAL_ZST) else 0
            headers["Range"] = f"bytes={existing_size}-"
            mode = "ab"
            done = existing_size
    raise RuntimeError(f"Download failed after {max_retries} attempts. Run the script again to resume.")


def stream_rows():
    dctx = zstd.ZstdDecompressor()
    with open(LOCAL_ZST, "rb") as fh:
        with dctx.stream_reader(fh) as reader:
            text_stream = io.TextIOWrapper(reader, encoding="utf-8")
            # Columns: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,
            #          NbPlays,Themes,GameUrl,OpeningTags
            reader_csv = csv.DictReader(text_stream)
            for row in reader_csv:
                yield row


def main():
    download()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    shards = defaultdict(list)
    theme_counts = defaultdict(int)
    all_themes = set()
    rating_min, rating_max = 9999, 0
    total_kept = 0
    total_seen = 0

    print("Filtering and sharding rows...")
    for row in stream_rows():
        total_seen += 1
        try:
            rating = int(row["Rating"])
            nb_plays = int(row["NbPlays"])
        except (KeyError, ValueError):
            continue

        if rating < MIN_RATING or rating > MAX_RATING:
            continue
        if nb_plays < MIN_NB_PLAYS:
            continue

        themes = row["Themes"].split()
        if not themes:
            continue
        primary_theme = themes[0]

        if theme_counts[primary_theme] >= MAX_PER_THEME:
            continue

        puzzle = {
            "id": row["PuzzleId"],
            "fen": row["FEN"],
            "moves": row["Moves"].split(),
            "rating": rating,
            "popularity": int(row["Popularity"]),
            "nbPlays": nb_plays,
            "themes": themes,
            "gameUrl": row["GameUrl"],
            "openingTags": row.get("OpeningTags", "").split() if row.get("OpeningTags") else [],
        }

        shards[primary_theme].append(puzzle)
        theme_counts[primary_theme] += 1
        all_themes.update(themes)
        rating_min = min(rating_min, rating)
        rating_max = max(rating_max, rating)
        total_kept += 1

        if total_seen % 500000 == 0:
            print(f"  scanned {total_seen:,} rows, kept {total_kept:,}")

    print(f"\nDone scanning. Kept {total_kept:,} of {total_seen:,} rows across {len(shards)} theme shards.")

    for theme, puzzles in shards.items():
        path = os.path.join(OUTPUT_DIR, f"{theme}.json")
        with open(path, "w") as f:
            json.dump(puzzles, f, separators=(",", ":"))

    meta = {
        "themes": sorted(all_themes),
        "shardThemes": sorted(shards.keys()),
        "ratingRange": [rating_min, rating_max],
        "totalPuzzles": total_kept,
        "countsByShard": {k: len(v) for k, v in shards.items()},
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Wrote {len(shards)} shard files to {OUTPUT_DIR}")
    print(f"Wrote meta file to {META_PATH}")


if __name__ == "__main__":
    sys.exit(main())
