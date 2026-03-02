import { isDemoMode } from './demo-mode.js'
import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from './supabase-mock.js'

export const supabase = isDemoMode()
  ? createDemoClient()
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
