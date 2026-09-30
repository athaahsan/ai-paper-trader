import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.SUPABASE_URL?.trim()
const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY?.trim()

function configProblem() {
  if (!url || !key) return 'missing'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) return 'invalid-url'
  if (key.startsWith('sb_publishable_')) return null
  if (key.startsWith('sb_secret_')) return 'private-key'
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'anon' ? null : 'private-key'
  } catch { return 'invalid-key' }
}

export const configurationError = configProblem()
export const supabase = configurationError ? null : createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export const SESSION_TABLE = 'ai_paper_trader_sessions'
export const RUN_TABLE = 'ai_paper_trader_runs'
