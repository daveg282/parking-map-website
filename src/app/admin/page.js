// This is now the admin dashboard (protected)
'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user } = useAuth()

  const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email}
        </p>
      </div>

      {/* Floor Navigation */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Manage Floors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {floors.map(floor => (
            <Link
              key={floor}
              href={`/admin/floor/${floor}`}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Floor {floor}</h3>
                  <p className="text-sm text-gray-500 mt-1">Edit parking layout</p>
                </div>
                <span className="text-blue-600 text-xl">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}