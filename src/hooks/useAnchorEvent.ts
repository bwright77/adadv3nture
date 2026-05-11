import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAnchorEvent, ANCHOR_FALLBACKS, type AnchorEvent, type AnchorSlug } from '../lib/anchorEvents'

export function useAnchorEvent(slug: AnchorSlug): AnchorEvent {
  const { user } = useAuth()
  const [event, setEvent] = useState<AnchorEvent>(() => ({
    id: `fallback-${slug}`,
    ...ANCHOR_FALLBACKS[slug],
  }))

  useEffect(() => {
    if (!user) return
    getAnchorEvent(user.id, slug).then(setEvent).catch(() => null)
  }, [user, slug])

  return event
}
