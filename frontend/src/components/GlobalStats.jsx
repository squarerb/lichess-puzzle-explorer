import { useEffect, useState } from 'react'
import { fetchGlobalStats } from '../lib/globalStats'

export default function GlobalStats() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchGlobalStats()
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) return null // fail quietly — this is a nice-to-have, not core functionality
  if (!stats) return null

  return (
    <div className="global-stats">
      <div className="filter-section-label">Community totals</div>
      <div className="global-stats-grid">
        <div>
          <div className="stat-value">{Number(stats.total_accounts).toLocaleString()}</div>
          <div className="stat-label">Accounts</div>
        </div>
        <div>
          <div className="stat-value">{Number(stats.total_solved).toLocaleString()}</div>
          <div className="stat-label">Puzzles solved</div>
        </div>
        <div>
          <div className="stat-value">{Number(stats.total_failed).toLocaleString()}</div>
          <div className="stat-label">Attempts missed</div>
        </div>
      </div>
    </div>
  )
}
