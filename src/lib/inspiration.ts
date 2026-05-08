import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const BUCKET = 'inspiration-photos'

export interface InspirationPhoto {
  id: string
  taken_at: string          // 'YYYY-MM-DD'
  location: string | null
  activity_type: string | null
  caption: string | null
  thumbnail_url: string
  original_url: string
  user_starred: boolean
  times_surfaced: number
  // Derived display fields
  year: number
  takenAt: string           // formatted 'May 1'
}

function storageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toPhoto(row: {
  id: string
  taken_at: string
  location: string | null
  activity_type: string | null
  caption: string | null
  thumbnail_path: string | null
  storage_path: string
  user_starred: boolean
  times_surfaced: number
}): InspirationPhoto {
  return {
    id: row.id,
    taken_at: row.taken_at,
    location: row.location,
    activity_type: row.activity_type,
    caption: row.caption,
    thumbnail_url: storageUrl(row.thumbnail_path ?? row.storage_path),
    original_url: storageUrl(row.storage_path),
    user_starred: row.user_starred,
    times_surfaced: row.times_surfaced,
    year: new Date(row.taken_at + 'T12:00:00').getFullYear(),
    takenAt: formatMonthDay(row.taken_at),
  }
}

export async function getDailyInspiration(userId: string): Promise<InspirationPhoto | null> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  // Priority 1: within ±3 days of today in any past year
  const { data: onThisDay } = await supabase
    .from('inspiration_photos')
    .select('*')
    .eq('user_id', userId)
    .filter('taken_at', 'not.gte', today.toISOString().substring(0, 10))  // exclude future
    .order('user_starred', { ascending: false })
    .order('times_surfaced', { ascending: true })
    .limit(20) as { data: Parameters<typeof toPhoto>[0][] | null }

  const candidates = (onThisDay ?? []).filter(r => {
    const d = new Date(r.taken_at + 'T12:00:00')
    return d.getMonth() + 1 === month && Math.abs(d.getDate() - day) <= 3
  })

  let pick: Parameters<typeof toPhoto>[0] | null = null

  if (candidates.length > 0) {
    pick = candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))]
  } else {
    // Priority 2: same month
    const { data: sameMonth } = await supabase
      .from('inspiration_photos')
      .select('*')
      .eq('user_id', userId)
      .order('user_starred', { ascending: false })
      .order('times_surfaced', { ascending: true })
      .limit(20) as { data: Parameters<typeof toPhoto>[0][] | null }

    const monthCandidates = (sameMonth ?? []).filter(r => {
      const d = new Date(r.taken_at + 'T12:00:00')
      return d.getMonth() + 1 === month
    })

    if (monthCandidates.length > 0) {
      pick = monthCandidates[Math.floor(Math.random() * monthCandidates.length)]
    } else {
      // Priority 3: any photo, least surfaced
      const { data: any } = await supabase
        .from('inspiration_photos')
        .select('*')
        .eq('user_id', userId)
        .order('times_surfaced', { ascending: true })
        .limit(1) as { data: Parameters<typeof toPhoto>[0][] | null }
      pick = any?.[0] ?? null
    }
  }

  if (!pick) return null

  // Increment times_surfaced
  await db.from('inspiration_photos')
    .update({ times_surfaced: pick.times_surfaced + 1, last_surfaced_at: new Date().toISOString() })
    .eq('id', pick.id)

  return toPhoto(pick)
}
