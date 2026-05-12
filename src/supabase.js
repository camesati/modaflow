import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igxpfemzoiiltjsiowif.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneHBmZW16b2lpbHRqc2lvd2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDczOTksImV4cCI6MjA5NDE4MzM5OX0.rn1bJZxxKEqb99JF6kd8aiBc1Wn0Wc0wEUu-eDXk6L0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
