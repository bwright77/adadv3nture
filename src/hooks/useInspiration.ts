import { useEffect, useState } from 'react'
import { getDailyInspiration, type InspirationPhoto } from '../lib/inspiration'
import { useAuth } from '../contexts/AuthContext'

export type { InspirationPhoto }

export function useInspiration() {
  const { user } = useAuth()
  const [photo, setPhoto] = useState<InspirationPhoto | null>(null)

  useEffect(() => {
    if (!user) return
    getDailyInspiration(user.id)
      .then(p => setPhoto(p))
      .catch(() => null)
  }, [user])

  return photo
}
