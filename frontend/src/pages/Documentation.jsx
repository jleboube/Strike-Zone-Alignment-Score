import React from 'react'
import { Link } from 'react-router-dom'

function Documentation() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">SZ</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">SZAS</h1>
                <p className="text-sm text-slate-400">Strike Zone Alignment Score</p>
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                Calculator
              </Link>
              <Link to="/documentation" className="text-white font-medium">
                Documentation
              </Link>
              <Link to="/methodology" className="text-slate-300 hover:text-white transition-colors">
                Methodology
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Documentation</h1>

        {/* Quick Start */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Quick Start</h2>
          <p className="text-slate-300 mb-4">
            SZAS (Strike Zone Alignment Score) is a Sabermetric tool that quantifies alignment between
            three distinct strike zones in MLB baseball: the textbook rulebook zone, the umpire-called zone,
            and the batter-swing zone.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Select a batter from the dropdown (or leave as "All Batters")</li>
            <li>Optionally filter by umpire, bat side, or season</li>
            <li>Click "Calculate SZAS" to compute the alignment score</li>
            <li>View results in the score panel and interactive visualizations</li>
          </ol>
        </section>

        {/* API Reference */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">API Reference</h2>

          <div className="space-y-6">
            {/* Health Check */}
            <div className="border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-mono rounded">GET</span>
                <code className="text-blue-400">/api/health</code>
              </div>
              <p className="text-slate-400 text-sm">Health check endpoint to verify API status.</p>
            </div>

            {/* Calculate SZAS */}
            <div className="border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs font-mono rounded">POST</span>
                <code className="text-blue-400">/api/szas/calculate</code>
              </div>
              <p className="text-slate-400 text-sm mb-3">Calculate SZAS for given parameters.</p>
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Request Body:</p>
                <pre className="text-sm text-slate-300 overflow-x-auto">{`{
  "batter_id": 660271,      // Optional: MLB player ID
  "umpire_id": 427266,      // Optional: Umpire ID
  "year": 2024,             // Season year (default: 2024)
  "bat_side": "R",          // Optional: "L" or "R"
  "use_sample_data": true   // Use sample data (default: true)
}`}</pre>
              </div>
            </div>

            {/* Get Zones */}
            <div className="border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs font-mono rounded">POST</span>
                <code className="text-blue-400">/api/szas/zones</code>
              </div>
              <p className="text-slate-400 text-sm">Get zone probability surfaces for visualization.</p>
            </div>

            {/* Get Batters */}
            <div className="border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-mono rounded">GET</span>
                <code className="text-blue-400">/api/data/batters</code>
              </div>
              <p className="text-slate-400 text-sm">List available batters in the dataset.</p>
            </div>

            {/* Get Umpires */}
            <div className="border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-mono rounded">GET</span>
                <code className="text-blue-400">/api/data/umpires</code>
              </div>
              <p className="text-slate-400 text-sm">List available umpires in the dataset.</p>
            </div>

            {/* Get Summary */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-mono rounded">GET</span>
                <code className="text-blue-400">/api/data/summary</code>
              </div>
              <p className="text-slate-400 text-sm">Get summary statistics of available data.</p>
            </div>
          </div>
        </section>

        {/* Understanding Results */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Understanding Results</h2>

          <h3 className="text-lg font-medium text-white mt-6 mb-3">SZAS Score</h3>
          <p className="text-slate-300 mb-4">
            The main SZAS score ranges from 0 to 1 (displayed as 0-100), where higher values indicate
            better alignment between all three strike zones.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">80+</p>
              <p className="text-sm text-slate-400">Excellent</p>
            </div>
            <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-400">60-80</p>
              <p className="text-sm text-slate-400">Good</p>
            </div>
            <div className="p-4 bg-orange-900/20 border border-orange-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-400">40-60</p>
              <p className="text-sm text-slate-400">Fair</p>
            </div>
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-400">&lt;40</p>
              <p className="text-sm text-slate-400">Poor</p>
            </div>
          </div>

          <h3 className="text-lg font-medium text-white mt-6 mb-3">Component Metrics</h3>
          <ul className="space-y-2 text-slate-300">
            <li><strong className="text-white">IoU (Intersection over Union):</strong> Measures overlap between two zones. Higher IoU means more agreement.</li>
            <li><strong className="text-white">Divergence:</strong> Average difference between zone probability surfaces. Lower is better.</li>
            <li><strong className="text-white">Centroids:</strong> The center point of each zone's probability mass.</li>
          </ul>
        </section>

        {/* Data Sources */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Data Sources</h2>
          <p className="text-slate-300 mb-4">
            SZAS supports two data modes:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">Sample Data (Default)</h4>
              <p className="text-sm text-slate-400">
                5,000 synthetically generated pitches based on real MLB patterns. Includes 10 batters
                and 5 umpires with realistic zone variations. Great for testing and exploration.
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">Statcast Data</h4>
              <p className="text-sm text-slate-400">
                Real pitch data from MLB Statcast via the pybaseball library. Requires internet
                connection and may take longer to load. Set <code className="text-blue-400">use_sample_data: false</code> in API calls.
              </p>
            </div>
          </div>
        </section>

        {/* Glossary */}
        <section className="card p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Glossary</h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-medium text-white">Takes</dt>
              <dd className="text-slate-400 text-sm">Pitches where the batter did not swing (called strikes and balls)</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Swings</dt>
              <dd className="text-slate-400 text-sm">Pitches where the batter attempted to hit (includes contact and misses)</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Shadow Zone</dt>
              <dd className="text-slate-400 text-sm">The area just outside the textbook strike zone edges where umpire accuracy varies</dd>
            </div>
            <div>
              <dt className="font-medium text-white">plate_x / px</dt>
              <dd className="text-slate-400 text-sm">Horizontal position of the pitch crossing home plate (feet from center)</dd>
            </div>
            <div>
              <dt className="font-medium text-white">plate_z / pz</dt>
              <dd className="text-slate-400 text-sm">Vertical position of the pitch crossing home plate (feet above ground)</dd>
            </div>
            <div>
              <dt className="font-medium text-white">sz_top / sz_bot</dt>
              <dd className="text-slate-400 text-sm">Top and bottom of the batter's personalized strike zone</dd>
            </div>
          </dl>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-slate-500">
        <p>SZAS - Strike Zone Alignment Score | A Sabermetric Analysis Tool</p>
      </footer>
    </div>
  )
}

export default Documentation
