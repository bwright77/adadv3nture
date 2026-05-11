import { useEffect, useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getCurrentSubscription, pushSupported, subscribeToPush, unsubscribeFromPush } from '../../lib/push'

export function PushOptInCard() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) {
      setSupported(false)
      return
    }
    getCurrentSubscription().then(sub => setSubscribed(!!sub))
  }, [])

  async function handleEnable() {
    if (!user) return
    setBusy(true)
    setHint(null)
    try {
      const sub = await subscribeToPush(user.id)
      if (sub) {
        setSubscribed(true)
      } else {
        // Either permission denied or VAPID key missing.
        setHint(
          Notification.permission === 'denied'
            ? 'Notifications blocked in browser settings.'
            : 'Could not subscribe — check VITE_VAPID_PUBLIC_KEY is set.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="mono" style={{
        fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em',
        color: C.ink40, marginBottom: 8, marginTop: 8,
      }}>◆ BRIEFING PUSH</div>

      <div style={{
        background: '#fff', border: `0.5px solid ${C.ink20}`,
        borderRadius: 14, padding: '12px 14px',
      }}>
        {!supported ? (
          <div style={{ fontSize: 'var(--fs-13)', color: C.ink60, lineHeight: 1.45 }}>
            Push isn't available in this browser. On iPhone, add adadv3nture to
            your Home Screen (Share → Add to Home Screen) and open it from there —
            iOS only allows push for installed PWAs.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-14)', color: C.dark, lineHeight: 1.4 }}>
                {subscribed === null
                  ? 'Checking subscription…'
                  : subscribed
                    ? '✓ Notifications on — you\'ll get a nudge after the wake-up sync.'
                    : 'Get notified after the Apple Health Shortcut fires so today\'s briefing is on your lock screen.'}
              </div>
              {hint && (
                <div style={{ fontSize: 'var(--fs-12)', color: C.rust, marginTop: 4 }}>{hint}</div>
              )}
            </div>
            {subscribed === true ? (
              <button
                onClick={handleDisable}
                disabled={busy}
                style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-13)', cursor: 'pointer', padding: '4px 0', whiteSpace: 'nowrap' }}
              >
                Turn off
              </button>
            ) : subscribed === false ? (
              <button
                onClick={handleEnable}
                disabled={busy}
                style={{
                  background: C.rust, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {busy ? '…' : 'Enable'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
