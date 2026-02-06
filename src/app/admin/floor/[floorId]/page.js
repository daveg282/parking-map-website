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
  const [editingLabel, setEditingLabel] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
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
    console.log('=== DETECTING SPOTS FROM SVG ===');
    
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
        
        // Check if it's a cyan or yellow spot
        const normalizedColor = normalizeColor(fillColor);
        const isCyan = normalizedColor.includes('80ffff') || 
                      normalizedColor.includes('7ffffe') || 
                      normalizedColor.includes('81ffff') ||
                      normalizedColor === '#80ffff';
        const isYellow = normalizedColor.includes('ffff80') || 
                        normalizedColor.includes('ffff7f') || 
                        normalizedColor.includes('ffff81') ||
                        normalizedColor === '#ffff80';
        
        if (!isCyan && !isYellow) return;
        
        const bbox = element.getBBox();
        
        // Filter out very small elements
        if (bbox.width < 15 || bbox.height < 15) return;
        
        // Get the spot text by finding nearby text elements
        let spotText = null;
        const textElements = svgElement.querySelectorAll('text');
        
        textElements.forEach(textElement => {
          try {
            const textBBox = textElement.getBBox();
            const textContent = textElement.textContent?.trim();
            
            if (!textContent || textContent.length > 10) return;
            
            // Check if text is inside or very close to the shape
            const textCenterX = textBBox.x + textBBox.width / 2;
            const textCenterY = textBBox.y + textBBox.height / 2;
            
            const isInside = 
              textCenterX >= bbox.x && 
              textCenterX <= bbox.x + bbox.width &&
              textCenterY >= bbox.y && 
              textCenterY <= bbox.y + bbox.height;
            
            const distance = Math.sqrt(
              Math.pow(textCenterX - (bbox.x + bbox.width/2), 2) +
              Math.pow(textCenterY - (bbox.y + bbox.height/2), 2)
            );
            
            const maxDistance = Math.max(bbox.width, bbox.height) * 0.8;
            
            if (isInside || distance < maxDistance) {
              spotText = textContent.replace(/\s+/g, ' ').trim();
              // Extract just the number/letter code
              const match = spotText.match(/([A-Z]?\d+[A-Z]?|\b[A-Z]\d*\b)/i);
              if (match) {
                spotText = match[1];
              }
            }
          } catch (err) {
            // Skip text elements that error
          }
        });
        
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
          text: spotText || 'Unlabeled',
          originalText: spotText,
          customLabel: null,
          hasText: !!spotText,
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
    
    console.log(`=== DETECTED ${spots.length} SPOTS ===`);
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
              display_label: detectedSpot.text,
              original_label: detectedSpot.originalText,
              custom_label: null,
              color: detectedSpot.color,
              spot_type: detectedSpot.type,
              svg_x: detectedSpot.svgX,
              svg_y: detectedSpot.svgY,
              svg_width: detectedSpot.svgWidth,
              svg_height: detectedSpot.svgHeight,
              is_custom_labeled: false,
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
            // Use database data (with custom labels if any)
            return {
              id: matchingDbSpot.id,
              dbId: matchingDbSpot.id,
              spot_identifier: matchingDbSpot.spot_identifier,
              text: matchingDbSpot.display_label,
              customLabel: matchingDbSpot.custom_label,
              originalText: matchingDbSpot.original_label || detectedSpot.originalText,
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
        console.log(`✏️ Custom labels: ${finalSpots.filter(s => s.isCustomLabeled).length}`);
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
    setCustomLabel(spot.customLabel || spot.text || '');
  };

  const startEditingLabel = () => {
    if (!selectedSpot) return;
    setEditingLabel(true);
    setCustomLabel(selectedSpot.customLabel || selectedSpot.text || '');
  };

  // UPDATE label in database
  const saveCustomLabel = async () => {
    if (!selectedSpot || !customLabel.trim()) return;
    
    try {
      const labelToSave = customLabel.trim();
      
      const { error } = await supabase
        .from('parking_spots')
        .update({
          custom_label: labelToSave,
          display_label: labelToSave,
          is_custom_labeled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpot.dbId)
      
      if (error) throw error;
      
      // READ updated spot from database
      const { data: updatedSpot } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', selectedSpot.dbId)
        .single()
      
      // UPDATE local state
      const updatedSpots = spots.map(spot => {
        if (spot.dbId === selectedSpot.dbId) {
          return {
            ...spot,
            text: labelToSave,
            customLabel: labelToSave,
            isCustomLabeled: true
          };
        }
        return spot;
      });
      
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({
        ...prev,
        text: labelToSave,
        customLabel: labelToSave,
        isCustomLabeled: true
      }));
      setEditingLabel(false);
      
      alert(`✅ Label updated in database: "${labelToSave}"`);
      
    } catch (error) {
      console.error('Error saving label:', error);
      alert('❌ Failed to update label in database');
    }
  };

  const clearCustomLabel = async () => {
    if (!selectedSpot || !selectedSpot.dbId) return;
    
    try {
      const { error } = await supabase
        .from('parking_spots')
        .update({
          custom_label: null,
          display_label: selectedSpot.originalText || 'Unlabeled',
          is_custom_labeled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpot.dbId)
      
      if (error) throw error;
      
      const updatedSpots = spots.map(spot => {
        if (spot.dbId === selectedSpot.dbId) {
          return {
            ...spot,
            text: spot.originalText || 'Unlabeled',
            customLabel: null,
            isCustomLabeled: false
          };
        }
        return spot;
      });
      
      setSpots(updatedSpots);
      setSelectedSpot(prev => ({
        ...prev,
        text: prev.originalText || 'Unlabeled',
        customLabel: null,
        isCustomLabeled: false
      }));
      setCustomLabel(selectedSpot.originalText || 'Unlabeled');
      setEditingLabel(false);
      
      alert('✅ Label cleared from database');
      
    } catch (error) {
      console.error('Error clearing label:', error);
      alert('❌ Failed to clear label');
    }
  };

  // ==================== MANUAL RE-DETECTION ====================

  const handleRedetectSpots = async () => {
    if (!svgRef.current) return;
    
    const confirmed = window.confirm(
      '🔄 MANUAL RE-DETECTION\n\nThis will:\n1. Re-scan SVG for spots\n2. Add NEW spots to database\n3. Keep existing custom labels\n4. Update the display\n\nContinue?'
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
        alert('❌ No spots detected in SVG');
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
            display_label: detectedSpot.text,
            original_label: detectedSpot.originalText,
            custom_label: null,
            color: detectedSpot.color,
            spot_type: detectedSpot.type,
            svg_x: detectedSpot.svgX,
            svg_y: detectedSpot.svgY,
            svg_width: detectedSpot.svgWidth,
            svg_height: detectedSpot.svgHeight,
            is_custom_labeled: false,
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
            text: matchingDbSpot.display_label,
            customLabel: matchingDbSpot.custom_label,
            originalText: matchingDbSpot.original_label || detectedSpot.originalText,
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
      alert(`✅ Re-detection complete!\n\n📊 Results:\n• Total detected: ${detectedSpots.length}\n• New spots added: ${spotsToSave.length}\n• Total in database: ${finalSpots.filter(s => s.isFromDatabase).length}\n• Custom labels: ${finalSpots.filter(s => s.isCustomLabeled).length}`);
      
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
                e.currentTarget.style.borderColor = spot.isCustomLabeled ? '#8b5cf6' : 
                                                   spot.type === 'cyan' ? '#06b6d4' : '#eab308';
                e.currentTarget.style.backgroundColor = spot.isCustomLabeled ? 'rgba(139, 92, 246, 0.2)' :
                                                       spot.type === 'cyan' ? 'rgba(6, 182, 212, 0.2)' : 
                                                       'rgba(234, 179, 8, 0.2)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.zIndex = '1';
              }}
              title={`${spot.text} (${spot.type})${spot.isCustomLabeled ? ' ✏️' : ''}${spot.isFromDatabase ? ' 💾' : ''}`}
            >
              {spot.isCustomLabeled && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ✏️
                </div>
              )}
              
              {spot.isFromDatabase && !spot.isCustomLabeled && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  💾
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  spot.isCustomLabeled 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-black/70 text-white'
                }`}>
                  {spot.text}
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
                  ? 'Spots auto-detected and saved to database. Click spots to edit labels.'
                  : 'Detecting spots from SVG and saving to database...'}
              </p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#80ffff] rounded-sm border border-gray-300"></div>
                    <div className="w-3 h-3 bg-[#ffff80] rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">
                      {spots.length} spots • {spots.filter(s => s.isCustomLabeled).length} custom • {spots.filter(s => s.isFromDatabase).length} in DB
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
                {loading ? 'Processing...' : '🔄 Re-detect Spots'}
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
                  <p className="text-gray-600">Detecting parking spots...</p>
                  <p className="text-sm text-gray-500">Reading numbers from SVG and saving to database</p>
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
                    <h3 className="font-medium text-gray-900">Edit Spot</h3>
                    <button
                      onClick={() => setSelectedSpot(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spot Label
                      </label>
                      {editingLabel ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter custom label..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveCustomLabel}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              disabled={!selectedSpot.dbId}
                            >
                              {selectedSpot.dbId ? '💾 Save to Database' : '⚠️ Not in DB'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingLabel(false);
                                setCustomLabel(selectedSpot.customLabel || selectedSpot.text || '');
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-2xl font-bold text-gray-900">{selectedSpot.text}</div>
                              {selectedSpot.originalText && selectedSpot.originalText !== selectedSpot.text && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Original: {selectedSpot.originalText}
                                </div>
                              )}
                              {selectedSpot.isFromDatabase ? (
                                <div className="text-xs text-black mt-1">
                                  ✓ Saved in database
                                </div>
                              ) : (
                                <div className="text-xs text-yellow-600 mt-1">
                                  ⚠️ Not in database (will auto-save)
                                </div>
                              )}
                            </div>
                            {selectedSpot.isCustomLabeled && (
                              <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                Custom
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={startEditingLabel}
                              className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center gap-1"
                              disabled={!selectedSpot.dbId}
                            >
                              <span>✏️</span>
                              <span>{selectedSpot.dbId ? 'Edit Label' : 'Wait for DB Save'}</span>
                            </button>
                            {selectedSpot.isCustomLabeled && selectedSpot.dbId && (
                              <button
                                onClick={clearCustomLabel}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                              >
                                Clear Label
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 text-black">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: selectedSpot.color }}
                            />
                            <span className="text-sm font-medium capitalize">{selectedSpot.type}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Position</div>
                          <div className="text-sm font-mono mt-1">
                            {selectedSpot.svgX.toFixed(0)}, {selectedSpot.svgY.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">
                    Click on any parking spot to edit its label
                  </p>
                  {isInitialDetectionDone && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ All spots auto-saved to database
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Spot List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600">{spots.filter(s => s.isFromDatabase).length} in DB</span>
                    {' • '}
                    <span className="text-purple-600">{spots.filter(s => s.isCustomLabeled).length} custom</span>
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
                            : spot.isCustomLabeled
                            ? 'border-purple-300 bg-purple-50/50'
                            : spot.isFromDatabase
                            ? 'border-green-300 bg-green-50/30'
                            : 'border-yellow-300 bg-yellow-50/30'
                        }`}
                        onClick={() => handleSpotClick(spot)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: spot.color }}
                            />
                            <span className={`font-bold ${
                              spot.isCustomLabeled ? 'text-purple-700' : 
                              spot.isFromDatabase ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {spot.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {spot.isFromDatabase && (
                              <div className="text-xs text-green-600" title="In database">💾</div>
                            )}
                            {spot.isCustomLabeled && (
                              <div className="text-xs text-purple-600">✏️</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="capitalize">{spot.type}</div>
                          <div className="flex justify-between">
                            <span>{spot.svgWidth.toFixed(0)}×{spot.svgHeight.toFixed(0)}</span>
                            <span className="font-mono text-xs">
                              {spot.svgX.toFixed(0)},{spot.svgY.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No parking spots detected.</p>
                    <p className="text-sm mt-1">Loading SVG and detecting spots...</p>
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