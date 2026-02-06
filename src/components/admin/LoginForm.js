'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
          shouldCreateUser: false, // ← CRITICAL: Prevent new signups
        },
      })

      if (error) {
        // Check if error is because user doesn't exist
        if (error.message.includes('not found') || error.message.includes('not exist')) {
          throw new Error('Email not registered as admin')
        }
        throw error
      }
      
      setMessage('✅ Check your email for the login link!')
      setEmail('')
      
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Admin Login
          </h2>
          <p className="mt-2 text-gray-600 text-center">
            Enter your registered admin email
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
            />
       
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending magic link...' : 'Send Magic Link'}
          </button>

          <div className="text-center text-sm text-gray-500">
            <p>Only pre-registered admin emails will receive links</p>
            <p className="mt-1 text-xs">Contact system administrator for access</p>
          </div>
        </form>
      </div>
    </div>
  )
}