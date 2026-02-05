'use client'

import { useEffect, useState } from 'react'

export default function SVGOverlay({ floor }) {
  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)

  const getSvgPath = (floorNum) => {
    return `/overlays/parking_page_${floorNum}.svg`
  }

  useEffect(() => {
    const loadSVG = async () => {
      setLoading(true)
      
      try {
        const response = await fetch(getSvgPath(floor))
        const text = await response.text()
        setSvgContent(text)
      } catch (error) {
        console.log('No SVG overlay found for floor', floor)
        // Don't set error, just don't show SVG
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [floor])

  if (loading) return null
  if (!svgContent) return null

  return (
    <div 
      className="absolute top-0 left-0 w-full h-full"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}