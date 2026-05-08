import { supabase } from './supabase'

export interface InboxItem {
  id: string
  user_id: string
  content: string
  captured_at: string
  processed: boolean
}

export async function addInboxItem(userId: string, content: string): Promise<InboxItem> {
  const { data, error } = await supabase
    .from('inbox_items')
    .insert({ user_id: userId, content: content.trim() })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as InboxItem
}

export async function getInboxItems(userId: string): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', false)
    .order('captured_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InboxItem[]
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await supabase.from('inbox_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markProcessed(id: string): Promise<void> {
  const { error } = await supabase
    .from('inbox_items')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
