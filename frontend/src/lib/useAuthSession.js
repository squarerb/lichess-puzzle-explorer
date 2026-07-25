import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Single shared subscription to Supabase's auth state, used by both the
// compact header widget and the full sign-in form in the Stats tab, so we
// don't end up with two independent listeners drifting out of sync.
export function useAuthSession() {
  const [session, setSession] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoaded(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, loaded }
}
