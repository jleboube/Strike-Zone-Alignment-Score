import React from 'react'

function DataSummary({ summary }) {
  const stats = [
    { label: 'Total Pitches', value: summary.total_pitches?.toLocaleString() || '0', color: 'text-blue-400' },
    { label: 'Takes', value: summary.takes?.toLocaleString() || '0', color: 'text-green-400' },
    { label: 'Swings', value: summary.swings?.toLocaleString() || '0', color: 'text-yellow-400' },
    { label: 'Batters', value: summary.unique_batters?.toLocaleString() || '0', color: 'text-purple-400' },
  ]

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Available Data</h2>
        {summary.data_source && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-green-400 font-medium">
              {summary.data_source === 'statcast' ? 'MLB Statcast (Real Data)' : summary.data_source}
            </span>
          </div>
        )}
      </div>

      {summary.date_range?.start && summary.date_range?.end && (
        <p className="text-sm text-slate-400 mb-4">
          Data from {summary.date_range.start} to {summary.date_range.end}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {summary.zone_stats && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Pitch Outcomes</h3>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1.5 bg-green-900/30 text-green-400 rounded-full text-sm">
              Called Strikes: {summary.zone_stats.called_strikes?.toLocaleString()}
            </span>
            <span className="px-3 py-1.5 bg-red-900/30 text-red-400 rounded-full text-sm">
              Balls: {summary.zone_stats.balls?.toLocaleString()}
            </span>
            <span className="px-3 py-1.5 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
              Swinging Strikes: {summary.zone_stats.swinging_strikes?.toLocaleString()}
            </span>
            <span className="px-3 py-1.5 bg-blue-900/30 text-blue-400 rounded-full text-sm">
              Foul: {summary.zone_stats.foul?.toLocaleString()}
            </span>
            <span className="px-3 py-1.5 bg-purple-900/30 text-purple-400 rounded-full text-sm">
              In Play: {summary.zone_stats.in_play?.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataSummary
