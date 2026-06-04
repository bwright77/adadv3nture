import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logicalToday } from '../lib/utils'
import { isCampWeek, type WeekType } from './useSummerMode'

// Week-type (Solo / Camp / Weekend). Camp is now driven by the actual camp
// schedule (CAMP_WEEKS) — during a camp week it's always 'camp', so no Sunday
// toggle is needed and a stale stored 'camp' never bleeds into a non-camp week.
// Outside camp weeks the stored value (Solo / Weekend) applies; the hero toggle
// still persists it to users.summer_week_type for the briefing to read.
export function useWeekType(): { weekType: WeekType; setWeekType: (wt: WeekType) => void; loading: boolean } {
  const { user } = useAuth()
  const [stored, setStored] = useState<WeekType | null>(null)
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
        if (wt) setStored(wt)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user])

  // Schedule is authoritative for camp; otherwise honor a Solo/Weekend choice.
  const weekType: WeekType = isCampWeek()
    ? 'camp'
    : (stored === 'weekend' ? 'weekend' : 'solo')

  const setWeekType = useCallback((wt: WeekType) => {
    setStored(wt)   // optimistic
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
