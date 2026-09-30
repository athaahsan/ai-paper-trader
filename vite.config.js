import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const publicKey = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim()
  if (publicKey && !publicKey.startsWith('sb_publishable_')) {
    let role
    try {
      const parts = publicKey.split('.')
      if (parts.length === 3) {
        role = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))).role
      }
    } catch { /* Malformed keys are rejected below. */ }
    if (role !== 'anon') throw new Error('Use a Supabase publishable or anon key for the frontend. Private API keys must never be bundled.')
  }
  return {
    plugins: [react()],
    // Disable automatic VITE_* exposure; explicitly publish only our two settings.
    envPrefix: [],
    // Only these two public values are included in the browser bundle.
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ''),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(publicKey),
    },
  }
})
