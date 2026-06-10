import { useState, useEffect, useRef } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getTrainingGoals, getCurrentTrainingWeek, addTrainingGoal, addTrainingWeek, updateTrainingGoalNotes, updateTrainingGoalDetails, updateTrainingWeekFuelActual, type TrainingGoal, type TrainingWeek, type TrainingEventType } from '../../lib/training'
import { TrainingProgramSection } from './TrainingProgramSection'
import { updateTrainingGoalImageUrl, updateTrainingGoalWebsiteUrl } from '../../lib/training'
import { isDerivedWeek } from '../../lib/trainingPlan'
import { daysUntil as daysUntilDate } from '../../lib/countdown'
import { matchRaceTarget } from '../../lib/raceTargets'

function CardImageBanner({ url, color, radius = '0 14px 0 0' }: { url: string; color: string; radius?: string }) {
  return (
    <div style={{ position: 'relative', height: 72, overflow: 'hidden', borderRadius: radius }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: color }} />
    </div>
  )
}

const EVENT_COLOR: Record<string, string> = {
  trail_run:      C.rust,
  cycling_gravel: C.teal,
  cycling_road:   '#5B8FBF',
}

const EVENT_LABEL: Record<string, string> = {
  trail_run:      'TRAIL RUN',
  cycling_gravel: 'GRAVEL',
  cycling_road:   'ROAD CYCLING',
}

function daysUntil(dateStr: string): number {
  return daysUntilDate(dateStr)
}

