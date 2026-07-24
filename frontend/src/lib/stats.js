// Personal solve stats, persisted to localStorage by default (per-browser).
// If signed in via Supabase, stats also sync to a hosted database so they
// carry across devices — see setSyncUser() / pullCloudStats() below.

import { supabase } from './supabaseClient'

export const STORAGE_KEY = 'squarerb:puzzle-stats:v1'

let syncUserId = null
let pushTimer = null

// Call this after sign-in/sign-out to start or stop cloud syncing.
export function setSyncUser(userId) {
  syncUserId = userId
}

export async function pushCloudStats(userId, stats) {
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: userId, data: stats, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function pullCloudStats(userId) {
  const { data, error } = await supabase.from('user_stats').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? data.data : null
}

// Debounced so rapid local saves (e.g. solving several puzzles quickly)
// don't fire a network request on every single one.
function scheduleCloudPush(stats) {
  if (!syncUserId) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushCloudStats(syncUserId, stats).catch(() => {
      // Offline or a transient error — the local copy is still safe and
      // correct, the next save will just try pushing again.
    })
  }, 800)
}

function defaultStats() {
  return {
    solved: 0,
    failed: 0,
    currentStreak: 0,
    bestStreak: 0,
    rating: 1200,
    hintsUsed: 0,
    fastestSolveMs: null,
    byTheme: {}, // theme -> { solved, failed }
    history: [], // { id, themes, rating, result: 'solved'|'failed', ts, timeMs, hintUsed }
  }
}

// Simplified Elo-style update — same idea Lichess itself uses for puzzle
// ratings: expected score is a logistic curve based on the rating gap,
// actual score is 1 (solved) or 0 (failed), K controls how fast it moves.
export function eloDelta(currentRating, puzzleRating, solved, k = 24) {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - currentRating) / 400))
  const score = solved ? 1 : 0
  return Math.round(k * (score - expected))
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
  scheduleCloudPush(stats)
}

export function recordResult(puzzle, result, { hintUsed = false, timeMs = null } = {}) {
  const stats = loadStats()
  const solved = result === 'solved'

  if (solved) {
    stats.solved += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
    if (timeMs != null && (stats.fastestSolveMs == null || timeMs < stats.fastestSolveMs)) {
      stats.fastestSolveMs = timeMs
    }
  } else {
    stats.failed += 1
    stats.currentStreak = 0
  }

  if (hintUsed) {
    stats.hintsUsed += 1
  } else {
    // Hinted solves don't move the rating estimate — you were assisted,
    // so it wouldn't be an honest signal of your own solving strength.
    stats.rating += eloDelta(stats.rating, puzzle.rating, solved)
    stats.rating = Math.min(3000, Math.max(400, stats.rating))
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
    timeMs,
    hintUsed,
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
  a.download = `squarerb-stats-${new Date().toISOString().slice(0, 10)}.json`
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
