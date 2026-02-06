import { supabase } from './supabase'

// Check if user is admin
export async function isUserAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Check if user exists in admin_users table
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()
    
    return !error && data !== null
  } catch (error) {
    console.error('Auth check error:', error)
    return false
  }
}

// Login with email magic link
export async function loginAdmin(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
    },
  })
  
  if (error) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// Logout
export async function logoutAdmin() {
  await supabase.auth.signOut()
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}