import { useRef, useState } from 'react'
import { exportStats, importStats, resetStats } from '../lib/stats'

export default function StatsPanel({ stats, setStats }) {
  const fileInputRef = useRef(null)
  const [importError, setImportError] = useState('')

  const accuracy = stats.solved + stats.failed > 0 ? Math.round((stats.solved / (stats.solved + stats.failed)) * 100) : 0

  const themeEntries = Object.entries(stats.byTheme)
    .map(([theme, v]) => ({ theme, ...v, total: v.solved + v.failed }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const recentHistory = stats.history.slice(0, 30)

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const updated = await importStats(file)
      setStats(updated)
      setImportError('')
    } catch {
      setImportError('Could not read that file — is it a Tabiya stats export?')
    }
    e.target.value = ''
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.solved}</div>
          <div className="stat-label">Solved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.failed}</div>
          <div className="stat-label">Missed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Current streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.bestStreak}</div>
          <div className="stat-label">Best streak</div>
        </div>
      </div>

      <div className="filter-section-label">Recent form</div>
      <div className="streak-tray">
        {recentHistory.length === 0 && <span style={{ color: 'var(--ivory-dim)' }}>No puzzles solved yet.</span>}
        {recentHistory
          .slice()
          .reverse()
          .map((h, i) => (
            <div key={i} className={`streak-pip ${h.result === 'solved' ? 'solved' : 'failed'}`} title={`${h.id} · ${h.rating}`} />
          ))}
      </div>

      {themeEntries.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="filter-section-label">By theme</div>
          <div className="theme-breakdown">
            {themeEntries.map(({ theme, solved, total }) => (
              <div className="theme-row" key={theme}>
                <span>{theme}</span>
                <div className="theme-bar-track">
                  <div className="theme-bar-fill" style={{ width: `${(solved / total) * 100}%` }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ivory-dim)' }}>
                  {solved}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={exportStats} type="button">
          Export stats
        </button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} type="button">
          Import stats
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (confirm('Reset all local stats? This cannot be undone.')) setStats(resetStats())
          }}
          type="button"
        >
          Reset
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      {importError && <div style={{ color: 'var(--ember-bright)', marginTop: 8, fontSize: '0.85rem' }}>{importError}</div>}

      <p style={{ color: 'var(--ivory-dim)', fontSize: '0.8rem', marginTop: 20, maxWidth: 480 }}>
        Stats are stored in this browser only (no account, no server). Use export/import to move them to another
        device or back them up.
      </p>
    </div>
  )
}
