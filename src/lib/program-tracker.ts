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
}

const DAYS_PER_WEEK = 4

const WORKOUT_TITLES: Record<string, Record<number, Record<number, string>>> = {
  'Total Strength': {
    1: {
      1: 'Total Strength · W1D1 · Full Body',
      2: 'Total Strength · W1D2 · Upper Body',
      3: 'Total Strength · W1D3 · Lower Body',
      4: 'Total Strength · W1D4 · Full Body',
    },
    2: {
      1: 'Total Strength · W2D1 · Full Body',
      2: 'Total Strength · W2D2 · Upper Body',
      3: 'Total Strength · W2D3 · Lower Body',
      4: 'Total Strength · W2D4 · Full Body',
    },
    3: {
      1: 'Total Strength · W3D1 · Full Body',
      2: 'Total Strength · W3D2 · Upper Body',
      3: 'Total Strength · W3D3 · Lower Body',
      4: 'Total Strength · W3D4 · Full Body',
    },
    4: {
      1: 'Total Strength · W4D1 · Full Body',
      2: 'Total Strength · W4D2 · Upper Body',
      3: 'Total Strength · W4D3 · Lower Body',
      4: 'Total Strength · W4D4 · Full Body',
    },
  },
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

export async function advanceProgram(userId: string): Promise<void> {
  const program = await getProgram(userId)
  if (!program) return

  const totalWeeks = program.total_weeks ?? 4
  let nextWeek = program.current_week
  let nextDay = program.current_day + 1

  if (nextDay > DAYS_PER_WEEK) {
    nextDay = 1
    nextWeek++
  }

  if (nextWeek > totalWeeks) {
    await db.from('program_tracker').update({ active: false }).eq('id', program.id)
    return
  }

  const nextTitle =
    WORKOUT_TITLES[program.program_name]?.[nextWeek]?.[nextDay] ??
    `${program.program_name} · W${nextWeek}D${nextDay}`

  await db.from('program_tracker').update({
    current_week: nextWeek,
    current_day: nextDay,
    next_workout_title: nextTitle,
    last_completed_date: new Date().toISOString().substring(0, 10),
  }).eq('id', program.id)
}
