import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import PuzzleList from './components/PuzzleList'
import PuzzleBoard from './components/PuzzleBoard'
import StatsPanel from './components/StatsPanel'
import BackgroundPieces from './components/BackgroundPieces'
import AuthStatus from './components/AuthStatus'
import AuthPanel from './components/AuthPanel'
import Modal from './components/Modal'
import ThemeToggle from './components/ThemeToggle'
import { getAllPuzzles, filterPuzzles, pickRandom } from './lib/puzzleData'
import { loadStats, syncStatsOnSignIn, clearSyncedUsers, setSyncUser } from './lib/stats'
import { useAuthSession } from './lib/useAuthSession'
import { getInitialTheme, applyTheme } from './lib/theme'
import meta from './data/meta.json'

const TABS = ['Browse', 'Solve', 'Stats']

export default function App() {
  const [tab, setTab] = useState('Browse')
  const [theme, setTheme] = useState(getInitialTheme)
  const [filters, setFilters] = useState({
    themes: [],
    minRating: meta.ratingRange[0],
    maxRating: meta.ratingRange[1],
    search: '',
  })
  const allPuzzles = useMemo(() => getAllPuzzles(), [])
  const [activePuzzle, setActivePuzzle] = useState(() => pickRandom(allPuzzles))
  const [stats, setStats] = useState(loadStats)
  const filtered = useMemo(() => filterPuzzles(allPuzzles, filters), [allPuzzles, filters])
  const { session } = useAuthSession()
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Close the sign-in popup automatically once sign-in actually succeeds.
  useEffect(() => {
    if (session) setSignInOpen(false)
  }, [session])

  // Runs the cloud sync exactly once per signed-in session, from this
  // top-level component — which stays mounted the whole time, unlike the
  // sign-in UI itself (which unmounts/remounts as you switch tabs, and
  // would otherwise re-trigger the merge-conflict prompt every time).
  useEffect(() => {
    if (!session) {
      clearSyncedUsers()
      setSyncUser(null)
      return
    }
    syncStatsOnSignIn(session.user.id).then((finalStats) => {
      if (finalStats) setStats(finalStats)
    })
  }, [session])

  function openPuzzle(p) {
    setActivePuzzle(p)
    setTab('Solve')
  }

  function nextPuzzle() {
    const pool = filtered.length > 0 ? filtered : allPuzzles
    const p = pickRandom(pool.filter((x) => x.id !== activePuzzle?.id)) || pickRandom(pool)
    setActivePuzzle(p)
    setStats(loadStats())
  }

  return (
    <div className="app">
      <BackgroundPieces />
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">squarerb</span>
          <span className="brand-tag">Lichess Puzzle Explorer</span>
        </div>
        <div className="header-right">
          <nav className="nav-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={`nav-tab${tab === t ? ' active' : ''}`}
                onClick={() => {
                  setTab(t)
                  if (t === 'Stats') setStats(loadStats())
                }}
                type="button"
              >
                {t}
              </button>
            ))}
          </nav>
          <AuthStatus session={session} onSignInClick={() => setSignInOpen(true)} />
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
        </div>
      </header>

      <Modal open={signInOpen} onClose={() => setSignInOpen(false)} title="Sign in">
        <AuthPanel session={session} />
      </Modal>

      <div className="app-body">
        {tab === 'Browse' && (
          <>
            <FilterPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} />
            <PuzzleList puzzles={filtered} onSelect={openPuzzle} />
          </>
        )}

        {tab === 'Solve' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <PuzzleBoard puzzle={activePuzzle} onNext={nextPuzzle} onSelectPuzzle={openPuzzle} />
          </div>
        )}

        {tab === 'Stats' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <StatsPanel stats={stats} setStats={setStats} session={session} />
          </div>
        )}
      </div>
    </div>
  )
}

