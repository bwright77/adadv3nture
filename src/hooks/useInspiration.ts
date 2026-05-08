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

function selectPhoto(photos: InspirationPhoto[]): InspirationPhoto | null {
  if (!photos.length) return null

  const today = new Date()
  const m = today.getMonth() + 1
  const d = today.getDate()

  // Priority 1: within ±3 days of today in any past year
  const onThisDay = photos.filter(p => p.month === m && Math.abs(p.day - d) <= 3)
  if (onThisDay.length) return onThisDay[Math.floor(Math.random() * Math.min(onThisDay.length, 5))]

  // Priority 2: same month, any day
  const thisMonth = photos.filter(p => p.month === m)
  if (thisMonth.length) return thisMonth[Math.floor(Math.random() * thisMonth.length)]

  // Priority 3: any photo
  return photos[Math.floor(Math.random() * photos.length)]
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
