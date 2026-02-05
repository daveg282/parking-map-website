'use client'

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base sm:text-lg">P</span>
            </div>
            
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                Parking Garage Map
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Interactive Viewer
              </p>
            </div>
          </div>
          
          {/* Contact Badge */}
          <div className="flex items-center">
            <div className="hidden sm:block bg-blue-50 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a 
                    href="tel:+15551234567" 
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    (555) 123-4567
                  </a>
                </div>
                
                <div className="h-4 w-px bg-gray-300"></div>
                
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Hours:</span> 8AM-6PM
                </div>
              </div>
            </div>
            
            {/* Mobile Contact Button */}
            <div className="sm:hidden">
              <a 
                href="tel:+15551234567"
                className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                aria-label="Call Parking Office"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}