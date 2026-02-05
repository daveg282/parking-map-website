'use client'

import { useState, useEffect, useRef } from 'react'

export default function FloorDropdown({ currentFloor, onFloorChange, mobile = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  // Example floors data - could come from API
  const floors = [
    { id: 1, name: 'Ground Floor', label: 'G' },
    { id: 2, name: 'First Floor', label: '1' },
    { id: 3, name: 'Second Floor', label: '2' },
    { id: 4, name: 'Third Floor', label: '3' },
    { id: 5, name: 'Fourth Floor', label: '4' },
    { id: 6, name: 'Fifth Floor', label: '5' },
    { id: 7, name: 'Sixth Floor', label: '6' },
    { id: 8, name: 'Seventh Floor', label: '7' },
    { id: 9, name: 'Roof Level', label: 'R' },
  ]

  const currentFloorInfo = floors.find(f => f.id === currentFloor)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Responsive floor display
  const getFloorDisplay = () => {
    if (mobile) {
      return currentFloorInfo?.name || `Floor ${currentFloor}`
    }
    
    // Desktop - responsive based on screen width
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        return currentFloorInfo?.label || currentFloor
      } else if (window.innerWidth < 768) {
        return `F${currentFloor}`
      } else {
        return currentFloorInfo?.name || `Floor ${currentFloor}`
      }
    }
    
    return currentFloorInfo?.name || `Floor ${currentFloor}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between
          w-full sm:w-auto
          ${mobile 
            ? 'px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700' 
            : 'px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200'
          }
          ${isOpen ? (mobile ? 'border-blue-500 ring-1 ring-blue-500' : 'bg-blue-100') : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-3">
          {/* Floor Icon */}
          <div className={`flex items-center justify-center w-6 h-6 rounded ${
            mobile ? 'bg-blue-100 text-blue-600' : 'bg-white text-blue-600'
          }`}>
            <span className="text-sm font-semibold">F</span>
          </div>
          
          {/* Floor Text */}
          <div className="text-left">
            <div className="font-medium text-sm">
              {getFloorDisplay()}
            </div>
            <div className="text-xs text-gray-500 hidden sm:block">
              {floors.length} floors
            </div>
          </div>
        </div>
        
        {/* Chevron Icon */}
        <svg 
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`
          absolute z-50 mt-1 
          ${mobile 
            ? 'left-0 right-0 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg' 
            : 'right-0 min-w-[200px] sm:min-w-[240px] bg-white rounded-lg shadow-xl border border-gray-100 max-h-80 overflow-y-auto'
          }
        `}>
          {/* Header */}
          <div className="sticky top-0 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Select Floor
            </p>
          </div>
          
          {/* Floor List */}
          <div className="py-1">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => {
                  onFloorChange(floor.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full text-left px-4 py-3 
                  flex items-center justify-between
                  hover:bg-blue-50 active:bg-blue-100
                  transition-colors duration-150
                  ${currentFloor === floor.id 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-700'
                  }
                  ${mobile ? 'text-sm' : ''}
                `}
              >
                <div className="flex items-center space-x-3">
                  {/* Floor Number Badge */}
                  <div className={`
                    w-7 h-7 rounded flex items-center justify-center text-sm font-semibold
                    ${currentFloor === floor.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {floor.label}
                  </div>
                  
                  {/* Floor Name */}
                  <span>{floor.name}</span>
                </div>
                
                {/* Current Floor Indicator */}
                {currentFloor === floor.id && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-4 py-2.5 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              <span className="font-medium">{floors.length}</span> floors total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}