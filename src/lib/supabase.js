import { isDemoMode } from './demo-mode.js'

let supabase

if (isDemoMode()) {
  const { createDemoClient } = await import('./supabase-mock.js')
  supabase = createDemoClient()
} else {
  const { createClient } = await import('@supabase/supabase-js')
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
}

export { supabase }
