'use client'

export default function MapContainer({ floor, onFloorChange }) {
  // Navigation functions
  const goToPreviousFloor = () => floor > 1 && onFloorChange(floor - 1)
  const goToNextFloor = () => floor < 17 && onFloorChange(floor + 1)

  return (
    <div className="relative bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      
      {/* Navigation Arrows */}
      {floor > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToPreviousFloor()
          }}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30
                   w-10 h-10 sm:w-12 sm:h-12 
                   bg-white/90 rounded-full shadow-lg border border-gray-200
                   flex items-center justify-center
                   hover:bg-white hover:shadow-xl hover:scale-105
                   active:scale-95 transition-all duration-200"
          aria-label="Previous floor"
        >
          ←
        </button>
      )}

      {floor < 17 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNextFloor()
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30
                   w-10 h-10 sm:w-12 sm:h-12 
                   bg-white/90 rounded-full shadow-lg border border-gray-200
                   flex items-center justify-center
                   hover:bg-white hover:shadow-xl hover:scale-105
                   active:scale-95 transition-all duration-200"
          aria-label="Next floor"
        >
          →
        </button>
      )}

      {/* Current Floor Display */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-xs text-gray-600">CLICK TO VIEW</div>
              <div className="text-2xl font-bold text-blue-600">Floor {floor}</div>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="text-sm text-gray-600">
              <div>Click to see</div>
              <div className="text-xs text-gray-500">parking details</div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image Container - Entire area is clickable */}
      <div className="cursor-pointer relative" style={{ minHeight: '600px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🏢</div>
            <p className="text-lg font-medium text-gray-700">Floor {floor}</p>
            <p className="text-sm text-gray-500 mt-2">Click to view interactive parking spaces</p>
          </div>
        </div>
        
        {/* Click instruction overlay */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
          Click anywhere to view parking details →
        </div>
      </div>
    </div>
  )
}