function formatDate(dateStr: string): string {
  // Anchor at noon local. `new Date('2026-08-22')` parses as UTC midnight,
  // which renders as Aug 21 in Denver. Same trick used in countdown.ts.
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function formatStartTime(t: string | null | undefined): string | null {
  if (!t) return null
  // Postgres `time` columns come back as 'HH:MM:SS'. Convert to 12-hour
  // local-style for display (e.g. '7:00 AM'); leave the raw value alone in DB.
  const [hh, mm] = t.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return t
  const period = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`
}

function EventCard({ goal, onOpen }: { goal: TrainingGoal; onOpen: () => void }) {
  const days = daysUntil(goal.event_date)
  const color = EVENT_COLOR[goal.event_type] ?? C.rust
  const done = days < 0
  const conditional = goal.commitment === 'conditional'

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        position: 'relative', marginBottom: 10,
        // A conditional "maybe" sits a step back from the locked races.
        opacity: done ? 0.45 : conditional ? 0.7 : 1,
        background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: goal.is_anchor ? 5 : 4,
        background: goal.is_anchor ? `linear-gradient(180deg, ${color}, ${color}99)` : color,
        borderRadius: '4px 0 0 4px',
        boxShadow: goal.is_anchor ? `2px 0 10px ${color}44` : 'none',
      }} />
      <div style={{
        marginLeft: 4,
        background: goal.is_anchor ? `${color}08` : '#fff',
        border: goal.is_anchor ? `0.5px solid ${color}30` : `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        overflow: 'hidden',
      }}>
        {goal.image_url && <CardImageBanner url={goal.image_url} color={color} />}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.12em', fontWeight: 700 }}>
                {EVENT_LABEL[goal.event_type]}
              </span>
              {goal.is_anchor && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust, letterSpacing: '0.1em' }}>◆ ANCHOR</span>
              )}
              {conditional && (
                <span className="mono" style={{
                  fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.1em',
                  border: `0.5px dashed ${C.ink40}`, borderRadius: 4, padding: '1px 5px',
                }}>MAYBE</span>
              )}
            </div>
            <div style={{ fontSize: 'var(--fs-17)', fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 4 }}>
              {goal.event_name}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {goal.location && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.location.toUpperCase()}</span>
              )}
              {goal.distance_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.distance_label.toUpperCase()}</span>
              )}
              {goal.elevation_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.elevation_label.toUpperCase()} ELEV</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {done ? (
              <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.teal }}>DONE</div>
            ) : (
              <>
                <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1, color: goal.is_anchor ? color : C.dark }}>{days}</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>DAYS</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 2 }}>{formatDate(goal.event_date)}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function EventDetail({ goal, onClose, onUpdate }: {
  goal: TrainingGoal
  onClose: () => void
  onUpdate: (g: TrainingGoal) => void
}) {
  const [notes, setNotes] = useState(goal.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [editingImage, setEditingImage] = useState(false)
  const [imageDraft, setImageDraft] = useState(goal.image_url ?? '')
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(goal.website_url ?? '')
  const [editingDetails, setEditingDetails] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [nameDraft, setNameDraft] = useState(goal.event_name)
  const [dateDraft, setDateDraft] = useState(goal.event_date)
  // Trim the seconds off the Postgres `time` value for the HTML time input,
  // which expects HH:MM. Empty string = no start time set.
  const [startTimeDraft, setStartTimeDraft] = useState((goal.event_start_time ?? '').slice(0, 5))
  const [typeDraft, setTypeDraft] = useState<TrainingEventType>(goal.event_type)
  const [locationDraft, setLocationDraft] = useState(goal.location ?? '')
  const [distanceDraft, setDistanceDraft] = useState(goal.distance_label ?? '')
  const [elevationDraft, setElevationDraft] = useState(goal.elevation_label ?? '')
  const days = daysUntil(goal.event_date)
  const color = EVENT_COLOR[goal.event_type] ?? C.rust

  function startEditingDetails() {
    setNameDraft(goal.event_name)
    setDateDraft(goal.event_date)
    setStartTimeDraft((goal.event_start_time ?? '').slice(0, 5))
    setTypeDraft(goal.event_type)
    setLocationDraft(goal.location ?? '')
    setDistanceDraft(goal.distance_label ?? '')
    setElevationDraft(goal.elevation_label ?? '')
    setEditingDetails(true)
  }

  async function saveDetails() {
    if (!nameDraft.trim() || !dateDraft) return
    setSavingDetails(true)
    try {
      const updated = await updateTrainingGoalDetails(goal.id, {
        event_name: nameDraft,
        event_date: dateDraft,
        event_start_time: startTimeDraft || null,
        event_type: typeDraft,
        location: locationDraft,
        distance_label: distanceDraft,
        elevation_label: elevationDraft,
      })
      onUpdate(updated)
      setEditingDetails(false)
    } finally {
      setSavingDetails(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const updated = await updateTrainingGoalNotes(goal.id, notes)
      onUpdate(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function saveImage() {
    await updateTrainingGoalImageUrl(goal.id, imageDraft)
    onUpdate({ ...goal, image_url: imageDraft.trim() || null })
    setEditingImage(false)
  }

  async function saveUrl() {
    await updateTrainingGoalWebsiteUrl(goal.id, urlDraft)
    onUpdate({ ...goal, website_url: urlDraft.trim() || null })
    setEditingUrl(false)
  }

  const meta: [string, string][] = [
    ['DATE', formatDate(goal.event_date)],
    ['COUNTDOWN', days < 0 ? 'COMPLETE' : `${days}d · ${Math.floor(days / 7)}wk`],
    ...(goal.event_start_time ? [['START', formatStartTime(goal.event_start_time) ?? goal.event_start_time] as [string, string]] : []),
    ...(goal.distance_label ? [['DISTANCE', goal.distance_label] as [string, string]] : []),
    ...(goal.elevation_label ? [['ELEVATION', goal.elevation_label] as [string, string]] : []),
    ...(goal.location ? [['LOCATION', goal.location] as [string, string]] : []),
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: C.paper, overflowY: 'auto' }}>
      <div style={{
        background: goal.image_url ? 'transparent' : color,
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 24px',
        position: 'relative',
        minHeight: goal.image_url ? 180 : 'auto',
      }}>
        {goal.image_url && (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${goal.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />
          </>
        )}
        <button onClick={onClose} style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16,
          background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 20,
          padding: '5px 14px', color: '#fff', fontSize: 'var(--fs-13)', cursor: 'pointer', zIndex: 1,
        }}>← Back</button>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.15em', marginBottom: 4 }}>
            {EVENT_LABEL[goal.event_type]}{goal.is_anchor ? ' · ◆ ANCHOR' : ''}{goal.commitment === 'conditional' ? ' · CONDITIONAL — TBD' : ''}
          </div>
          <div className="badge" style={{ fontSize: 'var(--fs-28)', color: '#fff', lineHeight: 1.1 }}>
            {goal.event_name}
          </div>
          {editingImage ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                autoFocus
                value={imageDraft}
                onChange={e => setImageDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveImage(); if (e.key === 'Escape') setEditingImage(false) }}
                placeholder="Image URL…"
                style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={saveImage} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
              <button onClick={() => setEditingImage(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', cursor: 'pointer' }}>×</button>
            </div>
          ) : (
            <button onClick={() => { setEditingImage(true); setImageDraft(goal.image_url ?? '') }} style={{ marginTop: 8, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.8)', fontSize: 'var(--fs-11)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {goal.image_url ? '✎' : '+ Add image'}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 18px 100px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `0.5px solid ${C.ink20}` }}>
          {editingDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: color, letterSpacing: '0.12em' }}>EDIT EVENT</div>
              <input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                placeholder="Event name"
                style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="date"
                  value={dateDraft}
                  onChange={e => setDateDraft(e.target.value)}
                  style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none', minWidth: 0 }}
                />
                <input
                  type="time"
                  value={startTimeDraft}
                  onChange={e => setStartTimeDraft(e.target.value)}
                  placeholder="Start time"
                  style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none', minWidth: 0 }}
                />
              </div>
              <select
                value={typeDraft}
                onChange={e => setTypeDraft(e.target.value as TrainingEventType)}
                style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none', background: '#fff' }}
              >
                <option value="trail_run">Trail Run</option>
                <option value="cycling_gravel">Gravel Cycling</option>
                <option value="cycling_road">Road Cycling</option>
              </select>
              <input
                value={locationDraft}
                onChange={e => setLocationDraft(e.target.value)}
                placeholder="Location"
                style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  value={distanceDraft}
                  onChange={e => setDistanceDraft(e.target.value)}
                  placeholder="Distance (e.g. 18.6mi)"
                  style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none', minWidth: 0 }}
                />
                <input
                  value={elevationDraft}
                  onChange={e => setElevationDraft(e.target.value)}
                  placeholder="Elevation"
                  style={{ border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark, outline: 'none', minWidth: 0 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                <button
                  onClick={() => setEditingDetails(false)}
                  style={{ background: 'none', border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 14px', fontSize: 'var(--fs-13)', color: C.ink60, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveDetails}
                  disabled={savingDetails || !nameDraft.trim() || !dateDraft}
                  style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer', opacity: (savingDetails || !nameDraft.trim() || !dateDraft) ? 0.5 : 1, fontFamily: 'inherit' }}
                >
                  {savingDetails ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>DETAILS</div>
                <button
                  onClick={startEditingDetails}
                  style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-12)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  ✎ Edit
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                {meta.map(([label, val]) => (
                  <div key={label}>
                    <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 'var(--fs-15)', fontWeight: 600, color: C.dark }}>{val}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.ink20}` }}>
            {editingUrl ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveUrl(); if (e.key === 'Escape') setEditingUrl(false) }}
                  placeholder="https://…"
                  style={{ flex: 1, border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '6px 10px', fontSize: 'var(--fs-13)', fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
                />
                <button onClick={saveUrl} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
                <button onClick={() => setEditingUrl(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
              </div>
            ) : goal.website_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', flexShrink: 0 }}>WEBSITE</span>
                <a href={goal.website_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 'var(--fs-13)', color, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {goal.website_url.replace(/^https?:\/\//, '')}
                </a>
                <button onClick={() => { setEditingUrl(true); setUrlDraft(goal.website_url ?? '') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-15)', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>✎</button>
              </div>
            ) : (
              <button onClick={() => setEditingUrl(true)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-13)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>+ Add website</button>
            )}
          </div>
        </div>

        {(() => {
          const rt = matchRaceTarget(goal)
          if (!rt) return null
          return (
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `0.5px solid ${C.ink20}`, borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>RACE PACE</div>
                <div className="mono" style={{ fontSize: 'var(--fs-11)', color }}>
                  TARGET {rt.targetFinish}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rt.segments.map(seg => (
                  <div key={seg.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 'var(--fs-12)', color: seg.key === 'blended' || seg.key === 'sustained' ? C.dark : C.ink60 }}>
                      {seg.label}
                    </span>
                    <span className="mono" style={{ fontSize: 'var(--fs-12)', fontWeight: seg.key === 'blended' || seg.key === 'sustained' ? 700 : 600, color: C.dark, whiteSpace: 'nowrap' }}>
                      {rt.paces[seg.key]}/mi
                    </span>
                  </div>
                ))}
                {rt.fuel && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 3, paddingTop: 7, borderTop: `0.5px solid ${C.ink20}` }}>
                    <span style={{ fontSize: 'var(--fs-12)', color: C.dark }}>Fuel rate</span>
                    <span className="mono" style={{ fontSize: 'var(--fs-12)', fontWeight: 700, color: C.dark, whiteSpace: 'nowrap' }}>
                      {rt.fuel} g/hr
                    </span>
                  </div>
                )}
              </div>
              {rt.courseMapUrl && (
                <a
                  href={rt.courseMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono"
                  style={{ display: 'inline-block', marginTop: 10, fontSize: 'var(--fs-11)', color, textDecoration: 'none' }}
                >
                  ↗ Course map
                </a>
              )}
            </div>
          )
        })()}

        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginBottom: 8 }}>NOTES</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Race strategy, goals, gear notes…"
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${C.ink20}`, borderRadius: 10, padding: '10px 12px',
            fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark,
            resize: 'none', outline: 'none', background: '#fff',
          }}
        />
        <button
          onClick={save}
          disabled={saving || notes === (goal.notes ?? '')}
          style={{
            marginTop: 10, background: color, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 24px', fontSize: 'var(--fs-14)',
            fontWeight: 700, cursor: 'pointer',
            opacity: (saving || notes === (goal.notes ?? '')) ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

function WeekCard({ week, derived }: { week: TrainingWeek; derived?: boolean }) {
  const { user } = useAuth()
  const items: { label: string; target: number | null; actual: number | null; unit: string }[] = [
    { label: 'RUN',      target: week.target_run_miles,        actual: week.actual_run_miles,         unit: 'MI' },
    { label: 'LONG RUN', target: week.target_long_run_miles,   actual: null,                          unit: 'MI' },
    { label: 'CYCLING',  target: week.target_cycling_miles,    actual: week.actual_cycling_miles,     unit: 'MI' },
    { label: 'STRENGTH', target: week.target_strength_sessions,actual: week.actual_strength_sessions, unit: 'X' },
  ].filter(i => (i.target ?? 0) > 0)

  // Long run is duration + fuel-rate led. Show the prescription and let the user
  // log the actual g/hr they hit — tracked like pace (planned-vs-actual).
  const hasFuelPlan = !!(week.long_run_duration || week.long_run_fuel_g_hr)
  const [fuelDraft, setFuelDraft] = useState(
    week.actual_long_run_fuel_g_hr != null ? String(week.actual_long_run_fuel_g_hr) : '',
  )
  const [savedFuel, setSavedFuel] = useState<number | null>(week.actual_long_run_fuel_g_hr)
  const [savingFuel, setSavingFuel] = useState(false)

  async function saveFuel() {
    if (!user || derived) return
    const trimmed = fuelDraft.trim()
    const val = trimmed === '' ? null : Number(trimmed)
    if (val !== null && !Number.isFinite(val)) return
    if (val === savedFuel) return
    setSavingFuel(true)
    try {
      await updateTrainingWeekFuelActual(user.id, week.week_start, val)
      setSavedFuel(val)
    } catch { /* leave draft for retry */ }
    finally { setSavingFuel(false) }
  }

  return (
    <div style={{
      background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>THIS WEEK</div>
          <div className="badge" style={{ fontSize: 'var(--fs-16)', color: C.dark, letterSpacing: '0.04em' }}>{week.phase_label}</div>
        </div>
        {derived && (
          <div className="mono" style={{
            fontSize: 'var(--fs-10)', letterSpacing: '0.12em',
            color: C.teal, padding: '3px 8px', borderRadius: 999,
            background: 'rgba(91,188,184,0.12)', border: `0.5px solid ${C.teal}`,
          }}>
            DERIVED
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
        {items.map(item => {
          const pct = item.actual != null && item.target ? Math.min(100, (item.actual / item.target) * 100) : null
          return (
            <div key={item.label} style={{
              background: C.paper, borderRadius: 10, padding: '8px 10px', textAlign: 'center',
            }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                <span className="badge" style={{ fontSize: 'var(--fs-20)', lineHeight: 1, color: C.dark }}>{item.target}</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>{item.unit}</span>
              </div>
              {pct !== null && (
                <div style={{ height: 3, background: C.ink20, borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: 3, width: `${pct}%`, background: C.teal, borderRadius: 2 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {hasFuelPlan && (
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${C.ink20}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em', marginBottom: 2 }}>LONG RUN</div>
            <div style={{ fontSize: 'var(--fs-14)', color: C.dark }}>
              {week.long_run_duration && <span style={{ fontWeight: 700 }}>~{week.long_run_duration}</span>}
              {week.long_run_duration && week.long_run_fuel_g_hr && <span style={{ color: C.ink40 }}> · </span>}
              {week.long_run_fuel_g_hr && (
                <span>fuel <span style={{ fontWeight: 700 }}>{week.long_run_fuel_g_hr}</span> g/hr</span>
              )}
            </div>
          </div>
          {!derived && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.08em' }}>ACTUAL</span>
              <input
                type="number"
                inputMode="numeric"
                value={fuelDraft}
                onChange={e => setFuelDraft(e.target.value)}
                onBlur={saveFuel}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="—"
                style={{
                  width: 52, textAlign: 'center', border: `1px solid ${C.ink20}`, borderRadius: 8,
                  padding: '4px 6px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark,
                  background: '#fff', outline: 'none',
                }}
              />
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: savingFuel ? C.teal : C.ink40 }}>
                {savingFuel ? '…' : 'g/hr'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddEventForm({ onSave, onCancel }: { onSave: (g: TrainingGoal) => void; onCancel: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [type, setType] = useState<TrainingEventType>('trail_run')
  const [location, setLocation] = useState('')
  const [distance, setDistance] = useState('')
  const [elevation, setElevation] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function handleSave() {
    if (!user || !name.trim() || !date) return
    setSaving(true)
    try {
      const g = await addTrainingGoal(user.id, name.trim(), date, type, {
        location: location.trim() || undefined,
        distance_label: distance.trim() || undefined,
        elevation_label: elevation.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        event_start_time: startTime || undefined,
      })
      onSave(g)
    } catch {
      setSaving(false)
    }
  }

  const inputStyle = {
    border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px',
    fontSize: 'var(--fs-14)', background: '#fff', color: C.dark,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
  }

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.teal}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.12em', marginBottom: 10 }}>NEW EVENT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input ref={nameRef} style={inputStyle} placeholder="Event name" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
          <input style={{ ...inputStyle, minWidth: 0 }} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="Start time (optional)" />
        </div>
        <select style={inputStyle} value={type} onChange={e => setType(e.target.value as TrainingEventType)}>
          <option value="trail_run">Trail Run</option>
          <option value="cycling_gravel">Gravel Cycling</option>
          <option value="cycling_road">Road Cycling</option>
        </select>
        <input style={inputStyle} placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} placeholder="Distance (e.g. 18.6mi)" value={distance} onChange={e => setDistance(e.target.value)} />
          <input style={{ ...inputStyle, minWidth: 0 }} placeholder="Elevation (e.g. 3,200ft)" value={elevation} onChange={e => setElevation(e.target.value)} />
        </div>
        <input style={inputStyle} placeholder="Event website URL (optional)" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !date} style={{
            background: C.teal, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer',
            opacity: (!name.trim() || !date) ? 0.5 : 1,
          }}>
            {saving ? 'Saving…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Returns this week's Monday as YYYY-MM-DD in local time.
function thisMonday(): string {
  const today = new Date()
  const d = new Date(today)
  d.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function AddWeekForm({ defaultWeekStart, onSave, onCancel }: {
  defaultWeekStart: string
  onSave: (w: TrainingWeek) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(defaultWeekStart)
  const [phase, setPhase] = useState('Build')
  const [runMi, setRunMi] = useState('')
  const [longRunMi, setLongRunMi] = useState('')
  const [cyclingMi, setCyclingMi] = useState('')
  const [strength, setStrength] = useState('')
  const [saving, setSaving] = useState(false)
  const phaseRef = useRef<HTMLInputElement>(null)

  useEffect(() => { phaseRef.current?.focus() }, [])

  async function handleSave() {
    if (!user || !phase.trim() || !weekStart) return
    setSaving(true)
    try {
      const w = await addTrainingWeek(user.id, weekStart, phase.trim(), {
        target_run_miles:         runMi.trim()     ? Number(runMi)     : null,
        target_long_run_miles:    longRunMi.trim() ? Number(longRunMi) : null,
        target_cycling_miles:     cyclingMi.trim() ? Number(cyclingMi) : null,
        target_strength_sessions: strength.trim()  ? Number(strength)  : null,
      })
      onSave(w)
    } catch {
      setSaving(false)
    }
  }

  const inputStyle = {
    border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px',
    fontSize: 'var(--fs-14)', background: '#fff', color: C.dark,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
  }

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.teal}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.12em', marginBottom: 10 }}>
        NEW WEEK · TARGETS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input
            ref={phaseRef}
            style={{ ...inputStyle, minWidth: 0 }}
            placeholder="Phase (Base, Build, Peak, Taper)"
            value={phase}
            onChange={e => setPhase(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
          />
          <input style={{ ...inputStyle, minWidth: 0 }} type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} inputMode="decimal" placeholder="Run miles" value={runMi} onChange={e => setRunMi(e.target.value)} />
          <input style={{ ...inputStyle, minWidth: 0 }} inputMode="decimal" placeholder="Long run miles" value={longRunMi} onChange={e => setLongRunMi(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} inputMode="decimal" placeholder="Cycling miles" value={cyclingMi} onChange={e => setCyclingMi(e.target.value)} />
          <input style={{ ...inputStyle, minWidth: 0 }} inputMode="numeric"  placeholder="Strength sessions" value={strength} onChange={e => setStrength(e.target.value)} />
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, marginTop: 2 }}>
          Leave any target blank to skip it. Re-saving the same week overwrites its targets.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !phase.trim() || !weekStart}
            style={{
              background: C.teal, color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer',
              opacity: (!phase.trim() || !weekStart) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Week'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TrainingViewProps {
  initialEvent?: { id: string; version: number }
}

export function TrainingView({ initialEvent }: TrainingViewProps = {}) {
  const { user } = useAuth()
  const [goals, setGoals] = useState<TrainingGoal[]>([])
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [addingWeek, setAddingWeek] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getTrainingGoals(user.id),
      getCurrentTrainingWeek(user.id),
    ]).then(([g, w]) => {
      setGoals(g)
      setWeek(w)
    }).catch(() => null).finally(() => setLoading(false))
  }, [user])

  // Deep-link from elsewhere in the app (e.g. Trends anchor card) —
  // when `initialEvent.version` changes, open that goal's EventDetail
  // if it's present in the loaded goals.
  useEffect(() => {
    if (!initialEvent) return
    if (goals.some(g => g.id === initialEvent.id)) {
      setSelectedId(initialEvent.id)
    }
  }, [initialEvent?.version, goals])


  const selectedGoal = goals.find(g => g.id === selectedId) ?? null

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-15)' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '0 0 140px' }}>
      {selectedGoal && (
        <EventDetail
          goal={selectedGoal}
          onClose={() => setSelectedId(null)}
          onUpdate={updated => setGoals(prev => prev.map(g => g.id === updated.id ? updated : g))}
        />
      )}

      {/* This week's targets — derived from upcoming events by default */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10 }}>
        ◆ THIS WEEK
      </div>

      {addingWeek && (
        <AddWeekForm
          defaultWeekStart={week?.week_start ?? thisMonday()}
          onSave={w => { setWeek(w); setAddingWeek(false) }}
          onCancel={() => setAddingWeek(false)}
        />
      )}

      {week ? (
        <WeekCard week={week} derived={isDerivedWeek(week)} />
      ) : (
        !addingWeek && (
          <div style={{
            background: '#fff', border: `0.5px dashed ${C.ink20}`, borderRadius: 14,
            padding: '14px 16px', marginBottom: 10,
            fontSize: 'var(--fs-13)', color: C.ink60,
          }}>
            No upcoming events yet — add one below and weekly targets derive automatically.
          </div>
        )
      )}

      {/* Discreet manual override — collapsed under the derived card */}
      {!addingWeek && week && (
        <div style={{ marginBottom: 14, marginTop: -2, textAlign: 'right' }}>
          <button
            onClick={() => setAddingWeek(true)}
            style={{
              background: 'none', border: 'none', color: C.ink40,
              fontSize: 'var(--fs-11)', cursor: 'pointer', padding: '2px 0',
              textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            {isDerivedWeek(week) ? 'Override this week' : 'Edit override'}
          </button>
        </div>
      )}

      {/* Full season program — position, report card, week list, principles */}
      <TrainingProgramSection />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 20 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40 }}>
          ◆ TARGET EVENTS
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            background: 'none', border: 'none', color: C.teal, fontSize: 'var(--fs-13)',
            fontWeight: 700, cursor: 'pointer', padding: '2px 0',
          }}>
            + Add Event
          </button>
        )}
      </div>

      {adding && (
        <AddEventForm
          onSave={g => { setGoals(prev => [...prev, g].sort((a, b) => a.event_date.localeCompare(b.event_date))); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}

      {goals.map(g => <EventCard key={g.id} goal={g} onOpen={() => setSelectedId(g.id)} />)}

      {goals.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)' }}>
          No training events set.
        </div>
      )}
    </div>
  )
}
