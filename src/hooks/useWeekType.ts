import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logicalToday } from '../lib/utils'
import type { WeekType } from './useSummerMode'

// Week-type (Solo / Camp / Weekend) is a deliberate, Sunday-set value — it
// persists in users.summer_week_type so the morning-briefing Edge Function can
// read it server-side. Unlike the time-of-day override it does NOT auto-clear.
export function useWeekType(): { weekType: WeekType; setWeekType: (wt: WeekType) => void; loading: boolean } {
  const { user } = useAuth()
  const [weekType, setWeekTypeState] = useState<WeekType>('solo')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('users')
      .select('summer_week_type')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const wt = (data as { summer_week_type?: WeekType | null } | null)?.summer_week_type
        if (wt) setWeekTypeState(wt)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user])

  const setWeekType = useCallback((wt: WeekType) => {
    setWeekTypeState(wt)   // optimistic
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db.from('users')
      .update({ summer_week_type: wt, summer_week_type_set_on: logicalToday() })
      .eq('id', user.id)
      .then(() => { /* swallow */ })
  }, [user])

  return { weekType, setWeekType, loading }
}
