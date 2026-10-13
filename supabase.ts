import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const looksConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'))

export const supabase: SupabaseClient | null = looksConfigured ? createClient(url!, anonKey!) : null

export const isSupabaseConfigured = supabase !== null
