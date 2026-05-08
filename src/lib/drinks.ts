import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10)
}

export async function getDrinksForDate(userId: string, date: string): Promise<number> {
  const { data } = await supabase
    .from('recovery_signals')
    .select('drinks_consumed')
    .eq('user_id', userId)
    .eq('signal_date', date)
    .maybeSingle() as { data: { drinks_consumed: number } | null }
  return data?.drinks_consumed ?? 0
}

export async function setDrinksForDate(userId: string, date: string, count: number): Promise<void> {
  const { error } = await db
    .from('recovery_signals')
    .upsert(
      { user_id: userId, signal_date: date, drinks_consumed: count, source: 'manual' },
      { onConflict: 'user_id,signal_date' },
    )
  if (error) throw new Error(error.message)
}

export async function getLast7Days(userId: string): Promise<{ date: string; count: number }[]> {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toDateStr(d))
  }

  const { data } = await supabase
    .from('recovery_signals')
    .select('signal_date, drinks_consumed')
    .eq('user_id', userId)
    .in('signal_date', days) as { data: { signal_date: string; drinks_consumed: number }[] | null }

  const map = new Map((data ?? []).map(r => [r.signal_date, r.drinks_consumed]))
  return days.map(date => ({ date, count: map.get(date) ?? 0 }))
}
