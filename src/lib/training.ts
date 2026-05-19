import { supabase } from './supabase'
import { deriveTrainingWeek } from './trainingPlan'
import { getProgram } from './program-tracker'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type TrainingEventType = 'trail_run' | 'cycling_road' | 'cycling_gravel'
export type TrainingStatus = 'active' | 'complete' | 'skipped'

export interface TrainingGoal {
  id: string
  user_id: string
  event_name: string
  event_date: string
  event_start_time: string | null   // HH:MM:SS (Postgres time), local clock
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

export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper'

export interface TrainingWeek {
  id: string
  user_id: string
  week_start: string
  phase_label: string
  // phase_id is the constrained category for grouping/coloring the plan UI;
  // phase_label remains the freeform per-week title ("Base 6 · Peak").
  phase_id: TrainingPhase | null
  focus: string | null
  key_marker: string | null
  // Display-only prescription strings, e.g. "PZ Max 1× · Strides 2×" / "3× TS"
  quality_prescription: string | null
  strength_prescription: string | null
  target_run_miles: number | null
  target_long_run_miles: number | null
  target_cycling_miles: number | null
  target_strength_sessions: number | null
  actual_run_miles: number | null
  actual_cycling_miles: number | null
  actual_strength_sessions: number | null
  notes: string | null
}

// Pull every seeded week for the user, oldest → newest. Used by the Plan view.
export async function getAllTrainingWeeks(userId: string): Promise<TrainingWeek[]> {
  const { data, error } = await supabase
    .from('training_weeks')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as TrainingWeek[]
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

  // 1. Manual override wins. A row in training_weeks for this Monday means
  //    the user explicitly customised this week — use it.
  const { data, error } = await supabase
    .from('training_weeks')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (data) return data as TrainingWeek

  // 2. No override — derive targets from upcoming events + active program.
  const [events, program] = await Promise.all([
    getTrainingGoals(userId),
    getProgram(userId).catch(() => null),
  ])
  return deriveTrainingWeek(userId, events, program, today)
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
    event_start_time?: string
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
      event_start_time: opts?.event_start_time ?? null,
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

export interface TrainingGoalEditableFields {
  event_name?: string
  event_date?: string
  event_start_time?: string | null
  event_type?: TrainingEventType
  location?: string | null
  distance_label?: string | null
  elevation_label?: string | null
}

// Single update for the user-facing detail fields. Used by the "Edit details"
// form on EventDetail. Empty strings are normalised to null for the optional
// fields so the DB stays clean.
export async function updateTrainingGoalDetails(
  id: string,
  fields: TrainingGoalEditableFields,
): Promise<TrainingGoal> {
  const update: Record<string, unknown> = {}
  if (fields.event_name !== undefined) update.event_name = fields.event_name.trim()
  if (fields.event_date !== undefined) update.event_date = fields.event_date
  if (fields.event_start_time !== undefined) update.event_start_time = fields.event_start_time || null
  if (fields.event_type !== undefined) update.event_type = fields.event_type
  if (fields.location !== undefined) update.location = (fields.location ?? '').trim() || null
  if (fields.distance_label !== undefined) update.distance_label = (fields.distance_label ?? '').trim() || null
  if (fields.elevation_label !== undefined) update.elevation_label = (fields.elevation_label ?? '').trim() || null

  const { data, error } = await db
    .from('training_goals')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TrainingGoal
}

export async function addTrainingWeek(
  userId: string,
  weekStart: string,                  // YYYY-MM-DD — should be a Monday
  phaseLabel: string,
  targets: {
    target_run_miles?: number | null
    target_long_run_miles?: number | null
    target_cycling_miles?: number | null
    target_strength_sessions?: number | null
  },
): Promise<TrainingWeek> {
  const { data, error } = await db
    .from('training_weeks')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      phase_label: phaseLabel,
      target_run_miles:         targets.target_run_miles ?? null,
      target_long_run_miles:    targets.target_long_run_miles ?? null,
      target_cycling_miles:     targets.target_cycling_miles ?? null,
      target_strength_sessions: targets.target_strength_sessions ?? null,
    }, { onConflict: 'user_id,week_start' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TrainingWeek
}

export async function updateTrainingActuals(
  id: string,
  actuals: Partial<Pick<TrainingWeek, 'actual_run_miles' | 'actual_cycling_miles' | 'actual_strength_sessions'>>
): Promise<void> {
  const { error } = await db.from('training_weeks').update(actuals).eq('id', id)
  if (error) throw new Error(error.message)
}
