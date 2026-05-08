import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isStravaConnected, syncActivities, getRecentActivities, getStravaAuthUrl } from '../lib/strava'
import type { Database } from '../types/database'

type Activity = Database['public']['Tables']['activities']['Row']

export function useStrava() {
  const { user } = useAuth()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState<number | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    if (!user) return
    isStravaConnected(user.id).then(setConnected)
    getRecentActivities(user.id).then(setActivities)
  }, [user])

  const connect = useCallback(() => {
    if (!user) return
    window.location.href = getStravaAuthUrl(user.id)
  }, [user])

  const sync = useCallback(async () => {
    if (!user || syncing) return
    setSyncing(true)
    setSyncCount(null)
    try {
      const count = await syncActivities(user.id)
      setSyncCount(count)
      setConnected(true)
      const updated = await getRecentActivities(user.id)
      setActivities(updated)
    } catch {
      // token may have been revoked
      setConnected(false)
    } finally {
      setSyncing(false)
    }
  }, [user, syncing])

  return { connected, syncing, syncCount, activities, connect, sync }
}
