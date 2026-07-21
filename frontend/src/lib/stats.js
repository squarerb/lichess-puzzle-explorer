// Personal solve stats, persisted to localStorage since this is a fully
// static site with no backend. Per-browser only — use exportStats() /
// importStats() to back up or move between devices.

const STORAGE_KEY = 'tabiya:puzzle-stats:v1'

function defaultStats() {
  return {
    solved: 0,
    failed: 0,
    currentStreak: 0,
    bestStreak: 0,
    byTheme: {}, // theme -> { solved, failed }
    history: [], // { id, themes, rating, result: 'solved'|'failed', ts }
  }
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStats()
    const parsed = JSON.parse(raw)
    return { ...defaultStats(), ...parsed }
  } catch {
    return defaultStats()
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently,
    // the session still works, it just won't persist.
  }
}

export function recordResult(puzzle, result) {
  const stats = loadStats()
  if (result === 'solved') {
    stats.solved += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
  } else {
    stats.failed += 1
    stats.currentStreak = 0
  }

  for (const theme of puzzle.themes) {
    if (!stats.byTheme[theme]) stats.byTheme[theme] = { solved: 0, failed: 0 }
    stats.byTheme[theme][result === 'solved' ? 'solved' : 'failed'] += 1
  }

  stats.history.unshift({
    id: puzzle.id,
    themes: puzzle.themes,
    rating: puzzle.rating,
    result,
    ts: Date.now(),
  })
  stats.history = stats.history.slice(0, 200) // cap history length

  saveStats(stats)
  return stats
}

export function resetStats() {
  const fresh = defaultStats()
  saveStats(fresh)
  return fresh
}

export function exportStats() {
  const stats = loadStats()
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tabiya-stats-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importStats(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        saveStats({ ...defaultStats(), ...parsed })
        resolve(loadStats())
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
