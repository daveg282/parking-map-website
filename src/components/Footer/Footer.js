export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <span className="font-bold">P</span>
              </div>
              <div>
                <p className="text-xl font-bold">The Republic Digital Parking Map</p>
                <p className="text-gray-400 text-sm">Interactive Parking Viewer</p>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Vend Park Inc.
            </p>
          
          </div>
        </div>
        
        
      </div>
    </footer>
  )
}