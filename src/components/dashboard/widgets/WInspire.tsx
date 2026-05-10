import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { InspireDetail } from '../InspireDetail'
import type { InspirationPhoto } from '../../../hooks/useInspiration'

const BUCKET = 'inspiration-photos'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface Photo {
  id: string
  taken_at: string
  location: string | null
  activity_type: string | null
  caption: string | null
  thumbnail_path: string | null
  storage_path: string
  times_surfaced: number
}

interface WInspireProps {
  dark?: boolean
  span?: number
}

function publicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function toInspirationPhoto(p: Photo): InspirationPhoto {
  const d = new Date(p.taken_at + 'T12:00:00')
  return {
    id: p.id,
    taken_at: p.taken_at,
    year: d.getFullYear(),
    location: p.location,
    activity_type: p.activity_type,
    caption: p.caption,
    thumbnail_url: publicUrl(p.thumbnail_path ?? p.storage_path),
    original_url: publicUrl(p.storage_path),
    user_starred: false,
    times_surfaced: p.times_surfaced,
    takenAt: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

export function WInspire({ dark, span = 6 }: WInspireProps) {
  const { user } = useAuth()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (!user) return

    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const todayStr = today.toISOString().substring(0, 10)

    ;(db
      .from('inspiration_photos')
      .select('id, taken_at, location, activity_type, caption, thumbnail_path, storage_path, times_surfaced')
      .eq('user_id', user.id)
      .lt('taken_at', todayStr)
      .order('times_surfaced', { ascending: true })
      .limit(200) as Promise<{ data: Photo[] | null }>
    ).then(({ data }) => {
      if (!data || data.length === 0) return

      // Priority 1: ±3 days of today in any past year
      const onThisDay = data.filter(r => {
        const d = new Date(r.taken_at + 'T12:00:00')
        return d.getMonth() + 1 === month && Math.abs(d.getDate() - day) <= 3
      })

      // Priority 2: same month
      const sameMonth = data.filter(r =>
        new Date(r.taken_at + 'T12:00:00').getMonth() + 1 === month
      )

      const pool = onThisDay.length > 0 ? onThisDay : sameMonth.length > 0 ? sameMonth : data
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 5))]
      setPhoto(pick)

      // Fire-and-forget times_surfaced increment
      db.from('inspiration_photos')
        .update({ times_surfaced: pick.times_surfaced + 1, last_surfaced_at: new Date().toISOString() })
        .eq('id', pick.id)
        .then(() => {}).catch(() => {})
    }).catch(() => null)
  }, [user])

  if (!photo) {
    return (
      <Glass dark={dark} span={span} pad={0} style={{ height: 148, padding: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span className="badge" style={{ fontSize: 'var(--fs-10)', opacity: 0.3, letterSpacing: '0.15em' }}>
            ON THIS DAY
          </span>
          <span style={{ fontSize: 'var(--fs-12)', opacity: 0.25 }}>
            run: npm run sync-photos
          </span>
        </div>
      </Glass>
    )
  }

  const imgUrl = publicUrl(photo.thumbnail_path ?? photo.storage_path)
  const year = new Date(photo.taken_at + 'T12:00:00').getFullYear()
  const yearsAgo = new Date().getFullYear() - year
  const subtitle = [photo.location, photo.activity_type].filter(Boolean).join(' · ')

  return (
    <>
    {showDetail && photo && (
      <InspireDetail photo={toInspirationPhoto(photo)} onClose={() => setShowDetail(false)} />
    )}
    <Glass
      dark={dark}
      span={span}
      pad={0}
      style={{ height: 148, padding: 0, cursor: 'pointer' }}
      onClick={() => photo && setShowDetail(true)}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 22,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72))',
        borderRadius: 22,
      }} />
      <div style={{ position: 'absolute', left: 12, top: 10 }}>
        <span className="badge" style={{
          fontSize: 'var(--fs-10)', color: C.cream, letterSpacing: '0.18em',
          background: 'rgba(0,0,0,0.38)', padding: '3px 8px', borderRadius: 4,
        }}>
          ON THIS DAY
        </span>
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: C.cream }}>
        {photo.caption && (
          <div style={{ fontSize: 'var(--fs-13)', opacity: 0.9, lineHeight: 1.3, marginBottom: 3 }}>
            "{photo.caption}"
          </div>
        )}
        <div className="badge" style={{ fontSize: 'var(--fs-14)', lineHeight: 1.1 }}>
          {subtitle || photo.taken_at}
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.8, marginTop: 2 }}>
          {year}{yearsAgo > 0 ? ` · ${yearsAgo}y ago` : ''}
        </div>
      </div>
    </Glass>
    </>
  )
}
