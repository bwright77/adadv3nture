import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  isWithingsConnected, getWithingsAuthUrl,
  syncBodyMetrics, getRecentBodyMetrics,
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
    try {
      const count = await syncBodyMetrics(user.id)
      setSyncCount(count)
      await loadMetrics(user.id)
    } finally {
      setSyncing(false)
    }
  }

  return { connected, syncing, syncCount, metrics, connect, sync }
}
