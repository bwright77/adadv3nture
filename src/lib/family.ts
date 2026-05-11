import { supabase } from './supabase'

export type FamilyRole = 'self' | 'spouse' | 'child'

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  birthday: string        // YYYY-MM-DD
  emoji: string | null
  vibe: string | null
  sort_order: number
}

export async function getFamilyMembers(userId: string): Promise<FamilyMember[]> {
  const { data } = await supabase
    .from('family_members')
    .select('id, name, role, birthday, emoji, vibe, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  return (data ?? []) as FamilyMember[]
}

// Age in whole years as of today
export function ageYears(birthday: string, on: Date = new Date()): number {
  const b = new Date(birthday + 'T12:00:00')
  let age = on.getFullYear() - b.getFullYear()
  const m = on.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) age--
  return age
}

// Fractional age to one decimal (e.g. 8.5) — useful when toddler/kid ages still matter granularly
export function ageDecimal(birthday: string, on: Date = new Date()): number {
  const b = new Date(birthday + 'T12:00:00')
  const ms = on.getTime() - b.getTime()
  const years = ms / (365.25 * 24 * 60 * 60 * 1000)
  return Math.round(years * 10) / 10
}
