import { useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { saveThinkingAnswer } from '../../../lib/daily-plan'

interface WThinkingPromptProps {
  dark?: boolean
  prompt: string | null
  loading: boolean
}

export function WThinkingPrompt({ dark, prompt, loading }: WThinkingPromptProps) {
  const { user } = useAuth()
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!user || !answer.trim()) return
    setSaving(true)
    await saveThinkingAnswer(user.id, answer.trim())
    setSaved(true)
    setSaving(false)
  }

  return (
    <Glass dark={dark} span={5} pad={14}>
      <CardLabel dark={dark}>Thinking prompt</CardLabel>

      {loading ? (
        <div style={{ opacity: 0.4, fontSize: 'var(--fs-13)', marginTop: 8 }}>Generating…</div>
      ) : !prompt ? (
        <div style={{ opacity: 0.4, fontSize: 'var(--fs-13)', marginTop: 8 }}>No prompt yet.</div>
      ) : (
        <>
          <div style={{
            fontSize: 'var(--fs-14)', lineHeight: 1.5, marginTop: 6, fontStyle: 'italic',
            color: dark ? C.cream : C.dark,
          }}>
            "{prompt}"
          </div>

          {saved ? (
            <div style={{ marginTop: 8, fontSize: 'var(--fs-12)', color: C.teal, fontWeight: 600 }}>
              ✓ Logged at 9:30
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Chew on it during the workout. Answer at 9:30…"
                rows={2}
                style={{
                  width: '100%', fontSize: 'var(--fs-13)', lineHeight: 1.4, padding: '6px 8px',
                  borderRadius: 8,
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : C.ink20}`,
                  background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(26,18,8,0.04)',
                  color: dark ? C.cream : C.dark,
                  resize: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving || !answer.trim()}
                style={{
                  marginTop: 4, background: C.rust, color: C.cream,
                  border: 'none', cursor: 'pointer',
                  padding: '4px 12px', borderRadius: 8, fontSize: 'var(--fs-12)', fontWeight: 700,
                  opacity: !answer.trim() ? 0.4 : 1,
                }}
              >
                {saving ? '…' : 'Log answer'}
              </button>
            </div>
          )}
        </>
      )}
    </Glass>
  )
}
