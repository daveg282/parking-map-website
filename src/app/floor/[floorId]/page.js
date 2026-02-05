'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// Add this export
export const dynamicParams = true;

export async function generateStaticParams() {
  // Pre-render some floors, others will be rendered at runtime
  return [
    { floorId: '1' },
    { floorId: '2' },
  ]
} 

export default function FloorPage() {
  const params = useParams()
  const floorId = params.floorId || '1'

  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [editingLabel, setEditingLabel] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 800 })
  const [containerRect, setContainerRect] = useState(null)
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  // Load saved spots from localStorage
  useEffect(() => {
    if (!floorId) return
    
    const savedSpots = localStorage.getItem(`parking_spots_floor_${floorId}`);
    if (savedSpots) {
      try {
        const parsedSpots = JSON.parse(savedSpots);
        console.log(`Loaded ${parsedSpots.length} saved spots from localStorage`);
      } catch (err) {
        console.error('Error loading saved spots:', err);
      }
    }
  }, [floorId]);

  // Save spots to localStorage whenever they change
  useEffect(() => {
    if (spots.length > 0 && floorId) {
      const spotsToSave = spots.map(spot => ({
        id: spot.id,
        text: spot.text,
        customLabel: spot.customLabel,
        type: spot.type,
        color: spot.color,
        svgX: spot.svgX,
        svgY: spot.svgY,
        svgWidth: spot.svgWidth,
        svgHeight: spot.svgHeight,
        hasText: spot.hasText,
        elementType: spot.elementType
      }));
      
      localStorage.setItem(`parking_spots_floor_${floorId}`, JSON.stringify(spotsToSave));
      console.log(`Saved ${spots.length} spots to localStorage for floor ${floorId}`);
    }
  }, [spots, floorId]);
   
  


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
    
    // First, get ALL colored shapes that could be parking spots
    const allElements = svgElement.querySelectorAll('*');
    const coloredShapes = [];
    
    // Collect all colored shapes first
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
        // Skip elements that can't be processed
      }
    });
    
    console.log(`Found ${coloredShapes.length} colored shapes`);
    
    // Now get ALL text elements in the SVG
    const allTextElements = Array.from(svgElement.querySelectorAll('text'));
    console.log(`Found ${allTextElements.length} text elements total`);
    
    // For each colored shape, find the text that's INSIDE it or ON it
    coloredShapes.forEach((shape, shapeIndex) => {
      try {
        const shapeBBox = shape.bbox;
        
        // Find text elements whose bounding box is INSIDE or VERY NEAR the shape
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
            
            // Check if text is very close to the shape
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
          } catch (err) {
            // Skip text elements without valid bbox
          }
        });
        
        // Sort by closest text
        matchingTexts.sort((a, b) => a.distance - b.distance);
        
        let spotText = null;
        if (matchingTexts.length > 0) {
          const bestMatch = matchingTexts[0];
          spotText = bestMatch.content;
          
          console.log(`Shape ${shapeIndex}: Found text "${spotText}"`);
        }
        
        // Get screen coordinates for the shape
        const svgPoint = svgElement.createSVGPoint();
        const points = [
          { x: shapeBBox.x, y: shapeBBox.y },
          { x: shapeBBox.x + shapeBBox.width, y: shapeBBox.y },
          { x: shapeBBox.x, y: shapeBBox.y + shapeBBox.height },
          { x: shapeBBox.x + shapeBBox.width, y: shapeBBox.y + shapeBBox.height }
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
        
        // Clean up text content
        let cleanText = null;
        if (spotText) {
          cleanText = spotText.replace(/\s+/g, ' ').trim();
          
          // Extract just numbers/letters
          const spotNumberMatch = cleanText.match(/([A-Z]?\d+[A-Z]?|\b[A-Z]\d*\b)/i);
          if (spotNumberMatch) {
            cleanText = spotNumberMatch[1];
          }
        }
        
        // Generate unique ID
        const spotId = `spot_${floorId}_${shapeIndex}_${Date.now()}`;
        
        // Check if we have saved data for this spot
        const savedSpots = JSON.parse(localStorage.getItem(`parking_spots_floor_${floorId}`) || '[]');
        const savedSpot = savedSpots.find(s => 
          Math.abs(s.svgX - shapeBBox.x) < 5 && 
          Math.abs(s.svgY - shapeBBox.y) < 5
        );
        
        const spot = {
          id: spotId,
          svgX: shapeBBox.x,
          svgY: shapeBBox.y,
          svgWidth: shapeBBox.width,
          svgHeight: shapeBBox.height,
          screenX,
          screenY,
          screenWidth,
          screenHeight,
          color: normalizeColor(shape.color),
          type: shape.type,
          elementType: shape.element.tagName.toLowerCase(),
          text: cleanText || (savedSpot?.customLabel) || "Unlabeled",
          originalText: cleanText,
          customLabel: savedSpot?.customLabel || null,
          hasText: !!cleanText,
          rawElement: shape.element,
          shapeIndex: shapeIndex,
          matchingTextsCount: matchingTexts.length,
          isCustomLabeled: !!savedSpot?.customLabel
        };
        
        spotsFound.push(spot);
        
      } catch (err) {
        console.error(`Error processing shape ${shapeIndex}:`, err);
      }
    });
    
    return spotsFound;
  };

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

  // Parse SVG when loaded
  useEffect(() => {
    if (!svgRef.current || loading || error) return

    const timer = setTimeout(() => {
      const svgElement = svgRef.current?.querySelector('svg')
      if (!svgElement) return

      updateContainerRect();
      
      console.log('=== STARTING SPOT DETECTION ===');
      const spotsFound = findSpotsWithText(svgElement);
      
      // Load saved spots and merge with detected spots
      const savedSpots = JSON.parse(localStorage.getItem(`parking_spots_floor_${floorId}`) || '[]');
      
      // Merge saved custom labels with detected spots
      spotsFound.forEach(spot => {
        const savedSpot = savedSpots.find(s => 
          Math.abs(s.svgX - spot.svgX) < 5 && 
          Math.abs(s.svgY - spot.svgY) < 5
        );
        
        if (savedSpot?.customLabel) {
          spot.customLabel = savedSpot.customLabel;
          spot.text = savedSpot.customLabel;
          spot.isCustomLabeled = true;
        }
      });
      
      console.log(`=== TOTAL: ${spotsFound.length} spots found ===`);
      setSpots(spotsFound);
      
    }, 500);

    return () => clearTimeout(timer);
  }, [svgContent, loading, error, floorId]);

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

  // Handle spot click - show edit options
  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    setCustomLabel(spot.customLabel || spot.text || '');
    
    console.log('Clicked spot:', {
      text: spot.text,
      customLabel: spot.customLabel,
      originalText: spot.originalText,
      isCustomLabeled: spot.isCustomLabeled
    });
  };

  // Start editing label
  const startEditingLabel = () => {
    if (!selectedSpot) return;
    setEditingLabel(true);
    setCustomLabel(selectedSpot.customLabel || selectedSpot.text || '');
  };

  // Save custom label
  const saveCustomLabel = () => {
    if (!selectedSpot || !customLabel.trim()) return;
    
    const updatedSpots = spots.map(spot => {
      if (spot.id === selectedSpot.id) {
        return {
          ...spot,
          customLabel: customLabel.trim(),
          text: customLabel.trim(),
          isCustomLabeled: true
        };
      }
      return spot;
    });
    
    setSpots(updatedSpots);
    setSelectedSpot(prev => ({
      ...prev,
      customLabel: customLabel.trim(),
      text: customLabel.trim(),
      isCustomLabeled: true
    }));
    setEditingLabel(false);
    
    // Show confirmation
    alert(`✅ Label saved as: "${customLabel.trim()}"`);
  };

  // Clear custom label (revert to original)
  const clearCustomLabel = () => {
    if (!selectedSpot) return;
    
    const updatedSpots = spots.map(spot => {
      if (spot.id === selectedSpot.id) {
        return {
          ...spot,
          customLabel: null,
          text: spot.originalText || 'Unlabeled',
          isCustomLabeled: false
        };
      }
      return spot;
    });
    
    setSpots(updatedSpots);
    setSelectedSpot(prev => ({
      ...prev,
      customLabel: null,
      text: prev.originalText || 'Unlabeled',
      isCustomLabeled: false
    }));
    setCustomLabel(prev => prev.originalText || 'Unlabeled');
    setEditingLabel(false);
  };

  // Export spots data
  const exportSpotsData = () => {
    const dataToExport = spots.map(spot => ({
      id: spot.id,
      label: spot.text,
      customLabel: spot.customLabel,
      originalText: spot.originalText,
      type: spot.type,
      color: spot.color,
      coordinates: { x: spot.svgX, y: spot.svgY },
      dimensions: { width: spot.svgWidth, height: spot.svgHeight },
      floor: floorId,
      timestamp: new Date().toISOString()
    }));
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `parking_spots_floor_${floorId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`✅ Exported ${spots.length} spots to JSON file!`);
  };

  // Clear all saved data for this floor
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all saved labels for this floor? This cannot be undone.')) {
      localStorage.removeItem(`parking_spots_floor_${floorId}`);
      const updatedSpots = spots.map(spot => ({
        ...spot,
        customLabel: null,
        text: spot.originalText || 'Unlabeled',
        isCustomLabeled: false
      }));
      
      setSpots(updatedSpots);
      setSelectedSpot(null);
      setEditingLabel(false);
      alert('✅ All labels cleared!');
    }
  };

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0 || !containerRect) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot);
          if (!pos) return null;

          return (
            <div
              key={spot.id}
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
              title={`${spot.text} (${spot.type})${spot.isCustomLabeled ? ' ✏️' : ''}`}
            >
              {/* Display label badge for custom labels */}
              {spot.isCustomLabeled && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ✏️
                </div>
              )}
              
              {/* Display the spot label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  spot.isCustomLabeled 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-black/70 text-white'
                }`}>
                  {spot.text}
                </div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                <div className="font-bold text-center">{spot.text}</div>
                <div className="text-xs opacity-75 text-center mt-1">
                  {spot.type} spot {spot.isCustomLabeled && '✏️'}
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
                Click spots to view/edit labels. Labels are saved automatically.
              </p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#80ffff] rounded-sm border border-gray-300"></div>
                    <div className="w-3 h-3 bg-[#ffff80] rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">
                      {spots.length} spots • {spots.filter(s => s.isCustomLabeled).length} labeled
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
           
              <button
                onClick={clearAllData}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                Clear All
              </button>
              <Link 
                href="/" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
              >
                ← Overview
              </Link>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div 
          ref={containerRef}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="w-full h-[600px] flex items-center justify-center bg-white relative">
            {loading && (
              <div className="text-center absolute inset-0 flex items-center justify-center bg-white z-10">
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading floor {floorId} parking spaces...</p>
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
              <div ref={svgRef} className="relative w-full h-full overflow-auto">
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

        {/* Selected Spot Panel & Spot List */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selected Spot Panel */}
            <div className="lg:col-span-1">
              {selectedSpot ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Selected Spot</h3>
                    <button
                      onClick={() => setSelectedSpot(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Spot label display/edit */}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter custom label..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveCustomLabel}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Save
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
                            >
                              <span>✏️</span>
                              <span>Edit Label</span>
                            </button>
                            {selectedSpot.isCustomLabeled && (
                              <button
                                onClick={clearCustomLabel}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Spot details */}
                    <div className="pt-4 border-t border-gray-200">
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
                        <div>
                          <div className="text-xs text-gray-500">Dimensions</div>
                          <div className="text-sm font-mono mt-1">
                            {selectedSpot.svgWidth.toFixed(0)} × {selectedSpot.svgHeight.toFixed(0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Element</div>
                          <div className="text-sm font-mono mt-1">
                            {selectedSpot.elementType}
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
                    Click on any parking spot to view and edit its label
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
                    {spots.filter(s => s.isCustomLabeled).length} labeled
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
                            : spot.isCustomLabeled
                            ? 'border-purple-300 bg-purple-50/50'
                            : 'border-gray-200 hover:bg-gray-50'
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
                          <div className="capitalize">{spot.type}</div>
                          <div className="flex justify-between">
                            <span>{spot.svgWidth.toFixed(0)}×{spot.svgHeight.toFixed(0)}</span>
                            {spot.originalText && spot.originalText !== spot.text && (
                              <span className="text-gray-400" title="Original text">
                                {spot.originalText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No parking spots detected
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