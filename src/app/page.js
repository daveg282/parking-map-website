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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* HEADER */}
        <div className="my-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Parking Garage Interactive Map
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Browse floors and click to view parking spaces
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Use ← → keys, then press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded text-xs sm:text-sm">Enter</kbd>
          </p>
        </div>

        {/* MAP CONTAINER */}
        <div className="relative bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden border border-gray-200 h-[50vh] sm:h-[60vh] md:h-[80vh]">

          {/* LEFT ARROW - MOBILE SMALLER */}
          <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={() => setCurrentFloor(f => Math.max(1, f - 1))}
              disabled={currentFloor === 1}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all
                ${currentFloor === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 sm:hover:scale-105 border-blue-200'
                }`}
              aria-label="Previous floor"
            >
              <span className="text-lg sm:text-xl">←</span>
            </button>
          </div>

          {/* RIGHT ARROW - MOBILE SMALLER */}
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={() => setCurrentFloor(f => Math.min(17, f + 1))}
              disabled={currentFloor === 17}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all
                ${currentFloor === 17
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 sm:hover:scale-105 border-blue-200'
                }`}
              aria-label="Next floor"
            >
              <span className="text-lg sm:text-xl">→</span>
            </button>
          </div>

          {/* FLOOR INDICATOR - RESPONSIVE */}
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm">
            <div className="bg-white/95 backdrop-blur rounded-lg sm:rounded-xl shadow px-3 sm:px-4 md:px-6 py-2 sm:py-3 border border-blue-100">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 justify-between">
                <div className="text-center min-w-[80px] sm:min-w-[100px]">
                  <div className="text-xs sm:text-sm tracking-widest text-gray-500">FLOOR</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">{currentFloor}</div>
                </div>
                <div className="h-8 sm:h-10 w-px bg-blue-200"></div>
                <div className="text-xs sm:text-sm md:text-base text-gray-600 flex-1 text-right sm:text-left">
                  Tap to view<br />parking spaces
                </div>
              </div>
            </div>
          </div>

          {/* IMAGE */}
          <div className="absolute inset-0 top-20 lg:top-0">
            <BackgroundImage floor={currentFloor} />
          </div>

          {/* CTA OVERLAY - RESPONSIVE */}
          <button
            onClick={() => goToFloor(currentFloor)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/20 active:bg-black/30 transition-all"
            aria-label={`View parking spaces on floor ${currentFloor}`}
          >
            <div className="bg-black/80 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base md:text-lg font-medium transition-transform active:scale-95 sm:hover:scale-105">
              <span className="hidden sm:inline">View parking spaces </span>
              <span className="sm:hidden">View spots </span>
              <span className="hidden xs:inline">→</span>
            </div>
          </button>
        </div>

        {/* FLOOR DOTS - RESPONSIVE */}
        <div className="mt-4 sm:mt-6 md:mt-8 px-2 overflow-x-auto">
          <div className="flex justify-center space-x-1 sm:space-x-2 min-w-max mx-auto">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(floor => (
              <button
                key={floor}
                onClick={() => setCurrentFloor(floor)}
                className={`rounded-full transition-all flex-shrink-0
                  ${currentFloor === floor
                    ? 'bg-blue-600 w-8 sm:w-10 md:w-12 h-2 sm:h-2.5'
                    : 'bg-gray-300 hover:bg-gray-400 w-4 sm:w-6 md:w-8 h-2 sm:h-2.5'
                  }`}
                aria-label={`Go to floor ${floor}`}
              />
            ))}
          </div>
        </div>

        {/* MOBILE INSTRUCTIONS */}
        <div className="mt-4 sm:hidden text-center">
          <p className="text-xs text-gray-500">
            Swipe or tap arrows to navigate floors
          </p>
        </div>

       

      </div>
    </div>
  )
}