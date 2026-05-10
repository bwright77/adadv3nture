import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type ProjectCategory = 'art' | 'software' | 'home' | 'career' | 'other'
export type ProjectStatus = 'active' | 'complete' | 'paused' | 'dead'

export interface Project {
  id: string
  user_id: string
  title: string
  description: string | null
  category: ProjectCategory
  deadline_date: string | null
  soft_deadline_date: string | null
  progress_pct: number
  next_action: string | null
  status: ProjectStatus
  image_url: string | null
  created_at: string
}

export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  done: boolean
  done_at: string | null
  sort_order: number
}

export interface ProjectUpdate {
  id: string
  project_id: string
  note: string
  created_at: string
}

export interface ProjectContact {
  id: string
  project_id: string
  name: string
  title: string | null
  relationship_note: string | null
  sort_order: number
}

export async function getProjects(userId: string, category?: ProjectCategory): Promise<Project[]> {
  let q = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'complete')
    .order('deadline_date', { ascending: true })
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as Project[]
}

export async function getProjectWithMilestones(
  projectId: string
): Promise<{ project: Project; milestones: ProjectMilestone[]; updates: ProjectUpdate[]; contacts: ProjectContact[] }> {
  const [pRes, mRes, uRes, cRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_milestones').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_updates').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
    supabase.from('project_contacts').select('*').eq('project_id', projectId).order('sort_order'),
  ])
  if (pRes.error) throw new Error(pRes.error.message)
  return {
    project: pRes.data as Project,
    milestones: (mRes.data ?? []) as ProjectMilestone[],
    updates: (uRes.data ?? []) as ProjectUpdate[],
    contacts: (cRes.data ?? []) as ProjectContact[],
  }
}

export async function addContact(
  projectId: string,
  name: string,
  title?: string,
  relationship_note?: string,
): Promise<ProjectContact> {
  const { data: existing } = await supabase.from('project_contacts').select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1)
  const nextOrder = ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1
  const { data, error } = await db
    .from('project_contacts')
    .insert({ project_id: projectId, name, title: title ?? null, relationship_note: relationship_note ?? null, sort_order: nextOrder })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectContact
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await db.from('project_contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateProjectProgress(id: string, progress_pct: number): Promise<void> {
  const { error } = await db.from('projects').update({ progress_pct }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateNextAction(id: string, next_action: string): Promise<void> {
  const { error } = await db.from('projects').update({ next_action }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateProjectImageUrl(id: string, imageUrl: string): Promise<void> {
  await db.from('projects').update({ image_url: imageUrl.trim() || null }).eq('id', id)
}

export async function toggleMilestone(id: string, done: boolean): Promise<void> {
  const { error } = await db
    .from('project_milestones')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addMilestone(projectId: string, title: string, sortOrder: number): Promise<ProjectMilestone> {
  const { data, error } = await db
    .from('project_milestones')
    .insert({ project_id: projectId, title, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectMilestone
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await db.from('project_milestones').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderMilestones(updates: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      db.from('project_milestones').update({ sort_order }).eq('id', id)
    )
  )
}

export async function addUpdate(projectId: string, note: string): Promise<ProjectUpdate> {
  const { data, error } = await db
    .from('project_updates')
    .insert({ project_id: projectId, note })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectUpdate
}

export async function addProject(
  userId: string,
  title: string,
  category: ProjectCategory,
  deadline_date: string | null,
): Promise<Project> {
  const { data, error } = await db
    .from('projects')
    .insert({ user_id: userId, title, category, deadline_date })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Project
}
