import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// Create axios instance for read-only calls
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// CLIENT ONLY - READ ONLY API FUNCTIONS
export async function fetchParkingData(floor) {
  try {
    // In development, use mock data
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
      return getMockParkingData(floor)
    }
    
    const response = await api.get(`/parking/floors/${floor}`)
    return response.data
  } catch (error) {
    console.error('Error fetching parking data:', error)
    // Return mock data as fallback
    return getMockParkingData(floor)
  }
}

// Mock data for development
function getMockParkingData(floor) {
  const mockSpaces = []
  
  // Generate mock parking spaces
  for (let i = 1; i <= 50; i++) {
    const spaceId = `${floor}${i.toString().padStart(3, '0')}`
    const hasAssignment = Math.random() > 0.3
    const isMonthly = hasAssignment && Math.random() > 0.5
    
    mockSpaces.push({
      id: spaceId,
      number: i.toString(),
      floor: parseInt(floor),
      type: i <= 5 ? 'handicap' : 'standard',
      status: hasAssignment ? 'occupied' : 'available',
      assignment: hasAssignment ? {
        parkerName: isMonthly ? `Monthly Parker ${i}` : `Temporary Parker ${i}`,
        company: isMonthly ? `Company ${Math.floor(i/10) + 1}` : 'Visitor',
        monthly: isMonthly,
        startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: isMonthly ? null : new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        contactEmail: isMonthly ? `parker${i}@company.com` : null
      } : null,
      lastUpdated: new Date().toISOString()
    })
  }
  
  return {
    floor: parseInt(floor),
    totalSpaces: 50,
    availableSpaces: mockSpaces.filter(s => !s.assignment).length,
    monthlyParkers: mockSpaces.filter(s => s.assignment?.monthly).length,
    spaces: mockSpaces
  }
}

// Search function (read-only)
export async function searchParker(searchTerm) {
  try {
    const response = await api.get('/parking/search', {
      params: { q: searchTerm }
    })
    return response.data
  } catch (error) {
    console.error('Error searching parker:', error)
    return { results: [] }
  }
}