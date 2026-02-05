export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-black">
      <h4 className="font-bold text-gray-900 mb-3">Legend</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-400 rounded mr-3 border border-gray-300"></div>
          <span>Available / Unassigned</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-3 border border-gray-300"></div>
          <span>Monthly Parker</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-400 rounded mr-3 border border-gray-300"></div>
          <span>Temporary Assignment</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-3 border border-gray-300"></div>
          <span>Reserved / Restricted</span>
        </div>
      </div>
    </div>
  )
}