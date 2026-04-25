import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(url, key)
}

export function createRouteClient() {
  const cookieStore = cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

export function createAdminClient() {
  const { createClient: c } = require('@supabase/supabase-js')
  return c(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export const createServerSupabaseClient = createClient
