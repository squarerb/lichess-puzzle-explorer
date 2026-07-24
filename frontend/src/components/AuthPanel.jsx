import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadStats, pullCloudStats, pushCloudStats, setSyncUser, STORAGE_KEY } from '../lib/stats'

export default function AuthPanel({ onStatsSynced }) {
  const [session, setSession] = useState(null)
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) handleSignedIn(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) handleSignedIn(newSession.user.id)
    })
    return () => listener.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignedIn(userId) {
    setSyncUser(userId)
    setStatus('Syncing…')
    try {
      const cloud = await pullCloudStats(userId)
      const local = loadStats()
      const localHasProgress = local.solved + local.failed > 0
      const cloudHasProgress = cloud && cloud.solved + cloud.failed > 0

      let finalStats
      if (cloudHasProgress && localHasProgress) {
        const useCloud = window.confirm(
          "You have puzzle stats saved both on this device and in the cloud.\n\n" +
            'Click OK to use your CLOUD stats (this device\'s local progress will be replaced).\n' +
            "Click Cancel to keep this device's LOCAL progress (the cloud copy will be replaced with it)."
        )
        finalStats = useCloud ? cloud : local
      } else if (cloudHasProgress) {
        finalStats = cloud
      } else {
        finalStats = local
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalStats))
      await pushCloudStats(userId, finalStats)
      onStatsSynced?.(finalStats)
      setStatus('Synced.')
    } catch {
      setStatus('Signed in, but could not reach the cloud right now — your local stats are unaffected.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    const authFn = mode === 'signin' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { data, error } = await authFn({ email, password })
    setLoading(false)
    if (error) {
      setStatus(error.message)
      return
    }
    if (mode === 'signup' && !data.session) {
      setStatus('Check your email to confirm your account, then sign in.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSyncUser(null)
    setStatus('')
  }

  if (session) {
    return (
      <div className="auth-panel">
        <div className="auth-row">
          <span className="auth-email">Signed in as {session.user.email}</span>
          <button className="btn btn-secondary" onClick={handleSignOut} type="button">
            Sign out
          </button>
        </div>
        {status && <div className="auth-status">{status}</div>}
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <form className="auth-row" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          className="auth-link"
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Need an account?' : 'Have an account? Sign in'}
        </button>
      </form>
      {status && <div className="auth-status">{status}</div>}
      <p className="auth-note">
        Sign in to sync your solve history and stats across devices. Without an account, your
        progress stays on this device only.
      </p>
    </div>
  )
}
