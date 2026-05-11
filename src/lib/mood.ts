import { supabase } from './supabase'
import { logicalToday } from './utils'

export async function getTodayMood(userId: string): Promise<number | null> {
  const today = logicalToday()
  const { data } = await supabase
    .from('recovery_signals')
    .select('mood_score')
    .eq('user_id', userId)
    .eq('signal_date', today)
    .maybeSingle() as unknown as { data: { mood_score: number | null } | null }
  return data?.mood_score ?? null
}

export async function setTodayMood(userId: string, score: number | null): Promise<void> {
  const today = logicalToday()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('recovery_signals').upsert(
    { user_id: userId, signal_date: today, mood_score: score },
    { onConflict: 'user_id,signal_date' },
  )
}
