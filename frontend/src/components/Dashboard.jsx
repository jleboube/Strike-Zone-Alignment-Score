import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'

function Dashboard({ szasResult, zoneData }) {
  const { components, centroids, data_stats } = szasResult

  // Prepare data for IoU comparison chart
  const iouData = [
    { name: 'Text-Ump', value: components.iou_textbook_umpire * 100, fill: '#3b82f6' },
    { name: 'Text-Bat', value: components.iou_textbook_batter * 100, fill: '#f59e0b' },
    { name: 'Ump-Bat', value: components.iou_umpire_batter * 100, fill: '#8b5cf6' },
  ]

  // Prepare data for radar chart
  const radarData = [
    {
      metric: 'Textbook-Umpire',
      value: components.iou_textbook_umpire * 100,
    },
    {
      metric: 'Textbook-Batter',
      value: components.iou_textbook_batter * 100,
    },
    {
      metric: 'Umpire-Batter',
      value: components.iou_umpire_batter * 100,
    },
    {
      metric: 'Ump Accuracy',
      value: (1 - components.divergence_umpire) * 100,
    },
    {
      metric: 'Bat Discipline',
      value: (1 - components.divergence_batter) * 100,
    },
  ]

  // Centroid comparison data
  const centroidData = [
    { name: 'Textbook', x: centroids.textbook.x, z: centroids.textbook.z },
    { name: 'Umpire', x: centroids.umpire.x, z: centroids.umpire.z },
    { name: 'Batter', x: centroids.batter.x, z: centroids.batter.z },
  ]

  return (
    <div className="space-y-8">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* IoU Bar Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Zone Overlap (IoU)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={iouData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`${value.toFixed(1)}%`, 'IoU']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Zone Analysis Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
              <Radar
                name="Alignment"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.5}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value) => [`${value.toFixed(1)}%`]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Centroid Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Zone Centroid Positions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {centroidData.map((centroid) => (
            <div key={centroid.name} className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2">{centroid.name} Zone Center</h4>
              <div className="flex justify-between">
                <div>
                  <span className="text-xs text-slate-400">Horizontal</span>
                  <p className="text-lg font-semibold text-white">{centroid.x.toFixed(3)} ft</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Vertical</span>
                  <p className="text-lg font-semibold text-white">{centroid.z.toFixed(3)} ft</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Explanation */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SZAS Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
          <div>
            <h4 className="font-medium text-white mb-2">Three Strike Zones</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 mt-1 bg-green-500 rounded flex-shrink-0"></span>
                <span><strong>Textbook:</strong> MLB rulebook definition - 17" wide plate, knees to midpoint of torso</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 mt-1 bg-blue-500 rounded flex-shrink-0"></span>
                <span><strong>Umpire:</strong> Probabilistic zone based on called strikes (takes only)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 mt-1 bg-amber-500 rounded flex-shrink-0"></span>
                <span><strong>Batter:</strong> Swing density zone showing where batters choose to swing</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Score Calculation</h4>
            <div className="p-3 bg-slate-800 rounded-lg font-mono text-xs">
              SZAS = (IoU_text_ump + IoU_text_bat + IoU_ump_bat) / 3 * (1 - bias)
            </div>
            <p className="mt-2">
              IoU (Intersection over Union) measures overlap between zones.
              Higher SZAS indicates better alignment across all three perspectives.
            </p>
          </div>
        </div>

        {/* 2025 Context */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-300 mb-2">2025 Season Context</h4>
          <p className="text-sm text-slate-300">
            MLB reduced the umpire evaluation buffer from 2 inches to 0.75 inches around zone edges,
            resulting in 88%+ overall call accuracy and fewer borderline strikes. This affects both
            umpire zone modeling and batter swing decisions, with increased walk rates and more
            takes on shadow-zone pitches.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
