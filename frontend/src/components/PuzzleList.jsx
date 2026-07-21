export default function PuzzleList({ puzzles, onSelect }) {
  if (puzzles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No puzzles match those filters</div>
        <div>Try widening the rating range or clearing a theme.</div>
      </div>
    )
  }

  return (
    <div className="puzzle-grid">
      {puzzles.map((p) => (
        <button key={p.id} className="puzzle-card" onClick={() => onSelect(p)} type="button">
          <div className="puzzle-card-rating">{p.rating}</div>
          <div className="puzzle-card-themes">
            {p.themes.slice(0, 3).map((t) => (
              <span key={t} className="puzzle-card-theme">
                {t}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
