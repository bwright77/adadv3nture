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

function pickBgPhoto(photos: ManifestPhoto[], tod: TimeOfDay): string {
  const today = new Date()
  const m = today.getMonth() + 1
  const d = today.getDate()
  const [hMin, hMax] = TOD_HOURS[tod]

  function matchesTime(p: ManifestPhoto): boolean {
    if (p.hour === null) return true  // unknown time → always eligible
    if (tod === 'evening') return p.hour >= 17 || p.hour < 6
    return p.hour >= hMin && p.hour < hMax
  }

  // Priority 1: seasonal (±14 days) + time-of-day match
  const seasonal = photos.filter(p => {
    const diff = Math.abs(p.month * 31 + p.day - (m * 31 + d))
    return diff <= 14 || diff >= 31 * 12 - 14
  })
  const seasonalTimed = seasonal.filter(matchesTime)
  if (seasonalTimed.length) {
    return '/photos/inspirations/' + seasonalTimed[Math.floor(Math.random() * seasonalTimed.length)].filename
  }

  // Priority 2: time-of-day match from full library
  const timed = photos.filter(matchesTime)
  if (timed.length) {
    return '/photos/inspirations/' + timed[Math.floor(Math.random() * timed.length)].filename
  }

  // Priority 3: any photo
  return '/photos/inspirations/' + photos[Math.floor(Math.random() * photos.length)].filename
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
