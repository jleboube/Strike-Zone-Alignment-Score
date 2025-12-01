import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

function Bayesian() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [results, setResults] = useState(null)
  const [topN, setTopN] = useState(5)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/bayesian/status`)
      setStatus(res.data)
    } catch (err) {
      console.error('Error checking status:', err)
      setStatus({ available: false, reason: 'API error' })
    }
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await axios.post(`${API_BASE}/api/bayesian/analyze`, {
        top_n: topN,
        year: 2025
      })
      setResults(res.data)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.response?.data?.message || 'Error running analysis')
    } finally {
      setLoading(false)
    }
  }

  const formatCoefficient = (coef) => {
    if (coef === undefined || coef === null) return 'N/A'
    const sign = coef >= 0 ? '+' : ''
    return `${sign}${coef.toFixed(4)}`
  }

  const getInfluenceColor = (coef) => {
    if (coef === undefined || coef === null) return 'text-slate-400'
    if (Math.abs(coef) < 0.1) return 'text-slate-400'
    return coef < 0 ? 'text-amber-400' : 'text-blue-400'
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">B</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Bayesian Analysis</h1>
                <p className="text-sm text-slate-400">Umpire Influence Study</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                SZAS Calculator
              </Link>
              <Link to="/bayesian" className="text-white font-medium">
                Bayesian Method
              </Link>
              <Link to="/documentation" className="text-slate-300 hover:text-white transition-colors">
                Documentation
              </Link>
              <Link to="/methodology" className="text-slate-300 hover:text-white transition-colors">
                Methodology
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">The Freeswinger Effect</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 mb-4">
              This analysis explores whether umpires are influenced by a batter's swing behavior when making ball/strike calls.
              Based on research proposed by <span className="text-amber-400">Tangotiger</span>, we examine three strike zones:
            </p>
            <ul className="text-slate-300 space-y-2 mb-4">
              <li><strong className="text-blue-400">Textbook Zone:</strong> The rulebook strike zone</li>
              <li><strong className="text-green-400">Umpire Zone:</strong> What the umpire actually calls (on takes)</li>
              <li><strong className="text-purple-400">Batter Zone:</strong> Where the batter swings (their personal zone)</li>
            </ul>
            <p className="text-slate-300">
              <strong className="text-amber-400">Key Question:</strong> When a "freeswinger" (who swings at everything) takes a borderline pitch,
              does the umpire think "they swing at anything close, so if they took it, it must be a ball"?
            </p>
          </div>
        </div>

        {/* Status Check */}
        {status && !status.available && (
          <div className="card p-4 mb-8 border-amber-500 bg-amber-900/20">
            <h3 className="text-amber-400 font-semibold mb-2">Data Update Required</h3>
            <p className="text-slate-300">{status.reason}</p>
            <p className="text-slate-400 text-sm mt-2">
              Run: <code className="bg-slate-800 px-2 py-1 rounded">docker compose exec api python scripts/download_data.py --year 2025 --force</code>
            </p>
          </div>
        )}

        {/* Analysis Controls */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Run Analysis</h2>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Batters to Analyze
              </label>
              <select
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value={3}>Top 3 Batters</option>
                <option value={5}>Top 5 Batters</option>
                <option value={10}>Top 10 Batters</option>
                <option value={25}>Top 25 Batters</option>
                <option value={50}>Top 50 Batters</option>
                <option value={100}>Top 100 Batters</option>
              </select>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading || (status && !status.available)}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <span className="loading-pulse">Analyzing...</span>
              ) : (
                'Run Bayesian Analysis'
              )}
            </button>
          </div>

          <p className="text-slate-400 text-sm mt-4">
            Analysis focuses on at-bats with 4+ pitches in the 2025 season.
            This allows us to observe the batter's swing behavior before the umpire makes later calls.
            Larger analyses (50+ batters) may take a minute to complete.
          </p>
        </div>

        {error && (
          <div className="card p-4 mb-8 border-red-500 bg-red-900/20">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Summary */}
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Analysis Summary</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{results.summary?.batters_analyzed || 0}</div>
                  <div className="text-sm text-slate-400">Batters Analyzed</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{results.summary?.successful_analyses || 0}</div>
                  <div className="text-sm text-slate-400">Successful</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">{results.summary?.failed_analyses || 0}</div>
                  <div className="text-sm text-slate-400">Failed</div>
                </div>
              </div>

              {results.aggregate_analysis && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Aggregate Findings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-slate-400">Average Coefficient:</span>
                      <span className={`ml-2 font-mono ${getInfluenceColor(results.aggregate_analysis.average_coefficient)}`}>
                        {formatCoefficient(results.aggregate_analysis.average_coefficient)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Average Odds Ratio:</span>
                      <span className="ml-2 font-mono text-white">
                        {results.aggregate_analysis.average_odds_ratio?.toFixed(3) || 'N/A'}x
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    {results.aggregate_analysis.overall_interpretation}
                  </p>
                </div>
              )}
            </div>

            {/* Individual Batter Results */}
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Individual Batter Results</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Batter</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Swing Rate</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Long ABs</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Takes Analyzed</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Coefficient</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Odds Ratio</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.individual_results?.map((result, idx) => (
                      <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{result.batter_name || `Player ${result.batter_id}`}</div>
                          <div className="text-xs text-slate-500">ID: {result.batter_id}</div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {result.batter_stats ? (
                            <span className={result.batter_stats.is_freeswinger ? 'text-amber-400' : result.batter_stats.is_patient ? 'text-blue-400' : 'text-slate-300'}>
                              {(result.batter_stats.overall_swing_rate * 100).toFixed(1)}%
                              {result.batter_stats.is_freeswinger && ' (FS)'}
                              {result.batter_stats.is_patient && ' (P)'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="text-right py-3 px-4 text-slate-300">
                          {result.data_summary?.long_at_bats || '-'}
                        </td>
                        <td className="text-right py-3 px-4 text-slate-300">
                          {result.influence_analysis?.takes_analyzed || result.data_summary?.takes_analyzed || '-'}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`font-mono ${getInfluenceColor(result.influence_analysis?.swing_rate_coefficient)}`}>
                            {result.influence_analysis?.swing_rate_coefficient !== undefined
                              ? formatCoefficient(result.influence_analysis.swing_rate_coefficient)
                              : '-'}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-slate-300 font-mono">
                          {result.influence_analysis?.odds_ratio?.toFixed(3) || '-'}x
                        </td>
                        <td className="py-3 px-4">
                          {result.error ? (
                            <span className="text-red-400 text-sm">{result.error}</span>
                          ) : (
                            <span className="text-green-400 text-sm">Success</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interpretation Guide */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Understanding the Results</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-amber-400 font-semibold mb-2">Coefficient Meaning</h3>
                  <ul className="text-slate-300 space-y-2 text-sm">
                    <li><span className="text-amber-400">Negative coefficient:</span> Higher swing rate in AB leads to fewer called strikes (supports "freeswinger effect")</li>
                    <li><span className="text-blue-400">Positive coefficient:</span> Higher swing rate leads to more called strikes</li>
                    <li><span className="text-slate-400">Near zero (&lt;0.1):</span> Minimal influence detected</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-amber-400 font-semibold mb-2">Odds Ratio</h3>
                  <ul className="text-slate-300 space-y-2 text-sm">
                    <li><span className="text-white">1.0x:</span> No effect</li>
                    <li><span className="text-amber-400">&lt;1.0x:</span> Each unit increase in swing rate decreases strike probability</li>
                    <li><span className="text-blue-400">&gt;1.0x:</span> Each unit increase in swing rate increases strike probability</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Legend</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><span className="text-amber-400">(FS)</span> = Freeswinger (&gt;55% swing rate)</span>
                  <span><span className="text-blue-400">(P)</span> = Patient (&lt;45% swing rate)</span>
                  <span>Long ABs = At-bats with 4+ pitches</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-slate-500">
        <p>SZAS - Strike Zone Alignment Score | &copy; 2025 Joe LeBoube | A Sabermetric Analysis Tool</p>
        <p className="text-sm mt-2">Bayesian analysis inspired by Tangotiger's research framework</p>
      </footer>
    </div>
  )
}

export default Bayesian
