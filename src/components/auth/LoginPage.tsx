import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { C } from '../../tokens'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img
            src="/adadv3nture.png"
            alt="adadv3nture"
            style={{ width: 96, height: 96, objectFit: 'contain', marginBottom: 16 }}
          />
          <div className="badge" style={{ fontSize: 28, color: C.dark, letterSpacing: '0.04em' }}>
            adadv3nture
          </div>
          <div style={{ color: C.ink60, fontSize: 13, marginTop: 4 }}>
            a dad adventure
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: `1.5px solid ${C.ink20}`,
                background: 'white',
                color: C.dark,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: `1.5px solid ${C.ink20}`,
                background: 'white',
                color: C.dark,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(196,82,42,0.12)',
              border: `1px solid ${C.rust}`,
              borderRadius: 10,
              padding: '10px 14px',
              color: C.rust,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 12,
              background: loading ? C.sand : C.rust,
              color: C.cream,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.04em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'signing in…' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}
