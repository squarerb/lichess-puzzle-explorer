import meta from '../data/meta.json'

export default function FilterPanel({ filters, setFilters, resultCount }) {
  const toggleTheme = (theme) => {
    setFilters((f) => ({
      ...f,
      themes: f.themes.includes(theme)
        ? f.themes.filter((t) => t !== theme)
        : [...f.themes, theme],
    }))
  }

  const [dbMin, dbMax] = meta.ratingRange

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
          {filters.minRating} – {filters.maxRating}
        </div>
        <input
          type="range"
          min={dbMin}
          max={dbMax}
          value={filters.minRating}
          onChange={(e) =>
            setFilters((f) => ({ ...f, minRating: Math.min(Number(e.target.value), f.maxRating) }))
          }
        />
        <input
          type="range"
          min={dbMin}
          max={dbMax}
          value={filters.maxRating}
          onChange={(e) =>
            setFilters((f) => ({ ...f, maxRating: Math.max(Number(e.target.value), f.minRating) }))
          }
        />
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
