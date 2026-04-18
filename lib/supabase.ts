import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — use everywhere in client components
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Admin client — use only in API routes (server-side)
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Keep this as alias for any server usage
export const createServerSupabaseClient = createClient
