import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useWeekendPlan() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<WeekendPlan | null>(null)
  const [lastEffort, setLastEffort] = useState<LastEffort | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const db = supabase as any
    const today = todayStr()

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
      const daysAgo = Math.floor((Date.now() - new Date(effortData.activity_date).getTime()) / 86_400_000)
      setLastEffort({ activity_type: effortData.activity_type, title: effortData.title, daysAgo })
    }

    setIsLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function upsertPlan(fields: Omit<WeekendPlan, 'id' | 'plan_date'>) {
    if (!user) return
    const db = supabase as any
    const today = todayStr()
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
