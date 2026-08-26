import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types/database.types'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

const isConfigured =
  (SUPABASE_URL.startsWith('https://') ||
    SUPABASE_URL.startsWith('http://127.0.0.1') ||
    SUPABASE_URL.startsWith('http://localhost')) &&
  !SUPABASE_URL.includes('your-project') &&
  SUPABASE_ANON_KEY.length > 10

// Browser (Client Component) ortamı için Supabase client
export function createClient() {
  if (!isConfigured) {
    throw new Error(
      'Supabase henüz yapılandırılmadı. apps/dashboard/.env.local dosyasına NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini girin.'
    )
  }
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export { isConfigured as isSupabaseConfigured }
