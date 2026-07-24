import { createClient } from '@supabase/supabase-js'

// Safe to have these values here — the anon key is meant to be public.
// Actual access control happens at the database level via the Row Level
// Security policies set up on the `user_stats` table, not by hiding this key.
const SUPABASE_URL = 'https://ynigawtnwzjkcqobcatk.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaWdhd3Rud3pqa2Nxb2JjYXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjI0ODAsImV4cCI6MjEwMDM5ODQ4MH0.M_wcib0cHoC8RtxytUxzhcgE_5hAXYdv_1fNfIKmjXQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
