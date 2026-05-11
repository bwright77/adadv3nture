import { supabase } from './supabase'

export interface BriefingProfile {
  identity?: string
  current_focus?: string
  health_context?: string[]
  goals?: string[]
  tone_notes?: string[]
  weekend_identity?: string
}

export async function getBriefingProfile(userId: string): Promise<BriefingProfile> {
  const { data } = await supabase
    .from('users')
    .select('briefing_profile')
    .eq('id', userId)
    .maybeSingle() as unknown as { data: { briefing_profile: BriefingProfile } | null }
  return data?.briefing_profile ?? {}
}

export async function updateBriefingProfile(userId: string, profile: BriefingProfile): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('users')
    .update({ briefing_profile: profile })
    .eq('id', userId)
}
