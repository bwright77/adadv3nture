import { useState, useEffect } from 'react'

export type TimeOfDay = 'morning' | 'mid-morning' | 'afternoon' | 'evening'

function getTimeOfDay(date: Date): TimeOfDay {
  const mins = date.getHours() * 60 + date.getMinutes()
  if (mins >= 7 * 60 + 35 && mins < 9 * 60 + 30) return 'morning'
  if (mins >= 9 * 60 + 30 && mins < 14 * 60 + 30) return 'mid-morning'
  if (mins >= 14 * 60 + 30 && mins < 18 * 60) return 'afternoon'
  return 'evening'
}

export function useTimeOfDay(): TimeOfDay {
  const [tod, setTod] = useState<TimeOfDay>(() => getTimeOfDay(new Date()))

  useEffect(() => {
    const tick = () => setTod(getTimeOfDay(new Date()))
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return tod
}

// Hour ranges that "feel right" for each time slot
const TOD_HOURS: Record<TimeOfDay, [number, number]> = {
  'morning':     [5,  10],
  'mid-morning': [9,  14],
  'afternoon':   [13, 20],
  'evening':     [17, 24],  // also wraps 0-6 below
}

interface ManifestPhoto {
  filename: string
  takenAt: string
  month: number
  day: number
  year: number
  hour: number | null
}

const CONTRAST_PROBABILITY = 0.15

function oppositeMonthPhotos(photos: ManifestPhoto[], m: number): ManifestPhoto[] {
  const opposite = ((m - 1 + 6) % 12) + 1
  // ±1 month window around the opposite point
  const candidates = [opposite - 1, opposite, opposite + 1].map(x => ((x - 1 + 12) % 12) + 1)
  return photos.filter(p => candidates.includes(p.month))
}

function pickBgPhoto(photos: ManifestPhoto[], tod: TimeOfDay): string {
  const today = new Date()
  const m = today.getMonth() + 1
  const d = today.getDate()
  const [hMin, hMax] = TOD_HOURS[tod]

  function matchesTime(p: ManifestPhoto): boolean {
    if (p.hour === null) return true
    if (tod === 'evening') return p.hour >= 17 || p.hour < 6
    return p.hour >= hMin && p.hour < hMax
  }

  function pick(pool: ManifestPhoto[]): string {
    return '/photos/inspirations/' + pool[Math.floor(Math.random() * pool.length)].filename
  }

  // 15% chance: pull from the opposite season for a contrast shot
  if (Math.random() < CONTRAST_PROBABILITY) {
    const contrast = oppositeMonthPhotos(photos, m)
    if (contrast.length >= 3) return pick(contrast)
    // not enough contrast photos yet — fall through to normal selection
  }

  // Priority 1: seasonal (±14 days) + time-of-day match
  const seasonal = photos.filter(p => {
    const diff = Math.abs(p.month * 31 + p.day - (m * 31 + d))
    return diff <= 14 || diff >= 31 * 12 - 14
  })
  const seasonalTimed = seasonal.filter(matchesTime)
  if (seasonalTimed.length) return pick(seasonalTimed)

  // Priority 2: time-of-day match from full library
  const timed = photos.filter(matchesTime)
  if (timed.length) return pick(timed)

  // Priority 3: any photo
  return pick(photos)
}

// Cached per session so the background doesn't flicker on re-renders
const bgCache: Partial<Record<TimeOfDay, string>> = {}

export function useBgPhoto(tod: TimeOfDay): string {
  const [path, setPath] = useState<string>(() => bgCache[tod] ?? '')

  useEffect(() => {
    if (bgCache[tod]) {
      setPath(bgCache[tod]!)
      return
    }
    fetch('/photos/inspirations/manifest.json')
      .then(r => r.json())
      .then((photos: ManifestPhoto[]) => {
        const picked = pickBgPhoto(photos, tod)
        bgCache[tod] = picked
        setPath(picked)
      })
      .catch(() => setPath(''))
  }, [tod])

  return path
}
