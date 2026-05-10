import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type TrainingEventType = 'trail_run' | 'cycling_road' | 'cycling_gravel'
export type TrainingStatus = 'active' | 'complete' | 'skipped'

export interface TrainingGoal {
  id: string
  user_id: string
  event_name: string
  event_date: string
  event_type: TrainingEventType
  distance_label: string | null
  elevation_label: string | null
  location: string | null
  is_anchor: boolean
  status: TrainingStatus
  notes: string | null
  image_url: string | null
  website_url: string | null
  created_at: string
}

export interface TrainingWeek {
  id: string
  user_id: string
  week_start: string
  phase_label: string
  target_run_miles: number | null
  target_long_run_miles: number | null
  target_cycling_miles: number | null
  target_strength_sessions: number | null
  actual_run_miles: number | null
  actual_cycling_miles: number | null
  actual_strength_sessions: number | null
  notes: string | null
}

export async function getTrainingGoals(userId: string): Promise<TrainingGoal[]> {
  const { data, error } = await supabase
    .from('training_goals')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'skipped')
    .order('event_date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as TrainingGoal[]
}

export async function getCurrentTrainingWeek(userId: string): Promise<TrainingWeek | null> {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekStart = monday.toISOString().substring(0, 10)

  const { data, error } = await supabase
    .from('training_weeks')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as TrainingWeek | null
}

export async function addTrainingGoal(
  userId: string,
  eventName: string,
  eventDate: string,
  eventType: TrainingEventType,
  opts?: {
    location?: string
    distance_label?: string
    elevation_label?: string
    is_anchor?: boolean
    website_url?: string
  }
): Promise<TrainingGoal> {
  const { data, error } = await db
    .from('training_goals')
    .insert({
      user_id: userId,
      event_name: eventName,
      event_date: eventDate,
      event_type: eventType,
      location: opts?.location ?? null,
      distance_label: opts?.distance_label ?? null,
      elevation_label: opts?.elevation_label ?? null,
      is_anchor: opts?.is_anchor ?? false,
      website_url: opts?.website_url ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TrainingGoal
}

export async function updateTrainingGoalNotes(id: string, notes: string): Promise<TrainingGoal> {
  const { data, error } = await db
    .from('training_goals')
    .update({ notes: notes.trim() || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TrainingGoal
}

export async function updateTrainingGoalImageUrl(id: string, imageUrl: string): Promise<void> {
  await db.from('training_goals').update({ image_url: imageUrl.trim() || null }).eq('id', id)
}

export async function updateTrainingGoalWebsiteUrl(id: string, url: string): Promise<void> {
  await db.from('training_goals').update({ website_url: url.trim() || null }).eq('id', id)
}

export async function updateTrainingActuals(
  id: string,
  actuals: Partial<Pick<TrainingWeek, 'actual_run_miles' | 'actual_cycling_miles' | 'actual_strength_sessions'>>
): Promise<void> {
  const { error } = await db.from('training_weeks').update(actuals).eq('id', id)
  if (error) throw new Error(error.message)
}
