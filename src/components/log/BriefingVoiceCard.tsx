import { useEffect, useRef, useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getBriefingProfile, updateBriefingProfile, type BriefingProfile } from '../../lib/briefingProfile'

type Draft = {
  identity: string
  current_focus: string
  health_context: string         // newline-joined
  goals: string
  tone_notes: string
  weekend_identity: string
}

function toDraft(p: BriefingProfile): Draft {
  return {
    identity: p.identity ?? '',
    current_focus: p.current_focus ?? '',
    health_context: (p.health_context ?? []).join('\n'),
    goals: (p.goals ?? []).join('\n'),
    tone_notes: (p.tone_notes ?? []).join('\n'),
    weekend_identity: p.weekend_identity ?? '',
  }
}

function fromDraft(d: Draft): BriefingProfile {
  const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)
  return {
    identity: d.identity.trim() || undefined,
    current_focus: d.current_focus.trim() || undefined,
    health_context: lines(d.health_context),
    goals: lines(d.goals),
    tone_notes: lines(d.tone_notes),
    weekend_identity: d.weekend_identity.trim() || undefined,
  }
}

const inputStyle = {
  border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px',
  fontSize: 'var(--fs-14)', background: '#fff', color: C.dark,
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
}

const labelStyle = {
  fontSize: 'var(--fs-10)', letterSpacing: '0.12em', color: C.ink40,
  marginBottom: 4, marginTop: 10, fontWeight: 700,
}

export function BriefingVoiceCard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<BriefingProfile | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveBtnRef = useRef<HTMLButtonElement | null>(null)

  // When the form opens on small screens the Save button often lands below
  // the iOS keyboard. Bring it into the bottom third of the viewport so the
  // user can reach it without dismissing.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      saveBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!user) return
    getBriefingProfile(user.id).then(p => {
      setProfile(p)
      setDraft(toDraft(p))
    }).catch(() => null)
  }, [user])

  async function handleSave() {
    if (!user || !draft) return
    setSaving(true)
    try {
      const next = fromDraft(draft)
      await updateBriefingProfile(user.id, next)
      setProfile(next)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (profile) setDraft(toDraft(profile))
    setOpen(false)
  }

  if (!profile || !draft) return null

  const summary = profile.identity || profile.current_focus || 'Tap edit to write your briefing voice'
  const counts = [
    profile.health_context?.length ?? 0,
    profile.goals?.length ?? 0,
    profile.tone_notes?.length ?? 0,
  ]
  const meta = `${counts[0]} health · ${counts[1]} goals · ${counts[2]} tone`

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="mono" style={{
        fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em',
        color: C.ink40, marginBottom: 8, marginTop: 8,
      }}>◆ BRIEFING VOICE</div>

      <div style={{
        background: '#fff', border: `0.5px solid ${C.ink20}`,
        borderRadius: 14, padding: '12px 14px',
      }}>
        {!open ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-14)', color: C.dark, lineHeight: 1.35 }}>
                {summary}
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, marginTop: 4 }}>
                {meta}
              </div>
            </div>
            <button
              onClick={() => setOpen(true)}
              style={{
                background: 'none', border: 'none', color: C.rust,
                fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer', padding: '2px 0',
              }}
            >
              Edit
            </button>
          </div>
        ) : (
          <>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, marginBottom: 8, lineHeight: 1.4 }}>
              Personal narrative used by the morning briefing prompt. One item per line for the
              multi-line fields. Dates and family ages come from elsewhere — leave them out here.
            </div>

            <div style={labelStyle}>IDENTITY</div>
            <input
              value={draft.identity}
              onChange={e => setDraft({ ...draft, identity: e.target.value })}
              placeholder="e.g. 48yo dad in Denver CO"
              style={inputStyle}
            />

            <div style={labelStyle}>CURRENT FOCUS</div>
            <input
              value={draft.current_focus}
              onChange={e => setDraft({ ...draft, current_focus: e.target.value })}
              placeholder="What you're actively building"
              style={inputStyle}
            />

            <div style={labelStyle}>HEALTH CONTEXT (one per line)</div>
            <textarea
              value={draft.health_context}
              onChange={e => setDraft({ ...draft, health_context: e.target.value })}
              rows={3}
              placeholder="GLP-1 since Nov 2024&#10;Target 178-182 lbs"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            />

            <div style={labelStyle}>GOALS (one per line)</div>
            <textarea
              value={draft.goals}
              onChange={e => setDraft({ ...draft, goals: e.target.value })}
              rows={2}
              placeholder="Drink ratio ≤ 2/day average"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
            />

            <div style={labelStyle}>TONE NOTES (one per line — weekday voice nudges)</div>
            <textarea
              value={draft.tone_notes}
              onChange={e => setDraft({ ...draft, tone_notes: e.target.value })}
              rows={3}
              placeholder='External accountability works better than abstract goals.'
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            />

            <div style={labelStyle}>WEEKEND IDENTITY</div>
            <input
              value={draft.weekend_identity}
              onChange={e => setDraft({ ...draft, weekend_identity: e.target.value })}
              placeholder="Big rides, long hikes, ski tours…"
              style={inputStyle}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={handleCancel}
                style={{
                  background: 'none', border: 'none', color: C.ink40,
                  fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px',
                }}
              >
                Cancel
              </button>
              <button
                ref={saveBtnRef}
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: C.rust, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer',
                  scrollMarginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
