import React from 'react'

function ResultsPanel({ result }) {
  const { szas, components, centroids, zone_bounds, data_stats, interpretation } = result

  // Determine score quality
  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    if (score >= 0.4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    if (score >= 0.4) return 'Fair'
    return 'Poor'
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-white mb-6">SZAS Results</h2>

      {/* Main Score */}
      <div className="text-center mb-8 p-6 bg-slate-900/50 rounded-xl">
        <p className="text-sm text-slate-400 mb-2">Strike Zone Alignment Score</p>
        <p className={`text-6xl font-bold ${getScoreColor(szas)}`}>
          {(szas * 100).toFixed(1)}
        </p>
        <p className={`text-lg font-medium mt-2 ${getScoreColor(szas)}`}>
          {getScoreLabel(szas)}
        </p>
      </div>

      {/* Component Scores */}
      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-medium text-slate-300">Component Metrics</h3>

        <div className="grid grid-cols-1 gap-3">
          <MetricBar
            label="Textbook-Umpire IoU"
            value={components.iou_textbook_umpire}
            color="bg-blue-500"
          />
          <MetricBar
            label="Textbook-Batter IoU"
            value={components.iou_textbook_batter}
            color="bg-yellow-500"
          />
          <MetricBar
            label="Umpire-Batter IoU"
            value={components.iou_umpire_batter}
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Divergence Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">Umpire Divergence</p>
          <p className="text-lg font-semibold text-white">
            {(components.divergence_umpire * 100).toFixed(1)}%
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">Batter Divergence</p>
          <p className="text-lg font-semibold text-white">
            {(components.divergence_batter * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Zone Bounds */}
      <div className="p-4 bg-slate-900/50 rounded-lg mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Strike Zone Bounds</h4>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">
            Top: <span className="text-white">{zone_bounds.sz_top} ft</span>
          </span>
          <span className="text-slate-400">
            Bottom: <span className="text-white">{zone_bounds.sz_bot} ft</span>
          </span>
        </div>
      </div>

      {/* Data Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Pitches" value={data_stats.total_pitches} />
        <StatCard label="Takes" value={data_stats.takes} />
        <StatCard label="Swings" value={data_stats.swings} />
        <StatCard label="Called K" value={data_stats.called_strikes} />
      </div>

      {/* Interpretation */}
      <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">Analysis</h4>
        <p className="text-sm text-slate-300">{interpretation}</p>
      </div>
    </div>
  )
}

function MetricBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg text-center">
      <p className="text-lg font-bold text-white">{value?.toLocaleString()}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

export default ResultsPanel
