// app/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
            // Map database fields to the new structure (same as admin page)
            return {
              ...detectedSpot,
              id: matchingDbSpot.id,
              dbId: matchingDbSpot.id,
              
              // NEW: Read the same data structure as admin page
              companyName: matchingDbSpot.display_label || 'Unassigned', // Company Name
              parkerName: matchingDbSpot.custom_label, // Parker Name
              spotNumber: matchingDbSpot.original_label || detectedSpot.spotNumber, // Spot Number
              
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

          // Determine what text to show on the spot
          const displayText = spot.spotNumber; // Show spot number by default
          const titleText = `${spot.spotNumber}${spot.companyName && spot.companyName !== 'Unassigned' ? ` • ${spot.companyName}` : ''}${spot.parkerName ? ` • 👤 ${spot.parkerName}` : ''}`;

          return (
            <button
              key={spot.id}
              className="absolute cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-blue-500 rounded pointer-events-auto group focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                e.currentTarget.style.borderColor = '#06b6d4';
                e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.zIndex = '1';
              }}
              title={titleText}
            >
              {/* Display the spot number on hover */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  spot.parkerName 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-black/70 text-white'
                }`}>
                  {displayText}
                </div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg min-w-[180px]">
                <div className="font-bold text-center mb-1">{spot.spotNumber}</div>
                
                {spot.companyName && spot.companyName !== 'Unassigned' && (
                  <div className="text-center text-blue-300 mb-1">🏢 {spot.companyName}</div>
                )}
                
                {spot.parkerName && (
                  <div className="text-center text-purple-300 mb-1">👤 {spot.parkerName}</div>
                )}
                
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
              </div>
            </button>
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
                    <div className="w-3 h-3 bg-[#80ffff] rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">{spots.length} parking spots</span>
                  </div>
                  <span className="text-gray-600">
                    {spots.filter(s => s.parkerName).length > 0 && 
                      `${spots.filter(s => s.parkerName).length} assigned`}
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
          <div className="w-full h-[800px] relative overflow-hidden">
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
                  className="absolute inset-0 w-full h-full flex items-center justify-center p-4"
                  style={{
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                  }}
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
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedSpot.spotNumber}
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Company</div>
                        <div className="font-medium text-gray-700">
                          {selectedSpot.companyName && selectedSpot.companyName !== 'Unassigned' 
                            ? `🏢 ${selectedSpot.companyName}`
                            : 'No company assigned'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">Parker</div>
                        <div className="font-medium text-purple-700">
                          {selectedSpot.parkerName 
                            ? `👤 ${selectedSpot.parkerName}`
                            : 'No parker assigned'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">
                    Click on any parking spot to view details
                  </p>
                </div>
              )}
            </div>

            {/* All Spots List - SIMPLIFIED (like admin page) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-purple-600">{spots.filter(s => s.parkerName).length} assigned</span>
                    {' • '}
                    <span className="text-green-600">{spots.filter(s => s.isFromDatabase).length} in system</span>
                  </div>
                </div>
                
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => (
                      <div
                        key={spot.id}
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
                              <div className="text-xs text-green-600" title="In system">💾</div>
                            )}
                            {spot.parkerName && (
                              <div className="text-xs text-purple-600">👤</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm font-medium text-gray-900 truncate mb-1" title={spot.companyName}>
                          {spot.companyName && spot.companyName !== 'Unassigned' 
                            ? spot.companyName 
                            : 'No company'}
                        </div>
                        
                        {spot.parkerName ? (
                          <div className="text-xs text-purple-600 truncate" title={spot.parkerName}>
                            👤 {spot.parkerName}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            Available
                          </div>
                        )}
                      </div>
                    ))}
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