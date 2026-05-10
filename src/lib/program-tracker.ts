import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface ProgramState {
  id: string
  program_name: string
  instructor: string | null
  current_week: number
  current_day: number
  total_weeks: number | null
  next_workout_title: string | null
  next_workout_type: string | null
  next_workout_url: string | null
  last_completed_date: string | null
  started_at: string | null
  image_url: string | null
}

// Per-program schedule: how many main workouts per week, and what type each day is.
// "Weeks" are defined by workout count, not calendar days. Recovery days / warm-ups /
// stretches are excluded by the > 10 min duration filter in syncProgramFromStrava.
interface ProgramSchedule {
  workoutsPerWeek: number[]
  dayLabels: Record<number, Record<number, string>>
}

const SCHEDULES: Record<string, ProgramSchedule> = {
  'Total Strength': {
    workoutsPerWeek: [3, 3, 4, 4],
    dayLabels: {
      1: { 1: 'Upper Body', 2: 'Lower Body', 3: 'Full Body' },
      2: { 1: 'Upper Body', 2: 'Lower Body', 3: 'Full Body' },
      3: { 1: 'Full Body',  2: 'Upper Body', 3: 'Lower Body', 4: 'Full Body' },
      4: { 1: 'Full Body',  2: 'Upper Body', 3: 'Lower Body', 4: 'Full Body' },
    },
  },
}

function getTitle(programName: string, week: number, day: number): string {
  const label = SCHEDULES[programName]?.dayLabels[week]?.[day]
  return label
    ? `${programName} · W${week}D${day} · ${label}`
    : `${programName} · W${week}D${day}`
}

// Converts a completed-session count to the next {week, day} position.
// Returns null when the program is complete.
function nextPosition(programName: string, sessionsCompleted: number): { week: number; day: number } | null {
  const schedule = SCHEDULES[programName]
  if (!schedule) {
    // Generic fallback: 4 workouts/week
    const week = Math.floor(sessionsCompleted / 4) + 1
    const day  = (sessionsCompleted % 4) + 1
    return { week, day }
  }
  let remaining = sessionsCompleted
  for (let w = 0; w < schedule.workoutsPerWeek.length; w++) {
    const inWeek = schedule.workoutsPerWeek[w]
    if (remaining < inWeek) return { week: w + 1, day: remaining + 1 }
    remaining -= inWeek
  }
  return null // program finished
}

function totalWorkouts(programName: string): number {
  const schedule = SCHEDULES[programName]
  return schedule
    ? schedule.workoutsPerWeek.reduce((a, b) => a + b, 0)
    : 16
}

export async function getAllPrograms(userId: string): Promise<ProgramState[]> {
  const { data } = await supabase
    .from('program_tracker')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true }) as unknown as { data: ProgramState[] | null }
  return data ?? []
}

export async function addProgram(
  userId: string,
  programName: string,
  opts?: { instructor?: string; totalWeeks?: number }
): Promise<ProgramState> {
  const schedule = SCHEDULES[programName]
  const totalWeeks = opts?.totalWeeks ?? schedule?.workoutsPerWeek.length ?? 4
  const { data, error } = await db
    .from('program_tracker')
    .insert({
      user_id: userId,
      program_name: programName,
      instructor: opts?.instructor ?? null,
      current_week: 1,
      current_day: 1,
      total_weeks: totalWeeks,
      next_workout_title: getTitle(programName, 1, 1),
      started_at: new Date().toISOString().substring(0, 10),
      active: true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProgramState
}

export async function setProgramPosition(
  id: string,
  week: number,
  day: number,
  programName: string
): Promise<void> {
  await db.from('program_tracker').update({
    current_week: week,
    current_day: day,
    next_workout_title: getTitle(programName, week, day),
  }).eq('id', id)
}

export async function deactivateProgram(id: string): Promise<void> {
  await db.from('program_tracker').update({ active: false }).eq('id', id)
}

export async function updateProgramImageUrl(id: string, imageUrl: string): Promise<void> {
  await db.from('program_tracker').update({ image_url: imageUrl.trim() || null }).eq('id', id)
}

export async function getProgram(userId: string): Promise<ProgramState | null> {
  const { data } = await supabase
    .from('program_tracker')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: ProgramState | null }
  return data
}

// Manual "✓ Done" advance — moves to the next workout in the schedule.
export async function advanceProgram(userId: string): Promise<void> {
  const program = await getProgram(userId)
  if (!program) return

  const schedule = SCHEDULES[program.program_name]
  const daysInWeek = schedule?.workoutsPerWeek[program.current_week - 1] ?? 4
  const totalWeeks = program.total_weeks ?? schedule?.workoutsPerWeek.length ?? 4

  let nextWeek = program.current_week
  let nextDay  = program.current_day + 1

  if (nextDay > daysInWeek) {
    nextDay = 1
    nextWeek++
  }

  if (nextWeek > totalWeeks) {
    await db.from('program_tracker').update({ active: false }).eq('id', program.id)
    return
  }

  await db.from('program_tracker').update({
    current_week: nextWeek,
    current_day: nextDay,
    next_workout_title: getTitle(program.program_name, nextWeek, nextDay),
    last_completed_date: new Date().toISOString().substring(0, 10),
  }).eq('id', program.id)
}

// Infers program position from Strava activity history.
// Counts distinct dates with a strength workout > 10 min (filters out warm-ups,
// stretches, and the 5-min test). Each distinct date = one completed session.
// Returns 1 if the DB position was updated, 0 if already current.
export async function syncProgramFromStrava(userId: string, program: ProgramState): Promise<number> {
  const startDate = program.started_at ?? program.last_completed_date
  if (!startDate) return 0

  const { data: activities } = await db
    .from('activities')
    .select('activity_date, duration_seconds')
    .eq('user_id', userId)
    .eq('source', 'strava')
    .gte('activity_date', startDate)
    .ilike('title', '%strength%')
    .gt('duration_seconds', 600)
    .order('activity_date', { ascending: true })
    .limit(200) as unknown as { data: { activity_date: string; duration_seconds: number }[] | null }

  if (!activities || activities.length === 0) return 0

  const distinctDates = [...new Set(activities.map(a => a.activity_date))].sort()
  const sessionsCompleted = distinctDates.length
  const total = totalWorkouts(program.program_name)

  if (sessionsCompleted >= total) {
    await db.from('program_tracker').update({ active: false }).eq('id', program.id)
    return 1
  }

  const next = nextPosition(program.program_name, sessionsCompleted)
  if (!next) return 0
  if (next.week === program.current_week && next.day === program.current_day) return 0

  const lastDate = distinctDates[distinctDates.length - 1]
  await db.from('program_tracker').update({
    current_week: next.week,
    current_day: next.day,
    next_workout_title: getTitle(program.program_name, next.week, next.day),
    last_completed_date: lastDate,
  }).eq('id', program.id)

  return 1
}
