import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface DailyPlan {
  id: string
  plan_date: string
  morning_briefing: string | null
  briefing_generated_at: string | null
  thinking_prompt: string | null
  thinking_prompt_answer: string | null
  drinks_today: number
}

export async function getTodayPlan(userId: string): Promise<DailyPlan | null> {
  const today = new Date().toISOString().substring(0, 10)
  const { data } = await supabase
    .from('daily_plans')
    .select('id, plan_date, morning_briefing, briefing_generated_at, thinking_prompt, thinking_prompt_answer, drinks_today')
    .eq('user_id', userId)
    .eq('plan_date', today)
    .maybeSingle() as unknown as { data: DailyPlan | null }
  return data
}

export async function saveThinkingAnswer(userId: string, answer: string): Promise<void> {
  const today = new Date().toISOString().substring(0, 10)
  await db.from('daily_plans').upsert(
    { user_id: userId, plan_date: today, thinking_prompt_answer: answer },
    { onConflict: 'user_id,plan_date' },
  )
}
