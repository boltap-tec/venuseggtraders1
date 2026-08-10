import { supabase } from './supabase'
import type { Database } from './types'

// The whole app state is stored as one JSON document per user in the
// `workspaces` table (row-level security ties each row to auth.uid()).
// This keeps all existing business logic unchanged while giving cloud sync.

export async function pullState(userId: string): Promise<Database | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('workspaces').select('data').eq('user_id', userId).maybeSingle()
  if (error) {
    console.error('[supabase] pull failed:', error.message)
    return null
  }
  return (data?.data as Database) ?? null
}

export async function pushState(userId: string, db: Database): Promise<string | null> {
  if (!supabase) return 'not-configured'
  const { error } = await supabase
    .from('workspaces')
    .upsert({ user_id: userId, data: db, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) {
    console.error('[supabase] push failed:', error.message)
    return error.message
  }
  return null
}
