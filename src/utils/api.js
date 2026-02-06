// utils/api.js
import { supabase } from '@/lib/supabase'

export const parkingApi = {
  // Get spots for a floor
  getSpotsByFloor: async (floorId) => {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('floor_id', floorId)
      .order('svg_y')
    
    if (error) return { data: null, error }
    
    // Map database fields to frontend naming
    const mappedData = data.map(spot => ({
      // Keep all existing properties
      ...spot,
      
      // Add clear frontend names for the 3 main fields
      company_name: spot.display_label,      // display_label = Company Name
      parker_name: spot.custom_label,        // custom_label = Parker Name  
      spot_number: spot.original_label,      // original_label = Spot Number
      
      // Keep backwards compatibility
      display_label: spot.display_label,
      custom_label: spot.custom_label,
      original_label: spot.original_label
    }))
    
    return { data: mappedData, error: null }
  },

  // Save/Update a spot
  saveSpot: async (spotData) => {
    // Map frontend names to database columns
    const dbSpot = {
      floor_id: spotData.floor_id,
      spot_identifier: spotData.spot_identifier,
      
      // Map the 3 main fields
      display_label: spotData.company_name || spotData.display_label,    // Company Name
      custom_label: spotData.parker_name || spotData.custom_label,      // Parker Name
      original_label: spotData.spot_number || spotData.original_label,  // Spot Number
      
      // Other fields
      color: spotData.color,
      spot_type: spotData.spot_type,
      svg_x: spotData.svg_x,
      svg_y: spotData.svg_y,
      svg_width: spotData.svg_width,
      svg_height: spotData.svg_height,
      is_custom_labeled: !!spotData.parker_name,  // True if parker_name exists
      updated_at: new Date().toISOString()
    }

    if (spotData.id) {
      // Update existing
      const { data, error } = await supabase
        .from('parking_spots')
        .update(dbSpot)
        .eq('id', spotData.id)
        .select()
        .single()
      
      return { data, error }
    } else {
      // Create new
      const { data, error } = await supabase
        .from('parking_spots')
        .insert([{
          ...dbSpot,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      return { data, error }
    }
  },

  // Update specific fields
  updateSpotLabel: async (spotId, updates) => {
    const { data, error } = await supabase
      .from('parking_spots')
      .update({
        display_label: updates.company_name,      // Company Name
        custom_label: updates.parker_name,        // Parker Name
        original_label: updates.spot_number,      // Spot Number
        is_custom_labeled: !!updates.parker_name, // Has parker name?
        updated_at: new Date().toISOString()
      })
      .eq('id', spotId)
      .select()
      .single()
    
    return { data, error }
  }
}