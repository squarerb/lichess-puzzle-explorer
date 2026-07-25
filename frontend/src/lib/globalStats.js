import { supabase } from './supabaseClient'

export async function fetchGlobalStats() {
  const { data, error } = await supabase.rpc('get_global_stats')
  if (error) throw error
  // RPC returns an array with one row
  return data?.[0] ?? null
}
