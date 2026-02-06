import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔄 Supabase Config:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  url: supabaseUrl?.substring(0, 30) + '...'
})

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false, // CHANGE THIS
    persistSession: false,   // CHANGE THIS - disable persistence
    detectSessionInUrl: true,
    flowType: 'implicit',    // CHANGE TO IMPLICIT
    storage: {
      getItem: (key) => {
        console.log('📥 Storage GET:', key)
        if (typeof window !== 'undefined') {
          const item = localStorage.getItem(key)
          console.log('📥 Storage item:', item?.substring(0, 50) + '...')
          return item
        }
        return null
      },
      setItem: (key, value) => {
        console.log('📤 Storage SET:', key, value?.substring(0, 50) + '...')
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value)
        }
      },
      removeItem: (key) => {
        console.log('🗑️ Storage REMOVE:', key)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key)
        }
      }
    }
  }
})

export { supabase }