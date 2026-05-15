import { supabase } from './supabase'
import { logicalToday } from './utils'

// mood_score lives on daily_plans (per migration 001 line 147), not on
// recovery_signals. Keyed by (user_id, plan_date) so it coexists with the
// portfolio-review fields the rest of WReview manages.
export async function getTodayMood(userId: string, date?: string): Promise<number | null> {
  const planDate = date ?? logicalToday()
  const { data } = await supabase
    .from('daily_plans')
    .select('mood_score')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .maybeSingle() as unknown as { data: { mood_score: number | null } | null }
  return data?.mood_score ?? null
}

export async function setTodayMood(userId: string, score: number | null, date?: string): Promise<void> {
  const planDate = date ?? logicalToday()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('daily_plans').upsert(
    { user_id: userId, plan_date: planDate, mood_score: score },
    { onConflict: 'user_id,plan_date' },
  )
}
