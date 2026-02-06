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

  // Find spots with text - FIXED VERSION
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
          text: cleanText || "Unlabeled",
          originalText: cleanText,
          customLabel: null,
          hasText: !!cleanText,
          shapeIndex: shapeIndex,
          matchingTextsCount: matchingTexts.length,
          isCustomLabeled: false
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
            return {
              ...detectedSpot,
              id: matchingDbSpot.id,
              text: matchingDbSpot.display_label,
              customLabel: matchingDbSpot.custom_label,
              originalText: matchingDbSpot.original_label || detectedSpot.originalText,
              isCustomLabeled: matchingDbSpot.is_custom_labeled,
              dbId: matchingDbSpot.id
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
        console.log(`Custom labels from DB: ${mergedSpots.filter(s => s.isCustomLabeled).length}`);
        
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

  // Get spot type display name
  const getSpotTypeDisplay = (type) => {
    const typeMap = {
      'cyan': 'Cyan Spot',
      'yellow': 'Yellow Spot'
    }
    return typeMap[type] || type
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;

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
                e.currentTarget.style.borderColor = spot.type === 'cyan' ? '#06b6d4' : '#eab308';
                e.currentTarget.style.backgroundColor = spot.type === 'cyan' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(234, 179, 8, 0.1)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.zIndex = '1';
              }}
              title={`${spot.text} (${getSpotTypeDisplay(spot.type)})${spot.isCustomLabeled ? ' ✏️' : ''}`}
            >
              {/* Display the spot label on hover */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white`}>
                  {spot.text}
                </div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                <div className="font-bold text-center">{spot.text}</div>
                <div className="text-xs opacity-75 text-center mt-1 capitalize">
                  {getSpotTypeDisplay(spot.type)}
                </div>
                {spot.isCustomLabeled && (
                  <div className="text-xs text-purple-300 text-center mt-1">Custom Label</div>
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
                    <span className="text-gray-600">Cyan Spots</span>
                    <div className="w-3 h-3 bg-[#ffff80] rounded-sm border border-gray-300 ml-4"></div>
                    <span className="text-gray-600">Yellow Spots</span>
                  </div>
                  <span className="text-gray-600">
                    {spots.length} parking spots
                    {spots.filter(s => s.isCustomLabeled).length > 0 && 
                      ` • ${spots.filter(s => s.isCustomLabeled).length} custom labels`}
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
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{selectedSpot.text}</div>
                        {selectedSpot.originalText && selectedSpot.originalText !== selectedSpot.text && (
                          <div className="text-xs text-gray-500 mt-1">
                            Original: {selectedSpot.originalText}
                          </div>
                        )}
                      </div>
                      {selectedSpot.isCustomLabeled && (
                        <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          Custom Label
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
                            <span className="text-sm font-medium capitalize">
                              {getSpotTypeDisplay(selectedSpot.type)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Position</div>
                          <div className="text-sm font-mono mt-1">
                            {selectedSpot.svgX.toFixed(0)}, {selectedSpot.svgY.toFixed(0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Dimensions</div>
                          <div className="text-sm font-mono mt-1">
                            {selectedSpot.svgWidth.toFixed(0)} × {selectedSpot.svgHeight.toFixed(0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="text-sm mt-1">
                            {selectedSpot.isCustomLabeled ? 'Custom Label' : 'Standard Label'}
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
                    Click on any parking spot to view details
                  </p>
                </div>
              )}
            </div>

            {/* All Spots List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">All Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    {spots.filter(s => s.isCustomLabeled).length} custom labels
                  </div>
                </div>
                
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => (
                      <button
                        key={spot.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          selectedSpot?.id === spot.id 
                            ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' 
                            : spot.isCustomLabeled
                            ? 'border-purple-300 bg-purple-50/50 hover:bg-purple-100'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSpotClick(spot)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded border border-gray-300"
                              style={{ backgroundColor: spot.color }}
                            />
                            <span className={`font-bold ${
                              spot.isCustomLabeled ? 'text-purple-700' : 'text-gray-900'
                            }`}>
                              {spot.text}
                            </span>
                          </div>
                          {spot.isCustomLabeled && (
                            <div className="text-xs text-purple-600">✏️</div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="capitalize">{getSpotTypeDisplay(spot.type)}</div>
                          <div className="flex justify-between">
                            <span className="font-mono">
                              {spot.svgWidth.toFixed(0)}×{spot.svgHeight.toFixed(0)}
                            </span>
                            {spot.originalText && spot.originalText !== spot.text && (
                              <span className="text-gray-400" title="Original label">
                                {spot.originalText}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No parking spots available for this floor
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