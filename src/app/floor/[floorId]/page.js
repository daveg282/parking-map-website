// app/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Spot type configurations - no icons
const SPOT_TYPES = [
  { id: 'regular', name: 'Regular', color: '#fbbf24' },
  { id: 'reserved', name: 'Reserved', color: '#ef4444' },
  { id: 'compact', name: 'Compact', color: '#a855f7' },
  { id: 'ev', name: 'EV', color: '#10b981' },
  { id: 'ada', name: 'ADA', color: '#3b82f6' },
  { id: 'ada_ev', name: 'ADA + EV', color: '#1e40af' }
];

export default function PublicFloorPage() {
  const params = useParams()
  const floorId = params.floorId || '1'

  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [containerRect, setContainerRect] = useState(null)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 800 })

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

  const isTargetColor = (color) => {
    const normalized = normalizeColor(color);
    
    const cyan = '#80ffff';
    const yellow = '#ffff80';
    
    if (normalized === cyan || normalized === yellow) {
      return { match: true, type: normalized === cyan ? 'cyan' : 'yellow' };
    }
    
    const cyanVariations = ['#80ffff', '#7ffffe', '#81ffff', 'rgb(128,255,255)', 'rgb(127,255,254)'];
    const yellowVariations = ['#ffff80', '#ffff7f', '#ffff81', 'rgb(255,255,128)', 'rgb(255,255,127)'];
    
    if (cyanVariations.some(v => normalizeColor(v) === normalized)) {
      return { match: true, type: 'cyan' };
    }
    if (yellowVariations.some(v => normalizeColor(v) === normalized)) {
      return { match: true, type: 'yellow' };
    }
    
    return { match: false };
  };

  // Find spots with text
  const findSpotsWithText = (svgElement) => {
    const spotsFound = [];
    
    // Get SVG dimensions
    const viewBox = svgElement.viewBox?.animVal || svgElement.viewBox?.baseVal;
    let svgWidth = viewBox?.width || svgElement.clientWidth || 1000;
    let svgHeight = viewBox?.height || svgElement.clientHeight || 800;
    
    console.log('SVG Dimensions:', { svgWidth, svgHeight });
    setSvgDimensions({ width: svgWidth, height: svgHeight });
    
    // Get all colored shapes
    const allElements = svgElement.querySelectorAll('*');
    const coloredShapes = [];
    
    // Collect colored shapes
    allElements.forEach((element, index) => {
      if (element.tagName.toLowerCase() === 'text') return;
      
      try {
        const computedStyle = window.getComputedStyle(element);
        const fillColor = computedStyle.fill;
        
        if (fillColor && fillColor !== 'none') {
          const colorCheck = isTargetColor(fillColor);
          if (colorCheck.match) {
            const bbox = element.getBBox();
            
            if (bbox.width < 10 || bbox.height < 10) return;
            
            coloredShapes.push({
              element,
              bbox,
              type: colorCheck.type,
              color: fillColor,
              index
            });
          }
        }
      } catch (err) {
        // Skip elements
      }
    });
    
    // Get all text elements
    const allTextElements = Array.from(svgElement.querySelectorAll('text'));
    
    // Match text to shapes
    coloredShapes.forEach((shape, shapeIndex) => {
      try {
        const shapeBBox = shape.bbox;
        
        // Find text inside or near the shape
        const matchingTexts = [];
        
        allTextElements.forEach((textElement) => {
          try {
            const textBBox = textElement.getBBox();
            const textContent = textElement.textContent?.trim();
            
            if (!textContent || textContent.length > 10) return;
            
            // Check if text is INSIDE the shape
            const textCenterX = textBBox.x + textBBox.width / 2;
            const textCenterY = textBBox.y + textBBox.height / 2;
            
            const isInside = 
              textCenterX >= shapeBBox.x && 
              textCenterX <= shapeBBox.x + shapeBBox.width &&
              textCenterY >= shapeBBox.y && 
              textCenterY <= shapeBBox.y + shapeBBox.height;
            
            const distance = Math.sqrt(
              Math.pow(textCenterX - (shapeBBox.x + shapeBBox.width/2), 2) +
              Math.pow(textCenterY - (shapeBBox.y + shapeBBox.height/2), 2)
            );
            
            const maxDistance = Math.max(shapeBBox.width, shapeBBox.height) / 2;
            
            if (isInside || distance < maxDistance) {
              matchingTexts.push({
                element: textElement,
                content: textContent,
                bbox: textBBox,
                distance: distance,
                isInside: isInside
              });
            }
          } catch (err) {}
        });
        
        // Sort by closest text
        matchingTexts.sort((a, b) => a.distance - b.distance);
        
        let spotText = null;
        if (matchingTexts.length > 0) {
          const bestMatch = matchingTexts[0];
          spotText = bestMatch.content;
        }
        
        // Clean up text
        let cleanText = null;
        if (spotText) {
          cleanText = spotText.replace(/\s+/g, ' ').trim();
          
          // Extract just numbers/letters
          const spotNumberMatch = cleanText.match(/([A-Z]?\d+[A-Z]?|\b[A-Z]\d*\b)/i);
          if (spotNumberMatch) {
            cleanText = spotNumberMatch[1];
          }
        }
        
        const spotId = `spot_${floorId}_${shapeIndex}`;
        
        const spot = {
          id: spotId,
          svgX: shapeBBox.x,
          svgY: shapeBBox.y,
          svgWidth: shapeBBox.width,
          svgHeight: shapeBBox.height,
          color: normalizeColor(shape.color),
          type: shape.type,
          elementType: shape.element.tagName.toLowerCase(),
          
          // Using the new field structure that matches admin page
          companyName: 'Unassigned', // Will be overridden by database
          parkerName: null, // Will be overridden by database
          spotNumber: cleanText || `SPOT-${shapeIndex + 1}`, // Use detected text or generate
          originalSpotNumber: cleanText,
          spotType: 'regular', // Default spot type
          spotTypeConfig: SPOT_TYPES[0], // Default to regular
          
          hasText: !!cleanText,
          shapeIndex: shapeIndex,
          matchingTextsCount: matchingTexts.length,
          isCustomLabeled: false,
          isFromDatabase: false,
          dbId: null
        };
        
        spotsFound.push(spot);
        
      } catch (err) {
        console.error(`Error processing shape ${shapeIndex}:`, err);
      }
    });
    
    return spotsFound;
  };

  // ==================== MAIN FLOW: DETECT + READ FROM DB ====================
  
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
        setError('Parking map not available for this floor')
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [floorId])

  // Parse SVG when loaded
  useEffect(() => {
    if (!containerRef.current || loading || error) return

    const timer = setTimeout(async () => {
      const container = containerRef.current;
      if (!container) return;

      const svgElement = container.querySelector('svg');
      if (!svgElement) return;

      updateContainerRect();
      
      console.log('=== PUBLIC VIEW: LOADING PARKING SPOTS ===');
      
      try {
        // STEP 1: DETECT spots from SVG
        console.log('1. Detecting spots from SVG for positioning...');
        const detectedSpots = findSpotsWithText(svgElement);
        
        if (detectedSpots.length === 0) {
          console.log('No spots detected in SVG');
          setSpots([]);
          return;
        }
        
        // STEP 2: READ spots from database
        console.log('2. Reading spots from database...');
        const { data: databaseSpots, error: dbError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('floor_id', floorId)
        
        if (dbError) {
          console.error('Error reading from database:', dbError);
          setSpots(detectedSpots);
          return;
        }
        
        console.log(`Found ${databaseSpots?.length || 0} spots in database`);
        
        // STEP 3: MERGE detected spots with database data
        console.log('3. Merging SVG positions with database labels...');
        const mergedSpots = detectedSpots.map(detectedSpot => {
          // Find matching spot in database by position
          const matchingDbSpot = databaseSpots?.find(dbSpot => 
            Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 10 && 
            Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 10
          );
          
          if (matchingDbSpot) {
            // Get spot type config
            const spotType = matchingDbSpot.spot_type || 'regular';
            const spotTypeConfig = SPOT_TYPES.find(t => t.id === spotType) || SPOT_TYPES[0];
            
            // Map database fields to the new structure (same as admin page)
            return {
              ...detectedSpot,
              id: matchingDbSpot.id,
              dbId: matchingDbSpot.id,
              
              // NEW: Read the same data structure as admin page
              companyName: matchingDbSpot.display_label || 'Unassigned', // Company Name
              parkerName: matchingDbSpot.custom_label, // Parker Name
              spotNumber: matchingDbSpot.original_label || detectedSpot.spotNumber, // Spot Number
              spotType: spotType, // Add spot type
              spotTypeConfig: spotTypeConfig, // Add spot type config for colors
              
              originalSpotNumber: matchingDbSpot.original_label || detectedSpot.originalSpotNumber,
              isCustomLabeled: matchingDbSpot.is_custom_labeled,
              isFromDatabase: true
            };
          }
          
          // No match in database, use detected data
          return detectedSpot;
        });
        
        // Sort spots by position
        mergedSpots.sort((a, b) => {
          if (Math.abs(a.svgY - b.svgY) < 10) {
            return a.svgX - b.svgX;
          }
          return a.svgY - b.svgY;
        });
        
        console.log(`=== DISPLAYING ${mergedSpots.length} SPOTS ===`);
        console.log(`With company names: ${mergedSpots.filter(s => s.companyName && s.companyName !== 'Unassigned').length}`);
        console.log(`With parker names: ${mergedSpots.filter(s => s.parkerName).length}`);
        
        setSpots(mergedSpots);
        
      } catch (error) {
        console.error('Error loading spots:', error);
        setSpots([]);
      }
      
    }, 500);

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
    updateContainerRect(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIXED: Calculate spot position correctly
  const calculateSpotPosition = (spot) => {
    if (!spot || !svgDimensions.width || !svgDimensions.height) return null;
    
    // Convert SVG coordinates to percentages based on actual SVG dimensions
    const left = (spot.svgX / svgDimensions.width) * 100;
    const top = (spot.svgY / svgDimensions.height) * 100;
    const width = (spot.svgWidth / svgDimensions.width) * 100;
    const height = (spot.svgHeight / svgDimensions.height) * 100;
    
    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${Math.max(width, 1)}%`, // Ensure minimum width
      height: `${Math.max(height, 1)}%` // Ensure minimum height
    };
  };

  // Handle spot click
  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;

          // Determine dot color based on spot type ONLY (not availability)
          let dotColor = '#9ca3af'; // Default gray for unassigned with no type
          
          if (spot.spotTypeConfig) {
            // Use spot type color for all spots
            dotColor = spot.spotTypeConfig.color;
          }
          
          // Determine availability status for tooltip
          const isUnassigned = spot.companyName === 'Unassigned' || !spot.companyName;
          const availabilityStatus = isUnassigned ? 'Available (Unassigned)' : `Occupied by: ${spot.companyName}`;
          
          // Tooltip text
          const titleText = `${spot.spotNumber} • ${availabilityStatus}${spot.parkerName ? ` • Parker: ${spot.parkerName}` : ''}${spot.spotTypeConfig ? ` • ${spot.spotTypeConfig.name}` : ''}`;

          return (
            <div 
              key={spot.id} 
              className="absolute group" 
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
              }}
            >
              {/* COLORED DOT INDICATOR - Based on spot type ONLY */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200 pointer-events-none"
                  style={{ 
                    backgroundColor: dotColor,
                    borderColor: 'white'
                  }}
                ></div>
              </div>
              
              {/* HOVER AREA - Invisible but clickable */}
              <button
                className="absolute inset-0 cursor-pointer transition-all duration-200 border-2 border-transparent rounded pointer-events-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'transparent',
                }}
                onClick={() => handleSpotClick(spot)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = dotColor;
                  e.currentTarget.style.backgroundColor = `${dotColor}20`; // 20 = ~12.5% opacity
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={titleText}
              >
                {/* Invisible area - just for interaction */}
              </button>
              
              {/* TOOLTIP */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg min-w-[180px] z-50">
                <div className="font-bold text-center mb-1">{spot.spotNumber}</div>
                
                {/* Availability Status */}
                <div className="text-center mb-1">
                  {isUnassigned ? (
                    <span className="text-green-300">Available (Unassigned)</span>
                  ) : (
                    <span className="text-blue-300">Occupied by: {spot.companyName}</span>
                  )}
                </div>
                
                {spot.parkerName && (
                  <div className="text-center text-purple-300 mb-1">Parker: {spot.parkerName}</div>
                )}
                
                {spot.spotTypeConfig && (
                  <div className="text-center" style={{ color: spot.spotTypeConfig.color }}>
                    {spot.spotTypeConfig.name}
                  </div>
                )}
                
                {/* Downward-pointing triangle arrow */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                  <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parking map for floor {floorId}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Floor {floorId} - Parking Spaces
              </h1>
              <p className="text-gray-600 mt-1">
                View parking spots. Click on any spot for details.
              </p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">{spots.length} parking spots</span>
                  </div>
                  <span className="text-gray-600">
                    {spots.filter(s => s.companyName !== 'Unassigned').length > 0 && 
                      `${spots.filter(s => s.companyName !== 'Unassigned').length} occupied`}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div 
          ref={containerRef}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative"
        >
          <div className="w-full h-[900px] relative overflow-hidden">
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
              <div className="relative w-full h-full">
                <div 
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: 'white' }}
                >
                  <div 
                    ref={svgRef}
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
          
          {/* Legend/Help Text - UPDATED */}
          <div className="absolute bottom-2  bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs">
            <div className="text-gray-700 font-medium mb-2">Spot Type Colors:</div>
            {SPOT_TYPES.map(type => (
              <div key={type.id} className="flex items-center gap-1 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                <span className="text-gray-700">{type.name}</span>
              </div>
            ))}
          
          </div>
        </div>

        {/* Selected Spot Panel & Spot List */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selected Spot Panel */}
            <div className="lg:col-span-1">
              {selectedSpot ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Spot Details</h3>
                    <button
                      onClick={() => setSelectedSpot(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 mb-3">
                        {selectedSpot.spotNumber}
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Status</div>
                        <div className="font-medium text-gray-700">
                          {selectedSpot.companyName && selectedSpot.companyName !== 'Unassigned' 
                            ? `Occupied by: ${selectedSpot.companyName}`
                            : 'Available (Unassigned)'}
                        </div>
                      </div>
                      
                      {selectedSpot.parkerName && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500">Parker</div>
                          <div className="font-medium text-purple-700">
                            {selectedSpot.parkerName}
                          </div>
                        </div>
                      )}
                      
                      {selectedSpot.spotTypeConfig && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500">Spot Type</div>
                          <div className="font-medium" style={{ color: selectedSpot.spotTypeConfig.color }}>
                            {selectedSpot.spotTypeConfig.name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">
                    Click on any colored dot to view spot details
                  </p>
                </div>
              )}
            </div>

            {/* All Spots List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600">{spots.filter(s => s.companyName === 'Unassigned').length} available</span>
                    {' • '}
                    <span>{spots.filter(s => s.companyName !== 'Unassigned').length} occupied</span>
                  </div>
                </div>
                
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => {
                      const isAvailable = spot.companyName === 'Unassigned' || !spot.companyName;
                      const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0];
                      
                      return (
                        <div
                          key={spot.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedSpot?.id === spot.id 
                              ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' 
                              : isAvailable
                              ? 'border-green-300 bg-green-50/30'
                              : `border-gray-300 bg-gray-50/30`
                          }`}
                          style={{
                            borderLeftColor: spotTypeConfig.color,
                            borderLeftWidth: '4px'
                          }}
                          onClick={() => handleSpotClick(spot)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: spotTypeConfig.color }}
                              ></div>
                              <span className={`text-lg font-bold ${
                                isAvailable ? 'text-green-700' : 'text-gray-700'
                              }`}>
                                {spot.spotNumber}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm font-medium text-gray-900 truncate mb-1" title={spot.companyName}>
                            {!isAvailable ? spot.companyName : 'Available'}
                          </div>
                          
                          {spot.spotTypeConfig && (
                            <div className="text-xs text-gray-600 mb-1">
                              {spot.spotTypeConfig.name}
                            </div>
                          )}
                          
                          {spot.parkerName ? (
                            <div className="text-xs text-purple-600 truncate" title={spot.parkerName}>
                              Parker: {spot.parkerName}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">
                              {isAvailable ? 'Open for assignment' : 'Company spot'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No parking spots available for this floor</p>
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