import { useEffect, useRef } from 'react'

// Safe to have in frontend code — this is the public site key, meant to be
// embedded on the page. The secret key stays in Supabase's dashboard only.
const TURNSTILE_SITE_KEY = '0x4AAAAAAD9lK_sdLALImh8f'

let scriptLoadingPromise = null
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadingPromise) return scriptLoadingPromise
  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptLoadingPromise
}

export default function Turnstile({ onVerify, onExpire, resetKey }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      // If a widget already exists here (e.g. re-render after reset), clear it first.
      if (widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token) => onVerify(token),
        'expired-callback': () => onExpire?.(),
        'error-callback': () => onExpire?.(),
      })
    })

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return <div ref={containerRef} className="turnstile-widget" />
}
