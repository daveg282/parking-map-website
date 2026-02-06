import { createClient } from '@supabase/supabase-js'

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

let supabase

try {
  // Only initialize on the client side during build
  if (typeof window === 'undefined') {
    console.log('🚀 Server-side build detected - skipping Supabase initialization')
    
    // Minimal dummy client for server-side rendering during build
    supabase = {
      auth: {
        signOut: () => Promise.resolve(),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithOtp: () => Promise.resolve({ data: null, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
      })
    }
  } else {
    // Client-side initialization
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('🔄 Supabase Config:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl?.substring(0, 30) + '...'
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables')
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: true,
        flowType: 'implicit',
        storage: {
          getItem: (key) => {
            console.log('📥 Storage GET:', key)
            const item = localStorage.getItem(key)
            console.log('📥 Storage item:', item?.substring(0, 50) + '...')
            return item
          },
          setItem: (key, value) => {
            console.log('📤 Storage SET:', key, value?.substring(0, 50) + '...')
            localStorage.setItem(key, value)
          },
          removeItem: (key) => {
            console.log('🗑️ Storage REMOVE:', key)
            localStorage.removeItem(key)
          }
        }
      }
    })
  }
} catch (error) {
  console.error('❌ Error initializing Supabase:', error)
  
  // Minimal fallback for build
  supabase = {
    auth: {
      signOut: () => Promise.resolve(),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithOtp: () => Promise.resolve({ data: null, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
    })
  }
}

export { supabase }