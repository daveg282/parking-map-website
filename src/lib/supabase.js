import { createClient } from '@supabase/supabase-js'

let supabase

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔄 Supabase Config:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    url: supabaseUrl?.substring(0, 30) + '...'
  })

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Missing Supabase environment variables - using dummy client for build')
    
    // Create a dummy client for build time
    supabase = {
      auth: {
        signOut: () => Promise.resolve(),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => Promise.resolve({ data: [], error: null }),
        delete: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        single: () => Promise.resolve({ data: null, error: null })
      }),
      channel: () => ({
        subscribe: () => ({})
      })
    }
  } else {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: true,
        flowType: 'implicit',
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
  }
} catch (error) {
  console.error('❌ Error initializing Supabase:', error)
  
  // Fallback to dummy client
  supabase = {
    auth: {
      signOut: () => Promise.resolve(),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
      single: () => Promise.resolve({ data: null, error: null })
    }),
    channel: () => ({
      subscribe: () => ({})
    })
  }
}

export { supabase }