import { supabase } from '../lib/supabaseClient'
import { setSyncUser } from '../lib/stats'

export default function AuthStatus({ session, onSignInClick }) {
  async function handleSignOut() {
    await supabase.auth.signOut()
    setSyncUser(null)
  }

  if (session) {
    return (
      <div className="auth-status-compact">
        <span className="auth-status-email">{session.user.email}</span>
        <button className="nav-tab" onClick={handleSignOut} type="button">
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button className="nav-tab" onClick={onSignInClick} type="button">
      Sign in
    </button>
  )
}
