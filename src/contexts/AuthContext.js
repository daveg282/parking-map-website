'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check Supabase session (for magic link auth)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Magic link session exists
          setUser(session.user)
          
          // Also save to localStorage for persistence
          localStorage.setItem('supabase-user', JSON.stringify(session.user))
          localStorage.setItem('supabase-auth-token', session.access_token)
          
          // Check if we're on login page, then redirect to /admin
          if (window.location.pathname === '/login') {
            router.push('/admin')
          }
        } else {
          // Fallback to localStorage (for password/dev auth)
          const storedUser = localStorage.getItem('supabase-user')
          const storedToken = localStorage.getItem('supabase-auth-token')
          
          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser))
            
            // Check if we're on login page, then redirect to /admin
            if (window.location.pathname === '/login') {
              router.push('/admin')
            }
          } else {
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          localStorage.setItem('supabase-user', JSON.stringify(session.user))
          localStorage.setItem('supabase-auth-token', session.access_token)
          
          // Redirect to /admin after successful sign in
          router.push('/admin')
          
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          localStorage.removeItem('supabase-user')
          localStorage.removeItem('supabase-auth-token')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const login = (email) => {
    // Development login - creates localStorage session
    const userData = {
      id: 'user-' + Date.now(),
      email: email,
      name: email.split('@')[0]
    }
    
    localStorage.setItem('supabase-user', JSON.stringify(userData))
    localStorage.setItem('supabase-auth-token', 'dev-token-' + Date.now())
    setUser(userData)
    
    // Redirect to /admin after login
    router.push('/admin')
    
    return { success: true }
  }

  const logout = async () => {
    // Sign out from Supabase if magic link was used
    await supabase.auth.signOut()
    
    // Clear localStorage
    localStorage.removeItem('supabase-user')
    localStorage.removeItem('supabase-auth-token')
    
    // Clear state
    setUser(null)
    
    // Redirect to home
    router.push('/')
  }

  const value = {
    user,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}