'use client'

import { useState, useEffect } from 'react'

export default function BackgroundImage({ floor }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imagePath, setImagePath] = useState('')

  // CORRECTED: Use your actual file naming pattern
  const getImagePath = (floorNum) => {
    // Your files are: parking_page-0001.jpg, parking_page-0002.jpg, etc.
    const paddedFloor = floorNum.toString().padStart(4, '0')
    return `/maps/parking_page-${paddedFloor}.png`
  }

  // Update image path when floor changes
  useEffect(() => {
    const path = getImagePath(floor)
    console.log('🔄 Loading floor image:', path)
    setImagePath(path)
    setImageLoaded(false)
    setImageError(false)
  }, [floor])

  // Handle image load
  const handleImageLoad = () => {
    console.log('✅ Image loaded:', imagePath)
    setImageLoaded(true)
    setImageError(false)
  }

  // Handle image error
  const handleImageError = () => {
    console.error('❌ Failed to load image:', imagePath)
    setImageError(true)
    setImageLoaded(false)
  }

  // Get floor display name
  const getFloorName = () => {
    return `Floor ${floor}`
  }

  return (
    <div className="relative w-full" style={{ minHeight: '600px' }}>
      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🏢</div>
            <p className="text-gray-600">Loading {getFloorName()}...</p>
            <p className="text-xs text-gray-500 mt-2">Loading: {imagePath}</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-5xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Image Not Found</h3>
            <p className="text-gray-600 mb-2">{getFloorName()}</p>
            <p className="text-sm text-gray-500 mb-4">
              File not found: <code>{imagePath}</code>
            </p>
            <div className="bg-white/70 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Expected file location:</p>
              <code className="bg-gray-800 text-white px-2 py-1 rounded">
                public/maps/parking_page-{floor.toString().padStart(4, '0')}.jpg
              </code>
            </div>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={imagePath}
        alt={`${getFloorName()} Parking Map`}
        className={`w-full h-auto object-contain rounded-lg ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ maxHeight: '600px' }}
      />
      
      {/* Debug info */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        Floor {floor} | File: parking_page-{floor.toString().padStart(4, '0')}.png
      </div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none rounded-lg"></div>
    </div>
  )
}