import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface Reminder {
  id: string
  user_id: string
  title: string
  category: string | null
  urgency: 'high' | 'medium' | 'low'
  snoozed_until: string | null
  completed_at: string | null
  created_at: string
}

export async function getActiveReminders(userId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().substring(0, 10)
  const { data, error } = await supabase
    .from('persistent_reminders')
    .select('*')
    .eq('user_id', userId)
    .is('completed_at', null)
    .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Reminder[]
}

export async function addReminder(
  userId: string,
  title: string,
  category: string,
  urgency: 'high' | 'medium' | 'low' = 'medium',
): Promise<Reminder> {
  const { data, error } = await db
    .from('persistent_reminders')
    .insert({ user_id: userId, title, category, urgency, surfaces_daily: true })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Reminder
}

export async function snoozeReminder(id: string): Promise<void> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const { error } = await db
    .from('persistent_reminders')
    .update({ snoozed_until: tomorrow.toISOString().substring(0, 10) })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function completeReminder(id: string): Promise<void> {
  const { error } = await db
    .from('persistent_reminders')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('persistent_reminders').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
