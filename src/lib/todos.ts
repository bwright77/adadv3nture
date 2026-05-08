import { supabase } from './supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type TodoCategory = 'body' | 'career' | 'family' | 'home' | 'personal'
export type TodoEffort = 'quick' | 'half_day' | 'full_day' | 'multi_day'
export type TodoStatus = 'todo' | 'in_progress' | 'done'

export interface Todo {
  id: string
  user_id: string
  category: TodoCategory
  title: string
  notes: string | null
  weather_required: 'any' | 'dry' | 'sunny'
  effort: TodoEffort | null
  priority_order: number
  status: TodoStatus
  completed_at: string | null
  created_at: string
}

export async function getTodos(userId: string, category: TodoCategory): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .neq('status', 'done')
    .order('priority_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Todo[]
}

export async function getCompletedTodos(userId: string, category: TodoCategory): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('status', 'done')
    .order('completed_at', { ascending: false })
    .limit(10)
  if (error) throw new Error(error.message)
  return (data ?? []) as Todo[]
}

export async function addTodo(userId: string, category: TodoCategory, title: string): Promise<Todo> {
  const { data: existing } = await supabase
    .from('todos')
    .select('priority_order')
    .eq('user_id', userId)
    .eq('category', category)
    .order('priority_order', { ascending: false })
    .limit(1)

  const maxOrder = (existing?.[0] as { priority_order: number } | undefined)?.priority_order ?? -1

  const { data, error } = await db
    .from('todos')
    .insert({ user_id: userId, category, title, priority_order: maxOrder + 1, status: 'todo' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Todo
}

export async function completeTodo(id: string): Promise<void> {
  const { error } = await db
    .from('todos')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function moveTodo(id: string, direction: 'up' | 'down', todos: Todo[]): Promise<void> {
  const idx = todos.findIndex(t => t.id === id)
  if (idx < 0) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= todos.length) return

  const a = todos[idx]
  const b = todos[swapIdx]
  await Promise.all([
    db.from('todos').update({ priority_order: b.priority_order }).eq('id', a.id),
    db.from('todos').update({ priority_order: a.priority_order }).eq('id', b.id),
  ])
}
