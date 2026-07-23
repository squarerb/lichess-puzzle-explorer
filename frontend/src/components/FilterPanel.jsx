import { useEffect, useRef, useState } from 'react'
import meta from '../data/meta.json'

const DEBOUNCE_MS = 120

export default function FilterPanel({ filters, setFilters, resultCount }) {
  const [dbMin, dbMax] = meta.ratingRange
  const debounceRef = useRef(null)

  // Local, instantly-updating slider values — dragging updates these
  // immediately so the handle/number feel responsive. The actual filter
  // state (which triggers re-filtering + re-rendering the puzzle grid)
  // only updates after a short pause, so a full drag doesn't re-filter
  // thousands of puzzles on every pixel of movement.
  const [localMin, setLocalMin] = useState(filters.minRating)
  const [localMax, setLocalMax] = useState(filters.maxRating)

  useEffect(() => {
    setLocalMin(filters.minRating)
    setLocalMax(filters.maxRating)
  }, [filters.minRating, filters.maxRating])

  function commitRange(min, max) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, minRating: min, maxRating: max }))
    }, DEBOUNCE_MS)
  }

  function onMinChange(e) {
    const val = Math.min(Number(e.target.value), localMax)
    setLocalMin(val)
    commitRange(val, localMax)
  }

  function onMaxChange(e) {
    const val = Math.max(Number(e.target.value), localMin)
    setLocalMax(val)
    commitRange(localMin, val)
  }

  const toggleTheme = (theme) => {
    setFilters((f) => ({
      ...f,
      themes: f.themes.includes(theme)
        ? f.themes.filter((t) => t !== theme)
        : [...f.themes, theme],
    }))
  }

  return (
    <aside className="filter-panel">
      <div>
        <div className="filter-section-label">Search</div>
        <input
          type="text"
          placeholder="theme, opening, id…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      <div>
        <div className="filter-section-label">Rating range</div>
        <div className="rating-range-display">
          {localMin} – {localMax}
        </div>
        <input type="range" min={dbMin} max={dbMax} value={localMin} onChange={onMinChange} />
        <input type="range" min={dbMin} max={dbMax} value={localMax} onChange={onMaxChange} />
      </div>

      <div>
        <div className="filter-section-label">Themes</div>
        <div className="theme-chip-list">
          {meta.themes.map((theme) => (
            <button
              key={theme}
              className={`theme-chip${filters.themes.includes(theme) ? ' selected' : ''}`}
              onClick={() => toggleTheme(theme)}
              type="button"
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-count">{resultCount} puzzles match</div>
    </aside>
  )
}
