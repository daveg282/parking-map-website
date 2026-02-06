'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminNav() {
  const pathname = usePathname()
  const { logout } = useAuth()

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/floor/1', label: 'Floor 1' },
    { href: '/admin/floor/2', label: 'Floor 2' },
    { href: '/admin/floor/3', label: 'Floor 3' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="font-bold text-xl text-blue-600">
              Parking Admin
            </div>
            
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
              target="_blank"
            >
              View Public Site →
            </Link>
            
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}