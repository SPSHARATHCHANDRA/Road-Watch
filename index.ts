import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { demoService } from './demoService'
import { createSupabaseService } from './supabaseService'
import type { DataService } from './types'

export const dataService: DataService = supabase ? createSupabaseService(supabase) : demoService
export const isDemoMode = !isSupabaseConfigured
export { resetDemoData } from './demoService'
export type { DataService } from './types'
