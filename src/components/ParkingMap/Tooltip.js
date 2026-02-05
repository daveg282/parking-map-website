'use client'

import { useEffect, useState } from 'react'

export default function Tooltip({ space, position }) {
  const [tooltipStyle, setTooltipStyle] = useState({ opacity: 0 })

  useEffect(() => {
    // Position tooltip near cursor but keep it in viewport
    const x = Math.min(position.x, window.innerWidth - 300)
    const y = Math.min(position.y + 20, window.innerHeight - 150)
    
    setTooltipStyle({
      left: `${x}px`,
      top: `${y}px`,
      opacity: 1,
    })
  }, [position])

  if (!space) return null

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] pointer-events-none transition-opacity duration-200"
      style={tooltipStyle}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900">Space {space.number}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          space.assignment?.monthly 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {space.assignment?.monthly ? 'Monthly' : space.assignment ? 'Temporary' : 'Available'}
        </span>
      </div>
      
      {space.assignment ? (
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-600">Parker</p>
            <p className="font-medium">{space.assignment.parkerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Company</p>
            <p className="font-medium">{space.assignment.company}</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">Click for more details</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-gray-500">Available for assignment</p>
        </div>
      )}
    </div>
  )
}