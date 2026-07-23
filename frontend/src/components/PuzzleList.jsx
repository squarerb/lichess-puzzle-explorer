import { useEffect, useState } from 'react'

const PAGE_SIZE = 60

export default function PuzzleList({ puzzles, onSelect }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset back to the first page whenever the filtered result set changes
  // (new search/theme/rating filter) rather than keeping a stale, possibly
  // out-of-range count.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [puzzles])

  if (puzzles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No puzzles match those filters</div>
        <div>Try widening the rating range or clearing a theme.</div>
      </div>
    )
  }

  const visible = puzzles.slice(0, visibleCount)
  const hasMore = visibleCount < puzzles.length

  return (
    <div>
      <div className="puzzle-grid">
        {visible.map((p) => (
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

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} type="button">
            Show more ({puzzles.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
