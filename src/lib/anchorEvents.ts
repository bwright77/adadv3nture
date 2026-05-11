import { supabase } from './supabase'

export type AnchorSlug = 'wlw' | 'labor_day'

export interface AnchorEvent {
  id: string
  slug: AnchorSlug | string
  title: string
  event_date: string         // YYYY-MM-DD
  location: string | null
  notes: string | null
  category: string | null
}

// Fallbacks used when the DB row is missing (pre-migration or new user).
// Keeps the UI alive instead of crashing on null.
export const ANCHOR_FALLBACKS: Record<AnchorSlug, Omit<AnchorEvent, 'id'>> = {
  wlw:       { slug: 'wlw',       title: 'West Line Winder 30K', event_date: '2026-09-26', location: 'Buena Vista', notes: '18.6mi · 48th bday wknd', category: 'training' },
  labor_day: { slug: 'labor_day', title: 'Wright Adventures',    event_date: '2026-09-01', location: null,          notes: 'WA income or get a real job', category: 'career' },
}

export async function getAnchorEvent(userId: string, slug: AnchorSlug): Promise<AnchorEvent> {
  const { data } = await supabase
    .from('anchor_events')
    .select('id, slug, title, event_date, location, notes, category')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle() as unknown as { data: AnchorEvent | null }
  if (data) return data
  return { id: `fallback-${slug}`, ...ANCHOR_FALLBACKS[slug] }
}

export async function updateAnchorEvent(
  userId: string,
  slug: AnchorSlug,
  patch: Partial<Pick<AnchorEvent, 'title' | 'event_date' | 'location' | 'notes'>>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('anchor_events').upsert(
    {
      user_id: userId,
      slug,
      title: patch.title ?? ANCHOR_FALLBACKS[slug].title,
      event_date: patch.event_date ?? ANCHOR_FALLBACKS[slug].event_date,
      location: patch.location ?? null,
      notes: patch.notes ?? null,
      category: ANCHOR_FALLBACKS[slug].category,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,slug' },
  )
}

export function daysUntilDate(dateStr: string): number {
  return Math.ceil((new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86_400_000)
}
