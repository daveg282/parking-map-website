// app/admin/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminFloorPage() {
  const params = useParams()
  const floorId = params.floorId || '1'

  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [editingCompany, setEditingCompany] = useState(false)
  const [editingParker, setEditingParker] = useState(false)
  const [editingSpotNumber, setEditingSpotNumber] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [parkerName, setParkerName] = useState('')
  const [spotNumber, setSpotNumber] = useState('')
  const [containerRect, setContainerRect] = useState(null)
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false)
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  // Load SVG
  useEffect(() => {
    const loadSVG = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/overlays/parking_page_${floorId}.svg`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        setSvgContent(text)
      } catch (err) {
        console.error('Failed to load SVG:', err)
        setError('SVG not available for this floor')
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [floorId])

  // ==================== DETECTION FUNCTIONS ====================
  
  const normalizeColor = (color) => {
    if (!color) return '';
    color = color.toLowerCase().trim();
    
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]).toString(16).padStart(2, '0');
        const g = parseInt(match[1]).toString(16).padStart(2, '0');
        const b = parseInt(match[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    
    if (color.match(/^[0-9a-f]{6}$/i)) {
      return `#${color}`;
    }
    
    return color.replace(/\s+/g, '');
  };

  const detectSpotsFromSVG = (svgElement) => {
  console.log('=== DETECTING SPOTS FROM SVG (All Colors) ===');
  
  const spots = [];
  const allElements = svgElement.querySelectorAll('*');
  
  // Find all elements that could be parking spots
  allElements.forEach((element, index) => {
    if (element.tagName.toLowerCase() !== 'rect' && 
        element.tagName.toLowerCase() !== 'polygon' && 
        element.tagName.toLowerCase() !== 'path' &&
        element.tagName.toLowerCase() !== 'circle' &&
        element.tagName.toLowerCase() !== 'ellipse') {
      return;
    }
    
    try {
      const computedStyle = window.getComputedStyle(element);
      const fillColor = computedStyle.fill;
      
      if (!fillColor || fillColor === 'none') return;
      
      // Check if it's a cyan OR yellow spot (KEEP BOTH)
      const normalizedColor = normalizeColor(fillColor);
      const isCyan = normalizedColor.includes('80ffff') || 
                    normalizedColor.includes('7ffffe') || 
                    normalizedColor.includes('81ffff') ||
                    normalizedColor === '#80ffff';
      const isYellow = normalizedColor.includes('ffff80') || 
                      normalizedColor.includes('ffff7f') || 
                      normalizedColor.includes('ffff81') ||
                      normalizedColor === '#ffff80';
      
      // KEEP BOTH COLORS - remove this check entirely
      // if (!isCyan && !isYellow) return;
      
      // Instead, check if it's ANY colored parking spot (not just cyan/yellow)
      // You can add more colors here if needed
      if (!isCyan && !isYellow) return;
      
      const bbox = element.getBBox();
      
      // Filter out very small elements
      if (bbox.width < 15 || bbox.height < 15) return;
      
      // REMOVED: The part that finds nearby text elements for labels
      // This is where we were getting "P1", "P2" labels
      // We're removing this completely
      
      // Get screen coordinates
      const svgPoint = svgElement.createSVGPoint();
      const points = [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.width, y: bbox.y },
        { x: bbox.x, y: bbox.y + bbox.height },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
      ];
      
      const screenPoints = points.map(point => {
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        return svgPoint.matrixTransform(svgElement.getScreenCTM());
      });
      
      const screenX = Math.min(...screenPoints.map(p => p.x));
      const screenY = Math.min(...screenPoints.map(p => p.y));
      const screenWidth = Math.max(...screenPoints.map(p => p.x)) - screenX;
      const screenHeight = Math.max(...screenPoints.map(p => p.y)) - screenY;
      
      const spot = {
        id: `detected_${floorId}_${index}_${Date.now()}`,
        svgX: bbox.x,
        svgY: bbox.y,
        svgWidth: bbox.width,
        svgHeight: bbox.height,
        screenX,
        screenY,
        screenWidth,
        screenHeight,
        color: normalizedColor,
        type: isCyan ? 'cyan' : 'yellow',
        elementType: element.tagName.toLowerCase(),
        
        // REMOVED: spotNumber detection from text
        // Now we'll use a generated number based on position
        companyName: 'Unassigned',
        parkerName: null,
        spotNumber: `SPOT-${index + 1}`, // Generate generic spot number
        originalSpotNumber: null,
        hasText: false, // Always false since we're not detecting text
        rawElement: element,
        shapeIndex: index,
        isCustomLabeled: false,
        isFromDatabase: false,
        dbId: null
      };
      
      spots.push(spot);
      
    } catch (err) {
      console.error(`Error processing element ${index}:`, err);
    }
  });
  
  console.log(`=== DETECTED ${spots.length} SPOTS (No Text Labels) ===`);
  return spots;
};

  // ==================== MAIN FLOW ====================
  
  useEffect(() => {
    if (!svgRef.current || loading || error || !svgContent) return

    const timer = setTimeout(async () => {
      const svgElement = svgRef.current?.querySelector('svg')
      if (!svgElement) return

      updateContainerRect();
      
      console.log('🚀 ===== PARKING SPOT MANAGEMENT FLOW =====');
      
      try {
        // STEP 1: DETECT spots from SVG
        console.log('1️⃣ DETECT: Scanning SVG for parking spots...');
        const detectedSpots = detectSpotsFromSVG(svgElement);
        
        if (detectedSpots.length === 0) {
          console.log('❌ No spots detected in SVG');
          setSpots([]);
          setIsInitialDetectionDone(true);
          return;
        }
        
        // STEP 2: READ spots from database
        console.log('2️⃣ READ: Loading spots from database...');
        const { data: existingSpots, error: dbError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('floor_id', floorId)
        
        if (dbError) {
          console.error('❌ Database read error:', dbError);
          setSpots(detectedSpots);
          setIsInitialDetectionDone(true);
          return;
        }
        
        console.log(`📊 Found ${existingSpots?.length || 0} existing spots in database`);
        
        // STEP 3: COMPARE detected spots with database
        console.log('3️⃣ COMPARE: Matching detected spots with database...');
        const existingSpotMap = new Map();
        const spotsToSave = [];
        
        // Create map of existing spots by position
        if (existingSpots) {
          existingSpots.forEach(spot => {
            const key = `${Math.round(spot.svg_x)}_${Math.round(spot.svg_y)}`;
            existingSpotMap.set(key, spot);
          });
        }
        
        // Check each detected spot
        detectedSpots.forEach(detectedSpot => {
          const key = `${Math.round(detectedSpot.svgX)}_${Math.round(detectedSpot.svgY)}`;
          const existingSpot = existingSpotMap.get(key);
          
          if (!existingSpot) {
            // This is a NEW spot - add to save list
            spotsToSave.push({
              floor_id: floorId,
              spot_identifier: `spot_${detectedSpot.svgX}_${detectedSpot.svgY}`,
              // NEW MAPPING:
              display_label: detectedSpot.companyName || 'Unassigned', // Company Name
              custom_label: detectedSpot.parkerName || null,           // Parker Name
              original_label: detectedSpot.spotNumber || 'Unlabeled',  // Spot Number
              color: detectedSpot.color,
              spot_type: detectedSpot.type,
              svg_x: detectedSpot.svgX,
              svg_y: detectedSpot.svgY,
              svg_width: detectedSpot.svgWidth,
              svg_height: detectedSpot.svgHeight,
              is_custom_labeled: !!detectedSpot.parkerName, // Has parker name?
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
        
        // STEP 4: SAVE new spots to database
        if (spotsToSave.length > 0) {
          console.log(`4️⃣ SAVE: Saving ${spotsToSave.length} new spots to database...`);
          
          const { data: savedSpots, error: saveError } = await supabase
            .from('parking_spots')
            .insert(spotsToSave)
            .select()
          
          if (saveError) {
            console.error('❌ Save error:', saveError);
          } else {
            console.log(`✅ Successfully saved ${savedSpots?.length || 0} new spots to database`);
          }
        } else {
          console.log('✅ No new spots to save - all detected spots already exist in database');
        }
        
        // STEP 5: READ updated spots from database
        console.log('5️⃣ READ: Loading updated spots from database...');
        const { data: allDatabaseSpots, error: finalReadError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('floor_id', floorId)
        
        if (finalReadError) {
          console.error('❌ Final read error:', finalReadError);
          setSpots(detectedSpots);
          setIsInitialDetectionDone(true);
          return;
        }
        
        // STEP 6: MERGE detected spots with database data
        console.log('6️⃣ MERGE: Creating final spot list...');
        const finalSpots = detectedSpots.map(detectedSpot => {
          // Find matching spot in database by position
          const matchingDbSpot = allDatabaseSpots?.find(dbSpot => 
            Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 5 && 
            Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 5
          );
          
          if (matchingDbSpot) {
            // Use database data with NEW FIELD MAPPING
            return {
              id: matchingDbSpot.id,
              dbId: matchingDbSpot.id,
              spot_identifier: matchingDbSpot.spot_identifier,
              
              // NEW MAPPING:
              companyName: matchingDbSpot.display_label || 'Unassigned', // Company Name
              parkerName: matchingDbSpot.custom_label,                   // Parker Name
              spotNumber: matchingDbSpot.original_label || 'Unlabeled',  // Spot Number
              
              originalSpotNumber: detectedSpot.originalSpotNumber,
              color: matchingDbSpot.color,
              type: matchingDbSpot.spot_type,
              svgX: matchingDbSpot.svg_x,
              svgY: matchingDbSpot.svg_y,
              svgWidth: matchingDbSpot.svg_width,
              svgHeight: matchingDbSpot.svg_height,
              screenX: detectedSpot.screenX,
              screenY: detectedSpot.screenY,
              screenWidth: detectedSpot.screenWidth,
              screenHeight: detectedSpot.screenHeight,
              elementType: detectedSpot.elementType,
              hasText: detectedSpot.hasText,
              rawElement: detectedSpot.rawElement,
              shapeIndex: detectedSpot.shapeIndex,
              isCustomLabeled: matchingDbSpot.is_custom_labeled,
              isFromDatabase: true
            };
          }
          
          // Should not happen after saving, but just in case
          return {
            ...detectedSpot,
            isFromDatabase: false
          };
        });
        
        // Sort spots by position
        finalSpots.sort((a, b) => {
          if (Math.abs(a.svgY - b.svgY) < 10) {
            return a.svgX - b.svgX;
          }
          return a.svgY - b.svgY;
        });
        
        // STEP 7: DISPLAY final spots
        console.log('7️⃣ DISPLAY: Rendering spots...');
        console.log(`📊 Total spots: ${finalSpots.length}`);
        console.log(`💾 In database: ${finalSpots.filter(s => s.isFromDatabase).length}`);
        console.log(`👤 With parker names: ${finalSpots.filter(s => s.parkerName).length}`);
        console.log('✅ ===== FLOW COMPLETE =====');
        
        setSpots(finalSpots);
        setIsInitialDetectionDone(true);
        
      } catch (error) {
        console.error('❌ Error in spot management flow:', error);
        setSpots([]);
        setIsInitialDetectionDone(true);
      }
      
    }, 1000);

    return () => clearTimeout(timer);
  }, [svgContent, loading, error, floorId]);

  // ==================== UTILITY FUNCTIONS ====================

  const updateContainerRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      updateContainerRect();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateSpotPosition = (spot) => {
    if (!containerRect || !spot) return null;
    
    const left = (spot.screenX - containerRect.left);
    const top = (spot.screenY - containerRect.top);
    const width = spot.screenWidth;
    const height = spot.screenHeight;
    
    return {
      left: `${(left / containerRect.width) * 100}%`,
      top: `${(top / containerRect.height) * 100}%`,
      width: `${(width / containerRect.width) * 100}%`,
      height: `${(height / containerRect.height) * 100}%`
    };
  };

  // ==================== SPOT INTERACTIONS ====================

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    setCompanyName(spot.companyName || 'Unassigned');
    setParkerName(spot.parkerName || '');
    setSpotNumber(spot.spotNumber || '');
  };

  const startEditingCompany = () => {
    if (!selectedSpot) return;
    setEditingCompany(true);
    setEditingParker(false);
    setEditingSpotNumber(false);
  };

  const startEditingParker = () => {
    if (!selectedSpot) return;
    setEditingParker(true);
    setEditingCompany(false);
    setEditingSpotNumber(false);
  };

  const startEditingSpotNumber = () => {
    if (!selectedSpot) return;
    setEditingSpotNumber(true);
    setEditingCompany(false);
    setEditingParker(false);
  };

  // SAVE Company Name (display_label)
  const saveCompanyName = async () => {
    if (!selectedSpot || !selectedSpot.dbId) return;
    
    try {
      const companyToSave = companyName.trim() || 'Unassigned';
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          display_label: companyToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpot.dbId)
      
      if (error) throw error;
      
      // Update local state
      const updatedSpots = spots.map(spot => {
        if (spot.dbId === selectedSpot.dbId) {
          return {
            ...spot,
            companyName: companyToSave
          };
        }
        return spot;
      });
      
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({
        ...prev,
        companyName: companyToSave
      }));
      setEditingCompany(false);
      
      alert(`✅ Company name updated: "${companyToSave}"`);
      
    } catch (error) {
      console.error('Error saving company name:', error);
      alert('❌ Failed to update company name');
    }
  };

  // SAVE Parker Name (custom_label)
  const saveParkerName = async () => {
    if (!selectedSpot || !selectedSpot.dbId) return;
    
    try {
      const parkerToSave = parkerName.trim() || null;
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          custom_label: parkerToSave,
          is_custom_labeled: !!parkerToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpot.dbId)
      
      if (error) throw error;
      
      // Update local state
      const updatedSpots = spots.map(spot => {
        if (spot.dbId === selectedSpot.dbId) {
          return {
            ...spot,
            parkerName: parkerToSave,
            isCustomLabeled: !!parkerToSave
          };
        }
        return spot;
      });
      
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({
        ...prev,
        parkerName: parkerToSave,
        isCustomLabeled: !!parkerToSave
      }));
      setEditingParker(false);
      
      if (parkerToSave) {
        alert(`✅ Parker name saved: "${parkerToSave}"`);
      } else {
        alert('✅ Parker name cleared');
      }
      
    } catch (error) {
      console.error('Error saving parker name:', error);
      alert('❌ Failed to update parker name');
    }
  };

  // SAVE Spot Number (original_label) - FIXED VERSION
  const saveSpotNumber = async () => {
    if (!selectedSpot || !selectedSpot.dbId) {
      alert('⚠️ Please wait for the spot to be saved to the database first');
      return;
    }
    
    try {
      const spotNumToSave = spotNumber.trim() || 'Unlabeled';
      
      // Prevent saving if the value hasn't changed
      if (spotNumToSave === selectedSpot.spotNumber) {
        setEditingSpotNumber(false);
        return;
      }
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          original_label: spotNumToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpot.dbId)
      
      if (error) throw error;
      
      // Update local state
      const updatedSpots = spots.map(spot => {
        if (spot.dbId === selectedSpot.dbId) {
          return {
            ...spot,
            spotNumber: spotNumToSave
          };
        }
        return spot;
      });
      
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({
        ...prev,
        spotNumber: spotNumToSave
      }));
      setEditingSpotNumber(false);
      
      alert(`✅ Spot number updated: "${spotNumToSave}"`);
      
    } catch (error) {
      console.error('Error saving spot number:', error);
      alert('❌ Failed to update spot number: ' + error.message);
    }
  };

  // ==================== MANUAL RE-DETECTION ====================

  const handleRedetectSpots = async () => {
    if (!svgRef.current) return;
    
    const confirmed = window.confirm(
      '🔄 MANUAL RE-DETECTION\n\nThis will:\n1. Re-scan SVG for CYAN spots only\n2. Add NEW spots to database\n3. Keep existing company/parker/spot info\n\nContinue?'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      const svgElement = svgRef.current?.querySelector('svg');
      if (!svgElement) {
        alert('SVG element not found');
        return;
      }
      
      console.log('🔄 ===== MANUAL RE-DETECTION STARTED =====');
      
      // 1. DETECT
      console.log('1️⃣ DETECT: Scanning SVG...');
      const detectedSpots = detectSpotsFromSVG(svgElement);
      
      if (detectedSpots.length === 0) {
        alert('❌ No cyan spots detected in SVG');
        return;
      }
      
      // 2. READ
      console.log('2️⃣ READ: Loading from database...');
      const { data: existingSpots, error: dbError } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('floor_id', floorId)
      
      if (dbError) throw dbError;
      
      // 3. COMPARE
      console.log('3️⃣ COMPARE: Finding new spots...');
      const existingSpotMap = new Map();
      const spotsToSave = [];
      
      if (existingSpots) {
        existingSpots.forEach(spot => {
          const key = `${Math.round(spot.svg_x)}_${Math.round(spot.svg_y)}`;
          existingSpotMap.set(key, spot);
        });
      }
      
      detectedSpots.forEach(detectedSpot => {
        const key = `${Math.round(detectedSpot.svgX)}_${Math.round(detectedSpot.svgY)}`;
        if (!existingSpotMap.has(key)) {
          spotsToSave.push({
            floor_id: floorId,
            spot_identifier: `spot_${detectedSpot.svgX}_${detectedSpot.svgY}`,
            display_label: detectedSpot.companyName || 'Unassigned',
            custom_label: detectedSpot.parkerName || null,
            original_label: detectedSpot.spotNumber || 'Unlabeled',
            color: detectedSpot.color,
            spot_type: detectedSpot.type,
            svg_x: detectedSpot.svgX,
            svg_y: detectedSpot.svgY,
            svg_width: detectedSpot.svgWidth,
            svg_height: detectedSpot.svgHeight,
            is_custom_labeled: !!detectedSpot.parkerName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
      
      // 4. SAVE
      if (spotsToSave.length > 0) {
        console.log(`4️⃣ SAVE: Adding ${spotsToSave.length} new spots...`);
        const { data: savedSpots, error: saveError } = await supabase
          .from('parking_spots')
          .insert(spotsToSave)
          .select()
        
        if (saveError) throw saveError;
        console.log(`✅ Added ${savedSpots?.length || 0} new spots to database`);
      }
      
      // 5. READ updated
      console.log('5️⃣ READ: Loading updated spots...');
      const { data: allDatabaseSpots } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('floor_id', floorId)
      
      // 6. MERGE
      console.log('6️⃣ MERGE: Creating final list...');
      const finalSpots = detectedSpots.map(detectedSpot => {
        const matchingDbSpot = allDatabaseSpots?.find(dbSpot => 
          Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 5 && 
          Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 5
        );
        
        if (matchingDbSpot) {
          return {
            ...detectedSpot,
            id: matchingDbSpot.id,
            dbId: matchingDbSpot.id,
            companyName: matchingDbSpot.display_label || 'Unassigned',
            parkerName: matchingDbSpot.custom_label,
            spotNumber: matchingDbSpot.original_label || 'Unlabeled',
            isCustomLabeled: matchingDbSpot.is_custom_labeled,
            isFromDatabase: true
          };
        }
        
        return {
          ...detectedSpot,
          isFromDatabase: false
        };
      });
      
      // Sort
      finalSpots.sort((a, b) => {
        if (Math.abs(a.svgY - b.svgY) < 10) {
          return a.svgX - b.svgX;
        }
        return a.svgY - b.svgY;
      });
      
      // 7. DISPLAY
      setSpots(finalSpots);
      setSelectedSpot(null);
      
      console.log('✅ ===== RE-DETECTION COMPLETE =====');
      alert(`✅ Re-detection complete!\n\n📊 Results:\n• Cyan spots detected: ${detectedSpots.length}\n• New spots added: ${spotsToSave.length}\n• Total in database: ${finalSpots.filter(s => s.isFromDatabase).length}\n• With parker names: ${finalSpots.filter(s => s.parkerName).length}`);
      
    } catch (error) {
      console.error('❌ Re-detection error:', error);
      alert(`❌ Error during re-detection: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0 || !containerRect) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;

          return (
            <div
              key={spot.dbId || spot.id}
              className="absolute cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-blue-500 hover:bg-blue-500/20 rounded pointer-events-auto group"
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                backgroundColor: 'transparent',
                zIndex: 1
              }}
              onClick={() => handleSpotClick(spot)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = spot.parkerName ? '#8b5cf6' : '#06b6d4';
                e.currentTarget.style.backgroundColor = spot.parkerName ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.zIndex = '1';
              }}
              title={`${spot.companyName} • ${spot.spotNumber}${spot.parkerName ? ` • 👤 ${spot.parkerName}` : ''}`}
            >
              {spot.parkerName && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  👤
                </div>
              )}
              
              {spot.isFromDatabase && !spot.parkerName && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  💾
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  spot.parkerName 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-black/70 text-white'
                }`}>
                  {spot.spotNumber}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Floor {floorId} - Parking Admin
              </h1>
              <p className="text-gray-600 mt-1">
                {isInitialDetectionDone 
                  ? 'Cyan spots detected. Click spots to edit company/parker/spot info.'
                  : 'Detecting cyan parking spots...'}
              </p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#80ffff] rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">
                      {spots.length} cyan spots • {spots.filter(s => s.parkerName).length} with parkers • {spots.filter(s => s.isFromDatabase).length} in DB
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRedetectSpots}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                disabled={loading}
              >
                {loading ? 'Processing...' : '🔄 Re-detect Cyan Spots'}
              </button>
              <Link 
                href="/admin" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
              >
                ← Admin Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div 
          ref={containerRef}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="w-full h-[900px] flex items-center justify-center bg-white relative">
            {loading && (
              <div className="text-center absolute inset-0 flex items-center justify-center bg-white z-10">
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Detecting cyan parking spots...</p>
                  <p className="text-sm text-gray-500">Scanning SVG and saving to database</p>
                </div>
              </div>
            )}
            
            {error && !loading && (
              <div className="text-center p-8 absolute inset-0 flex items-center justify-center bg-white">
                <div>
                  <div className="text-4xl mb-4">🏢</div>
                  <p className="text-gray-600">Floor {floorId}</p>
                  <p className="text-sm text-gray-400 mt-2">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && svgContent && (
              <div ref={svgRef} className="relative w-full h-full overflow-hidden">
                <div 
                  className="absolute inset-0 w-full h-full flex items-center justify-center p-4"
                  style={{
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                  }}
                >
                  <div 
                    className="w-full h-full max-w-full max-h-full"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </div>
                
                {renderInteractiveOverlay()}
              </div>
            )}
          </div>
        </div>

        {/* Selected Spot Panel */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {selectedSpot ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Edit Parking Spot</h3>
                    <button
                      onClick={() => {
                        setSelectedSpot(null);
                        setEditingCompany(false);
                        setEditingParker(false);
                        setEditingSpotNumber(false);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Company Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      {editingCompany ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter company name..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveCompanyName}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              disabled={!selectedSpot.dbId}
                            >
                              {selectedSpot.dbId ? '💾 Save Company' : '⚠️ Not in DB'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCompany(false);
                                setCompanyName(selectedSpot.companyName || 'Unassigned');
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">{selectedSpot.companyName || 'Unassigned'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Displayed on parking map
                            </div>
                          </div>
                          <button
                            onClick={startEditingCompany}
                            className="w-full px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center gap-1"
                            disabled={!selectedSpot.dbId}
                          >
                            <span>🏢</span>
                            <span>{selectedSpot.dbId ? 'Edit Company' : 'Wait for DB Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Parker Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Parker Name
                      </label>
                      {editingParker ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={parkerName}
                            onChange={(e) => setParkerName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter parker's full name..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveParkerName}
                              className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              disabled={!selectedSpot.dbId}
                            >
                              {selectedSpot.dbId ? '👤 Save Parker' : '⚠️ Not in DB'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingParker(false);
                                setParkerName(selectedSpot.parkerName || '');
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className={`p-3 rounded-lg ${
                            selectedSpot.parkerName ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                          }`}>
                            <div className={`font-bold ${
                              selectedSpot.parkerName ? 'text-purple-700' : 'text-gray-500'
                            }`}>
                              {selectedSpot.parkerName || 'No parker assigned'}
                            </div>
                            {selectedSpot.parkerName && (
                              <div className="text-xs text-purple-600 mt-1">
                                ✓ Parker assigned to this spot
                              </div>
                            )}
                          </div>
                          <button
                            onClick={startEditingParker}
                            className="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center justify-center gap-1"
                            disabled={!selectedSpot.dbId}
                          >
                            <span>👤</span>
                            <span>{selectedSpot.dbId ? (selectedSpot.parkerName ? 'Edit Parker' : 'Assign Parker') : 'Wait for DB Save'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Spot Number Field - FIXED */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spot Number
                      </label>
                      {editingSpotNumber ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={spotNumber}
                            onChange={(e) => setSpotNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter spot number (e.g., A1, B2)..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveSpotNumber}
                              className="flex-1 px-3 py-1.5 bg-green-600 text-black rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              🔢 Save Number
                            </button>
                            <button
                              onClick={() => {
                                setEditingSpotNumber(false);
                                setSpotNumber(selectedSpot.spotNumber || '');
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-xl font-bold text-gray-900">{selectedSpot.spotNumber || 'Unlabeled'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Detected from SVG
                            </div>
                          </div>
                          <button
                            onClick={startEditingSpotNumber}
                            className="w-full px-3 py-1.5 bg-green-800 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center justify-center gap-1"
                          >
                            <span>🔢</span>
                            <span>Edit Spot Number</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">
                    Click on any cyan parking spot to edit:
                  </p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1">
                    <li>🏢 Company Name</li>
                    <li>👤 Parker Name</li>
                    <li>🔢 Spot Number</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Spot List - SIMPLIFIED */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600">{spots.filter(s => s.isFromDatabase).length} in DB</span>
                    {' • '}
                    <span className="text-purple-600">{spots.filter(s => s.parkerName).length} with parkers</span>
                  </div>
                </div>
                
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => (
                      <div
                        key={spot.dbId || spot.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedSpot?.id === spot.id 
                            ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' 
                            : spot.parkerName
                            ? 'border-purple-300 bg-purple-50/50'
                            : spot.isFromDatabase
                            ? 'border-green-300 bg-green-50/30'
                            : 'border-yellow-300 bg-yellow-50/30'
                        }`}
                        onClick={() => handleSpotClick(spot)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              spot.parkerName ? 'text-purple-700' : 
                              spot.isFromDatabase ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {spot.spotNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {spot.isFromDatabase && (
                              <div className="text-xs text-green-600" title="In database">💾</div>
                            )}
                            {spot.parkerName && (
                              <div className="text-xs text-purple-600">👤</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm font-medium text-gray-900 truncate mb-1" title={spot.companyName}>
                          {spot.companyName}
                        </div>
                        
                        {spot.parkerName ? (
                          <div className="text-xs text-purple-600 truncate" title={spot.parkerName}>
                            👤 {spot.parkerName}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            No parker assigned
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No cyan parking spots detected.</p>
                    <p className="text-sm mt-1">SVG loaded, but no cyan-colored spots found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}