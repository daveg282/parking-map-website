'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackgroundImage from '../components/ParkingMap/BackgroundImage'

export default function Home() {
  const [currentFloor, setCurrentFloor] = useState(1)
  const router = useRouter()

  /* =============================
     NAVIGATION
  ============================== */
  const goToFloor = (floor) => {
    router.push(`/floor/${floor}`)
  }

  /* =============================
     KEYBOARD NAVIGATION
  ============================== */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) return

      if (event.key === 'ArrowLeft' && currentFloor > 1) {
        event.preventDefault()
        setCurrentFloor(prev => prev - 1)
      }

      if (event.key === 'ArrowRight' && currentFloor < 17) {
        event.preventDefault()
        setCurrentFloor(prev => prev + 1)
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        goToFloor(currentFloor)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentFloor])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parking Garage Interactive Map
          </h1>
          <p className="text-gray-600">
            Browse floors and click to view parking spaces
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Use ← → keys, then press <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd>
          </p>
        </div>

        {/* MAP CONTAINER */}
        <div className="relative bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">

          {/* LEFT ARROW */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={() => setCurrentFloor(f => Math.max(1, f - 1))}
              disabled={currentFloor === 1}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition
                ${currentFloor === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 border-blue-200'
                }`}
            >
              ←
            </button>
          </div>

          {/* RIGHT ARROW */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={() => setCurrentFloor(f => Math.min(17, f + 1))}
              disabled={currentFloor === 17}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition
                ${currentFloor === 17
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 border-blue-200'
                }`}
            >
              →
            </button>
          </div>

          {/* FLOOR INDICATOR */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-white/95 backdrop-blur rounded-xl shadow px-6 py-3 border border-blue-100">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-xs tracking-widest text-gray-500">FLOOR</div>
                  <div className="text-3xl font-bold text-blue-600">{currentFloor}</div>
                </div>
                <div className="h-10 w-px bg-blue-200"></div>
                <div className="text-sm text-gray-600">
                  Click to view<br />parking spaces
                </div>
              </div>
            </div>
          </div>

          {/* IMAGE */}
          <BackgroundImage floor={currentFloor} />

          {/* CTA OVERLAY (ONLY THING THAT NAVIGATES) */}
          <button
            onClick={() => goToFloor(currentFloor)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/20 transition"
          >
            <div className="bg-black/80 text-white px-6 py-3 rounded-lg text-lg font-medium">
              View parking spaces →
            </div>
          </button>
        </div>

        {/* FLOOR DOTS */}
        <div className="mt-8 flex justify-center space-x-2">
          {Array.from({ length: 17 }, (_, i) => i + 1).map(floor => (
            <button
              key={floor}
              onClick={() => setCurrentFloor(floor)}
              className={`h-2 rounded-full transition-all
                ${currentFloor === floor
                  ? 'bg-blue-600 w-12'
                  : 'bg-gray-300 hover:bg-gray-400 w-8'
                }`}
              aria-label={`Floor ${floor}`}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
