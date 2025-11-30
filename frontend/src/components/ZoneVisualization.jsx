import React, { useState, useMemo } from 'react'

function ZoneVisualization({ zoneData }) {
  const [activeZone, setActiveZone] = useState('all')
  const [showPitches, setShowPitches] = useState(true)

  const { x_values, z_values, textbook_zone, umpire_zone, batter_zone, zone_bounds, pitch_locations } = zoneData

  // Canvas dimensions
  const width = 400
  const height = 400
  const padding = 40

  // Scale functions
  const xMin = Math.min(...x_values)
  const xMax = Math.max(...x_values)
  const zMin = Math.min(...z_values)
  const zMax = Math.max(...z_values)

  const scaleX = (x) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
  const scaleZ = (z) => height - padding - ((z - zMin) / (zMax - zMin)) * (height - 2 * padding)

  // Plate boundaries for visual
  const plateLeft = scaleX(zone_bounds.plate_left)
  const plateRight = scaleX(zone_bounds.plate_right)
  const plateTop = scaleZ(zone_bounds.sz_top)
  const plateBottom = scaleZ(zone_bounds.sz_bot)

  // Generate heatmap cells
  const heatmapCells = useMemo(() => {
    const cells = []
    const cellWidth = (width - 2 * padding) / (x_values.length - 1)
    const cellHeight = (height - 2 * padding) / (z_values.length - 1)

    for (let i = 0; i < z_values.length - 1; i++) {
      for (let j = 0; j < x_values.length - 1; j++) {
        let value = 0
        if (activeZone === 'textbook' || activeZone === 'all') {
          value = Math.max(value, textbook_zone[i][j])
        }
        if (activeZone === 'umpire' || activeZone === 'all') {
          value = activeZone === 'all' ? Math.max(value, umpire_zone[i][j] * 0.8) : umpire_zone[i][j]
        }
        if (activeZone === 'batter' || activeZone === 'all') {
          value = activeZone === 'all' ? Math.max(value, batter_zone[i][j] * 0.6) : batter_zone[i][j]
        }

        const color = getHeatmapColor(value, activeZone)

        cells.push({
          x: padding + j * cellWidth,
          y: height - padding - (i + 1) * cellHeight,
          width: cellWidth,
          height: cellHeight,
          color,
          value
        })
      }
    }
    return cells
  }, [activeZone, textbook_zone, umpire_zone, batter_zone, x_values, z_values])

  function getHeatmapColor(value, zone) {
    const alpha = Math.min(value * 0.9, 0.9)

    switch (zone) {
      case 'textbook':
        return `rgba(34, 197, 94, ${alpha})`  // green
      case 'umpire':
        return `rgba(59, 130, 246, ${alpha})` // blue
      case 'batter':
        return `rgba(245, 158, 11, ${alpha})` // amber
      default:
        // Gradient from red to yellow to green
        if (value < 0.5) {
          const r = 239
          const g = Math.round(68 + (value * 2) * (179 - 68))
          const b = 68
          return `rgba(${r}, ${g}, ${b}, ${alpha})`
        } else {
          const r = Math.round(239 - ((value - 0.5) * 2) * (239 - 34))
          const g = Math.round(179 + ((value - 0.5) * 2) * (197 - 179))
          const b = Math.round(68 + ((value - 0.5) * 2) * (94 - 68))
          return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Zone Visualization</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showPitches}
              onChange={(e) => setShowPitches(e.target.checked)}
              className="rounded border-slate-600"
            />
            Show Pitches
          </label>
        </div>
      </div>

      {/* Zone Toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'textbook', 'umpire', 'batter'].map((zone) => (
          <button
            key={zone}
            onClick={() => setActiveZone(zone)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeZone === zone
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {zone.charAt(0).toUpperCase() + zone.slice(1)}
          </button>
        ))}
      </div>

      {/* SVG Visualization */}
      <div className="flex justify-center">
        <svg width={width} height={height} className="bg-slate-900 rounded-lg">
          {/* Heatmap */}
          {heatmapCells.map((cell, idx) => (
            <rect
              key={idx}
              x={cell.x}
              y={cell.y}
              width={cell.width}
              height={cell.height}
              fill={cell.color}
            />
          ))}

          {/* Textbook Zone Outline */}
          <rect
            x={plateLeft}
            y={plateTop}
            width={plateRight - plateLeft}
            height={plateBottom - plateTop}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray={activeZone === 'textbook' ? '0' : '5,5'}
          />

          {/* Home Plate */}
          <path
            d={`M ${scaleX(-0.708)} ${scaleZ(0.5)}
                L ${scaleX(-0.708)} ${scaleZ(0.3)}
                L ${scaleX(0)} ${scaleZ(0.1)}
                L ${scaleX(0.708)} ${scaleZ(0.3)}
                L ${scaleX(0.708)} ${scaleZ(0.5)} Z`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Pitch Locations */}
          {showPitches && pitch_locations.takes.x.map((x, idx) => (
            <circle
              key={`take-${idx}`}
              cx={scaleX(x)}
              cy={scaleZ(pitch_locations.takes.z[idx])}
              r="3"
              fill={pitch_locations.takes.is_strike[idx] ? '#22c55e' : '#ef4444'}
              opacity="0.6"
            />
          ))}

          {showPitches && pitch_locations.swings.x.map((x, idx) => (
            <circle
              key={`swing-${idx}`}
              cx={scaleX(x)}
              cy={scaleZ(pitch_locations.swings.z[idx])}
              r="3"
              fill="#f59e0b"
              opacity="0.4"
            />
          ))}

          {/* Axis Labels */}
          <text x={width / 2} y={height - 10} textAnchor="middle" fill="#94a3b8" fontSize="12">
            Horizontal Position (ft)
          </text>
          <text x={15} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize="12" transform={`rotate(-90, 15, ${height / 2})`}>
            Height (ft)
          </text>

          {/* Grid Lines */}
          {[-1, -0.5, 0, 0.5, 1].map((x) => (
            <line
              key={`vline-${x}`}
              x1={scaleX(x)}
              y1={padding}
              x2={scaleX(x)}
              y2={height - padding}
              stroke="#334155"
              strokeWidth="1"
            />
          ))}
          {[1.5, 2, 2.5, 3, 3.5, 4].map((z) => (
            <line
              key={`hline-${z}`}
              x1={padding}
              y1={scaleZ(z)}
              x2={width - padding}
              y2={scaleZ(z)}
              stroke="#334155"
              strokeWidth="1"
            />
          ))}

          {/* Tick Labels */}
          {[-1, 0, 1].map((x) => (
            <text
              key={`xlabel-${x}`}
              x={scaleX(x)}
              y={height - padding + 15}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
            >
              {x}
            </text>
          ))}
          {[1.5, 2.5, 3.5].map((z) => (
            <text
              key={`zlabel-${z}`}
              x={padding - 10}
              y={scaleZ(z) + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
            >
              {z}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-300">Textbook Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-slate-300">Umpire Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="text-slate-300">Batter Zone</span>
        </div>
        {showPitches && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-300">Called Strike</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-300">Ball</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ZoneVisualization
