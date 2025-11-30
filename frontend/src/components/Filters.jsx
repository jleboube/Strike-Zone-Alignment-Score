import React, { useMemo } from 'react'

function Filters({ filters, batters, umpires, onChange }) {
  // Find the selected batter's info
  const selectedBatter = useMemo(() => {
    if (!filters.batter_id) return null
    return batters.find(b => b.batter_id === filters.batter_id)
  }, [filters.batter_id, batters])

  // Determine if bat side dropdown should be shown
  // Only show for switch hitters (batters who bat from both sides)
  const showBatSide = selectedBatter?.is_switch_hitter === true

  // Get the batter's batting side if they're not a switch hitter
  const batterSide = useMemo(() => {
    if (!selectedBatter) return null
    if (selectedBatter.is_switch_hitter) return null
    // Non-switch hitter - they bat from one side only
    return selectedBatter.bat_sides?.[0] || null
  }, [selectedBatter])

  // Format bat side for display
  const formatBatSide = (side) => {
    if (side === 'L') return 'Left-Handed'
    if (side === 'R') return 'Right-Handed'
    return side
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Batter Select */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Batter
        </label>
        <select
          value={filters.batter_id || ''}
          onChange={(e) => {
            const newBatterId = e.target.value ? parseInt(e.target.value) : null
            onChange('batter_id', newBatterId)
            // Reset bat_side when batter changes
            onChange('bat_side', null)
          }}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Batters</option>
          {batters.map(batter => (
            <option key={batter.batter_id} value={batter.batter_id}>
              {batter.name} ({batter.pitch_count} pitches){batter.is_switch_hitter ? ' - Switch' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Umpire Select */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Home Plate Umpire
        </label>
        <select
          value={filters.umpire_id || ''}
          onChange={(e) => onChange('umpire_id', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Umpires</option>
          {umpires.map(umpire => (
            <option key={umpire.umpire_id} value={umpire.umpire_id}>
              {umpire.name} ({umpire.pitch_count.toLocaleString()} calls)
            </option>
          ))}
        </select>
      </div>

      {/* Bat Side - Only shown for switch hitters */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Bat Side
        </label>
        {showBatSide ? (
          // Switch hitter - show dropdown
          <select
            value={filters.bat_side || ''}
            onChange={(e) => onChange('bat_side', e.target.value || null)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Both Sides</option>
            {selectedBatter?.bat_sides?.map(side => (
              <option key={side} value={side}>
                {formatBatSide(side)}
              </option>
            ))}
          </select>
        ) : selectedBatter && batterSide ? (
          // Non-switch hitter - show their side as disabled info
          <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-400">
            {formatBatSide(batterSide)}
          </div>
        ) : (
          // No batter selected - show N/A
          <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500">
            Select a batter
          </div>
        )}
      </div>

      {/* Year */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Season
        </label>
        <select
          value={filters.year}
          onChange={(e) => onChange('year', parseInt(e.target.value))}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={2025}>2025</option>
          <option value={2024}>2024</option>
          <option value={2023}>2023</option>
          <option value={2022}>2022</option>
          <option value={2021}>2021</option>
          <option value={2020}>2020</option>
        </select>
      </div>
    </div>
  )
}

export default Filters
