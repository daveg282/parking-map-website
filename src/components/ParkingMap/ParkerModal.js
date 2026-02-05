'use client'

export default function ParkerModal({ space, isOpen, onClose }) {
  if (!isOpen || !space) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Parking Space {space.number}</h2>
            <p className="text-gray-500">Floor {space.floor} • {space.type || 'Standard'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {space.assignment ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className={`p-4 rounded-lg ${
                space.assignment.monthly 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Assignment Type</p>
                    <p className={`font-bold ${
                      space.assignment.monthly ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      {space.assignment.monthly ? 'Monthly Parker' : 'Temporary Assignment'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Since</p>
                    <p className="font-medium">
                      {new Date(space.assignment.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parker Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Parker Name</p>
                  <p className="text-lg font-semibold">{space.assignment.parkerName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Company</p>
                  <p className="text-lg font-semibold">{space.assignment.company}</p>
                </div>

                {space.assignment.contactEmail && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Contact Email</p>
                    <p className="text-lg text-blue-600">{space.assignment.contactEmail}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">
                      {new Date(space.assignment.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  {space.assignment.endDate && (
                    <div>
                      <p className="text-sm text-gray-600">End Date</p>
                      <p className="font-medium">
                        {new Date(space.assignment.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🅿️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Available Space</h3>
              <p className="text-gray-600 mb-4">
                This parking space is currently available for assignment.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">
                  Contact the parking administration team for assignment requests.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}