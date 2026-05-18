import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  isWithingsConnected, getWithingsAuthUrl,
  syncBodyMetrics, getRecentBodyMetrics,
  WithingsAuthError, WithingsTransientError,
} from '../lib/withings'

export interface BodyMetric {
  id: string
  measured_at: string
  weight_lbs: number | null
  body_fat_pct: number | null
  muscle_mass_lbs: number | null
  muscle_mass_pct: number | null
  bone_mass_lbs: number | null
  water_pct: number | null
}

export function useWithings() {
  const { user } = useAuth()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState<number | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<BodyMetric[]>([])

  useEffect(() => {
    if (!user) return
    isWithingsConnected(user.id).then(ok => {
      setConnected(ok)
      if (ok) loadMetrics(user.id)
    })
  }, [user])

  async function loadMetrics(userId: string) {
    const data = await getRecentBodyMetrics(userId)
    setMetrics(data as BodyMetric[])
  }

  function connect() {
    if (!user) return
    window.location.href = getWithingsAuthUrl(user.id)
  }

  async function sync() {
    if (!user) return
    setSyncing(true)
    setSyncCount(null)
    setSyncError(null)
    try {
      const count = await syncBodyMetrics(user.id)
      setSyncCount(count)
      await loadMetrics(user.id)
    } catch (err) {
      if (err instanceof WithingsAuthError) {
        // True disconnect — refresh chain is dead, UI should flip to Connect.
        setConnected(false)
        setSyncError(err.message)
      } else if (err instanceof WithingsTransientError) {
        // Transient (network/rate-limit/5xx). Keep connection; surface message
        // so the user can retry without re-authorizing.
        setSyncError(err.message)
      } else {
        setSyncError(err instanceof Error ? err.message : 'Sync failed.')
      }
    } finally {
      setSyncing(false)
    }
  }

  return { connected, syncing, syncCount, syncError, metrics, connect, sync }
}
