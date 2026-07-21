import { useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import PuzzleList from './components/PuzzleList'
import PuzzleBoard from './components/PuzzleBoard'
import StatsPanel from './components/StatsPanel'
import { getAllPuzzles, filterPuzzles, pickRandom } from './lib/puzzleData'
import { loadStats } from './lib/stats'
import meta from './data/meta.json'

const TABS = ['Browse', 'Solve', 'Stats']

export default function App() {
  const [tab, setTab] = useState('Browse')
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
      <div className="bg-ambient" aria-hidden="true">
        <div className="bg-blob-3" />
      </div>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Tabiya</span>
          <span className="brand-tag">Lichess Puzzle Explorer</span>
        </div>
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
      </header>

      <div className="app-body">
        {tab === 'Browse' && (
          <>
            <FilterPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} />
            <PuzzleList puzzles={filtered} onSelect={openPuzzle} />
          </>
        )}

        {tab === 'Solve' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <PuzzleBoard puzzle={activePuzzle} onNext={nextPuzzle} />
          </div>
        )}

        {tab === 'Stats' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <StatsPanel stats={stats} setStats={setStats} />
          </div>
        )}
      </div>
    </div>
  )
}
