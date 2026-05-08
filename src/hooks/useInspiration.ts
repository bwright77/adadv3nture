import { useEffect, useState } from 'react'

export interface InspirationPhoto {
  filename: string
  takenAt: string   // 'YYYY-MM-DD'
  month: number
  day: number
  year: number
  path: string      // '/photos/inspirations/<filename>'
}

interface Manifest {
  filename: string
  takenAt: string
  month: number
  day: number
  year: number
}

const CONTRAST_PROBABILITY = 0.15

function selectPhoto(photos: InspirationPhoto[]): InspirationPhoto | null {
  if (!photos.length) return null

  const today = new Date()
  const m = today.getMonth() + 1
  const d = today.getDate()

  function pick<T>(pool: T[], max = pool.length): T {
    return pool[Math.floor(Math.random() * Math.min(pool.length, max))]
  }

  // 15% chance: pull from opposite season (±1 month, 6 months away)
  if (Math.random() < CONTRAST_PROBABILITY) {
    const opposite = ((m - 1 + 6) % 12) + 1
    const candidates = [opposite - 1, opposite, opposite + 1].map(x => ((x - 1 + 12) % 12) + 1)
    const contrast = photos.filter(p => candidates.includes(p.month))
    if (contrast.length >= 3) return pick(contrast)
    // not enough contrast photos yet — fall through
  }

  // Priority 1: within ±3 days of today in any past year
  const onThisDay = photos.filter(p => p.month === m && Math.abs(p.day - d) <= 3)
  if (onThisDay.length) return pick(onThisDay, 5)

  // Priority 2: same month, any day
  const thisMonth = photos.filter(p => p.month === m)
  if (thisMonth.length) return pick(thisMonth)

  // Priority 3: any photo
  return pick(photos)
}

export function useInspiration() {
  const [photo, setPhoto] = useState<InspirationPhoto | null>(null)

  useEffect(() => {
    fetch('/photos/inspirations/manifest.json')
      .then(r => r.json())
      .then((manifest: Manifest[]) => {
        const photos: InspirationPhoto[] = manifest.map(m => ({
          ...m,
          path: `/photos/inspirations/${m.filename}`,
        }))
        setPhoto(selectPhoto(photos))
      })
      .catch(() => null)
  }, [])

  return photo
}
