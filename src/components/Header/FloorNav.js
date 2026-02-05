export default function FloorNav({ floors, currentFloor, onFloorChange, mobile = false }) {
  const baseClasses = mobile 
    ? "flex flex-col space-y-2"
    : "flex space-x-2"

  return (
    <div className={baseClasses}>
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => onFloorChange(floor.id)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            currentFloor === floor.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          } ${mobile ? 'text-left' : 'text-center'}`}
        >
          <div className="flex items-center space-x-2">
            <span className="font-medium">{floor.name}</span>
            <span className={`w-2 h-2 rounded-full ${
              floor.available > 20 ? 'bg-green-500' :
              floor.available > 10 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></span>
            <span className="text-xs opacity-75">{floor.available} available</span>
          </div>
        </button>
      ))}
    </div>
  )
}