import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logicalToday } from '../lib/utils'

export type AdventureType = 'run' | 'ride' | 'ski' | 'hike' | 'family' | 'project' | 'other'

export interface WeekendPlan {
  id: string
  plan_date: string
  activity_type: AdventureType | null
  title: string | null
  location: string | null
  departure_time: string | null
  notes: string | null
}

export interface LastEffort {
  activity_type: string
  title: string | null
  daysAgo: number
}

export function useWeekendPlan() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<WeekendPlan | null>(null)
  const [lastEffort, setLastEffort] = useState<LastEffort | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const db = supabase as any
    const today = logicalToday()

    const [{ data: planData }, { data: effortData }] = await Promise.all([
      db.from('weekend_plans').select('*').eq('user_id', user.id).eq('plan_date', today).maybeSingle(),
      db.from('activities')
        .select('activity_type, title, activity_date')
        .eq('user_id', user.id)
        .in('activity_type', ['run', 'ride', 'hike', 'ski', 'walk'])
        .gte('distance_miles', 3)
        .order('activity_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    setPlan(planData ?? null)

    if (effortData) {
      // Anchor at noon local — activity_date is a YYYY-MM-DD DATE column; bare
      // `new Date(dateStr)` parses as UTC midnight and shifts the day in Denver.
      const daysAgo = Math.floor((Date.now() - new Date(effortData.activity_date + 'T12:00:00').getTime()) / 86_400_000)
      setLastEffort({ activity_type: effortData.activity_type, title: effortData.title, daysAgo })
    }

    setIsLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function upsertPlan(fields: Omit<WeekendPlan, 'id' | 'plan_date'>) {
    if (!user) return
    const db = supabase as any
    const today = logicalToday()
    const { data } = await db.from('weekend_plans').upsert({
      user_id: user.id,
      plan_date: today,
      ...fields,
    }, { onConflict: 'user_id,plan_date' }).select().single()
    if (data) setPlan(data)
  }

  async function clearPlan() {
    if (!plan) return
    const db = supabase as any
    await db.from('weekend_plans').delete().eq('id', plan.id)
    setPlan(null)
  }

  return { plan, lastEffort, isLoading, upsertPlan, clearPlan, refetch: fetch }
}
