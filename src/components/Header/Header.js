'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function Header() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const isHomePage = pathname === '/'
  const isFloorPage = pathname.startsWith('/floor/')
  const isLoginPage = pathname === '/login'
  const isAdminPage = pathname.startsWith('/admin')

  // Show header on ALL pages including admin
  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button  className="text-lg  font-bold text-blue-600 hover:text-blue-700">
               The Republic Interactive Parking Map
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Home Navigation */}
              <Link
              href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isHomePage
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Home
              </Link>
              
              {/* Floor Navigation */}
              <button
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isFloorPage
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                View Parking
              </button>
              
              {/* Admin Link (only when logged in) */}
              {user && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isAdminPage
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right side: Login/Logout */}
          <div className="flex items-center">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-4 ">
            
                <button
                  onClick={() => {
                    // Simple logout
                    localStorage.removeItem('supabase-user')
                    localStorage.removeItem('supabase-auth-token')
                    window.location.href = '/'
                  }}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden border-t border-gray-200 mt-2 pt-2">
          <div className="flex space-x-4">
            <button
              className={`flex-1 text-center pb-2 ${
                isHomePage ? 'border-b-2 border-blue-500' : ''
              }`}
            >
              <span className={`text-sm font-medium ${
                isHomePage ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Home
              </span>
            </button>
            
            <button
              className={`flex-1 text-center pb-2 ${
                isFloorPage ? 'border-b-2 border-blue-500' : ''
              }`}
            >
              <span className={`text-sm font-medium ${
                isFloorPage ? 'text-gray-900' : 'text-gray-500'
              }`}>
                View Parking
              </span>
            </button>
            
            {user && (
              <Link
                href="/admin"
                className={`flex-1 text-center pb-2 ${
                  isAdminPage ? 'border-b-2 border-blue-500' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  isAdminPage ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Admin
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}