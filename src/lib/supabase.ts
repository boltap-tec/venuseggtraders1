import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Dual-mode: if the two env vars are present the app runs on Supabase (real
// auth + cloud data). Otherwise it stays in local/demo mode (localStorage).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null

export const isCloud = !!supabase
