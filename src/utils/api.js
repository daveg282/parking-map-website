// utils/api.js
import { supabase } from '@/lib/supabase'

export const parkingApi = {
  // Get spots for a floor (Public & Admin)
  getSpotsByFloor: async (floorId) => {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('floor_id', floorId)
      .order('svg_y')
    
    return { data, error }
  },

  // Save a spot (Admin only)
  saveSpot: async (spot) => {
    // Check if spot already exists
    const { data: existingSpot } = await supabase
      .from('parking_spots')
      .select('id')
      .eq('floor_id', spot.floor_id)
      .eq('spot_identifier', spot.spot_identifier)
      .maybeSingle()
    
    if (existingSpot) {
      // Update existing spot
      const { data, error } = await supabase
        .from('parking_spots')
        .update({
          display_label: spot.display_label,
          custom_label: spot.custom_label,
          is_custom_labeled: spot.is_custom_labeled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSpot.id)
        .select()
        .single()
      
      return { data, error }
    } else {
      // Create new spot
      const { data, error } = await supabase
        .from('parking_spots')
        .insert([{
          ...spot,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      return { data, error }
    }
  },

  // Delete a spot (Admin only)
  deleteSpot: async (spotId) => {
    const { error } = await supabase
      .from('parking_spots')
      .delete()
      .eq('id', spotId)
    
    return { error }
  },

  // Update custom label (Admin only)
  updateSpotLabel: async (spotId, updates) => {
    const { data, error } = await supabase
      .from('parking_spots')
      .update(updates)
      .eq('id', spotId)
      .select()
      .single()
    
    return { data, error }
  }
}