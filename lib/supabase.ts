import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(url, key)
}

export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient: c } = require('@supabase/supabase-js')
  return c(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export const createServerSupabaseClient = createClient
