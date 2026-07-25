import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadStats, pullCloudStats, pushCloudStats, setSyncUser, STORAGE_KEY } from '../lib/stats'
import Turnstile from './Turnstile'

export default function AuthPanel({ session, onStatsSynced }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const syncedForUserId = useRef(null)

  useEffect(() => {
    if (session && syncedForUserId.current !== session.user.id) {
      syncedForUserId.current = session.user.id
      handleSignedIn(session.user.id)
    }
    if (!session) {
      syncedForUserId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

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
    if (!captchaToken) {
      setStatus('Please complete the verification check below.')
      return
    }
    setLoading(true)
    setStatus('')
    try {
      const { data, error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
          : await supabase.auth.signUp({ email, password, options: { captchaToken } })
      if (error) {
        setStatus(error.message)
        return
      }
      if (mode === 'signup' && !data.session) {
        setStatus('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setStatus(`Network error: ${err.message || 'could not reach the server'}. Please try again.`)
    } finally {
      setLoading(false)
      // Turnstile tokens are single-use — always reset after an attempt, pass or fail.
      setCaptchaToken(null)
      setTurnstileResetKey((k) => k + 1)
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
        <div className="auth-signed-in-row">
          <div>
            <div className="auth-signed-in-label">Signed in</div>
            <div className="auth-email">{session.user.email}</div>
          </div>
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
      <div className="auth-title">{mode === 'signin' ? 'Sign in' : 'Create an account'}</div>
      <p className="auth-note">
        Sync your solve history and stats across devices. Without an account, your progress stays
        on this device only.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-field-label">Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field-label">Password</span>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <Turnstile
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          resetKey={turnstileResetKey}
        />

        <button className="btn auth-submit" type="submit" disabled={loading || !captchaToken}>
          {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>

        {status && <div className="auth-status">{status}</div>}

        <button
          className="auth-link"
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
