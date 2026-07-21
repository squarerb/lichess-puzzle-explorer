// Loads all sharded puzzle JSON files at build time and exposes
// simple filter helpers. Shards are produced by data-prep/build_dataset.py
// (or the hand-built sample fixtures for local dev).

const shardModules = import.meta.glob('../data/puzzles/*.json', { eager: true })

let allPuzzles = null

export function getAllPuzzles() {
  if (allPuzzles) return allPuzzles
  const combined = []
  for (const path in shardModules) {
    const mod = shardModules[path]
    const puzzles = mod.default || mod
    combined.push(...puzzles)
  }
  allPuzzles = combined
  return combined
}

export function getMeta() {
  // meta.json is imported directly where needed since it's a single file,
  // not a shard — see src/data/meta.json
  return null
}

export function filterPuzzles(puzzles, { themes = [], minRating = 0, maxRating = 4000, search = '' } = {}) {
  return puzzles.filter((p) => {
    if (p.rating < minRating || p.rating > maxRating) return false
    if (themes.length > 0 && !themes.some((t) => p.themes.includes(t))) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = (p.id + ' ' + p.themes.join(' ') + ' ' + p.openingTags.join(' ')).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function pickRandom(puzzles) {
  if (puzzles.length === 0) return null
  return puzzles[Math.floor(Math.random() * puzzles.length)]
}
