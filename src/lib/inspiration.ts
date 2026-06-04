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

// For background: strictly seasonal (near today in past years), no contrast
export async function getSeasonalPhoto(userId: string): Promise<InspirationPhoto | null> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const todayStr = today.toISOString().substring(0, 10)

  const { data, error } = await supabase
    .from('inspiration_photos')
    .select('*')
    .eq('user_id', userId)
    .lt('taken_at', todayStr)
    .order('times_surfaced', { ascending: true })
    .order('user_starred', { ascending: false })
    .limit(200)

  if (error || !data) return null

  // Prefer photos within ±21 days of today in any past year
  const seasonal = (data as Parameters<typeof toPhoto>[0][]).filter(r => {
    const d = new Date(r.taken_at + 'T12:00:00')
    const m = d.getMonth() + 1
    const dy = d.getDate()
    const dayOfYear = m * 31 + dy
    const todayOfYear = month * 31 + day
    const diff = Math.abs(dayOfYear - todayOfYear)
    // handle year wrap (e.g. Dec 28 ↔ Jan 3)
    return diff <= 21 || diff >= 31 * 12 - 21
  })

  const pool = seasonal.length > 0 ? seasonal : (data as Parameters<typeof toPhoto>[0][])
  return toPhoto(pool[Math.floor(Math.random() * Math.min(pool.length, 15))])
}

export async function getPhotosAroundDate(userId: string, windowDays = 4): Promise<InspirationPhoto[]> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const { data } = await supabase
    .from('inspiration_photos')
    .select('*')
    .eq('user_id', userId)
    .lt('taken_at', today.toISOString().substring(0, 10))
    .order('taken_at', { ascending: false })
    .limit(200) as { data: Parameters<typeof toPhoto>[0][] | null }

  return (data ?? [])
    .filter(r => {
      const d = new Date(r.taken_at + 'T12:00:00')
      const m = d.getMonth() + 1
      const dy = d.getDate()
      const diff = Math.abs(m * 31 + dy - (month * 31 + day))
      return diff <= windowDays || diff >= 31 * 12 - windowDays
    })
    .map(toPhoto)
}

// ── Summer snapshots ────────────────────────────────────────────────────────
// Photos added through the season. They write straight into inspiration_photos,
// so today's summer snapshot becomes tomorrow's "on this day" memory.

// Photos taken on/after a date (this summer), newest first. Unlike the surfacing
// queries above this includes today — these are fresh memories, not throwbacks.
export async function getPhotosSince(userId: string, startDate: string): Promise<InspirationPhoto[]> {
  const { data } = await supabase
    .from('inspiration_photos')
    .select('*')
    .eq('user_id', userId)
    .gte('taken_at', startDate)
    .order('taken_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60) as { data: Parameters<typeof toPhoto>[0][] | null }
  return (data ?? []).map(toPhoto)
}

// Downscale to a fast-loading thumbnail (phone photos are multi-MB). Best-effort
// — a failure just means we fall back to the original for display.
async function makeThumbnail(file: File, maxPx = 480): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    return await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.8))
  } catch {
    return null
  }
}

// Upload one photo into the inspiration library. Stores a downscaled thumbnail
// alongside the original so the snapshot strip stays snappy.
export async function addInspirationPhoto(
  userId: string,
  file: File,
  opts: { takenAt: string; caption?: string | null; location?: string | null; activityType?: string | null },
): Promise<void> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${userId}/${stamp}.${ext}`

  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (up.error) throw new Error(up.error.message)

  let thumbPath: string | null = null
  const thumb = await makeThumbnail(file)
  if (thumb) {
    const tPath = `${userId}/${stamp}-thumb.jpg`
    const tUp = await supabase.storage.from(BUCKET).upload(tPath, thumb, { contentType: 'image/jpeg' })
    if (!tUp.error) thumbPath = tPath
  }

  const { error } = await db.from('inspiration_photos').insert({
    user_id: userId,
    storage_path: path,
    thumbnail_path: thumbPath,
    taken_at: opts.takenAt,
    caption: opts.caption ?? null,
    location: opts.location ?? null,
    activity_type: opts.activityType ?? null,
    original_filename: file.name,
  })
  if (error) throw new Error(error.message)
}

export async function getDailyInspiration(userId: string): Promise<InspirationPhoto | null> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const todayStr = today.toISOString().substring(0, 10)

  const { data, error } = await supabase
    .from('inspiration_photos')
    .select('*')
    .eq('user_id', userId)
    .lt('taken_at', todayStr)
    .order('times_surfaced', { ascending: true })
    .order('user_starred', { ascending: false })
    .limit(200)

  if (error || !data || data.length === 0) return null
  const rows = data as Parameters<typeof toPhoto>[0][]

  // 15% chance: opposite season for contrast
  if (Math.random() < 0.15) {
    const contrastMonth = ((month - 1 + 6) % 12) + 1
    const pool = rows.filter(r => new Date(r.taken_at + 'T12:00:00').getMonth() + 1 === contrastMonth)
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 5))]
      db.from('inspiration_photos')
        .update({ times_surfaced: pick.times_surfaced + 1, last_surfaced_at: new Date().toISOString() })
        .eq('id', pick.id).then(() => {}).catch(() => {})
      return toPhoto(pick)
    }
  }

  // Priority 1: ±3 days of today in any past year
  const onThisDay = rows.filter(r => {
    const d = new Date(r.taken_at + 'T12:00:00')
    return d.getMonth() + 1 === month && Math.abs(d.getDate() - day) <= 3
  })

  // Priority 2: same month
  const sameMonth = rows.filter(r => new Date(r.taken_at + 'T12:00:00').getMonth() + 1 === month)

  // Priority 3: any photo (rows already sorted by least-surfaced)
  const pool = onThisDay.length > 0 ? onThisDay : sameMonth.length > 0 ? sameMonth : rows
  const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 5))]

  db.from('inspiration_photos')
    .update({ times_surfaced: pick.times_surfaced + 1, last_surfaced_at: new Date().toISOString() })
    .eq('id', pick.id).then(() => {}).catch(() => {})

  return toPhoto(pick)
}
