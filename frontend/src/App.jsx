import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import axios from 'axios'
import Dashboard from './components/Dashboard'
import Filters from './components/Filters'
import ZoneVisualization from './components/ZoneVisualization'
import ResultsPanel from './components/ResultsPanel'
import DataSummary from './components/DataSummary'
import Documentation from './pages/Documentation'
import Methodology from './pages/Methodology'

const API_BASE = import.meta.env.VITE_API_URL || ''
const MIN_PITCHES = 50

function Calculator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    batter_id: null,
    umpire_id: null,
    year: 2025,
    bat_side: null
  })
  const [szasResult, setSzasResult] = useState(null)
  const [zoneData, setZoneData] = useState(null)
  const [dataSummary, setDataSummary] = useState(null)
  const [batters, setBatters] = useState([])
  const [umpires, setUmpires] = useState([])
  const [pitchCount, setPitchCount] = useState(null)
  const [pitchCountLoading, setPitchCountLoading] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  // Fetch pitch count whenever filters change
  useEffect(() => {
    const fetchPitchCount = async () => {
      setPitchCountLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('year', filters.year)
        if (filters.batter_id) params.append('batter_id', filters.batter_id)
        if (filters.umpire_id) params.append('umpire_id', filters.umpire_id)
        if (filters.bat_side) params.append('bat_side', filters.bat_side)

        const res = await axios.get(`${API_BASE}/api/data/pitch-count?${params}`)
        setPitchCount(res.data)
      } catch (err) {
        console.error('Error fetching pitch count:', err)
        setPitchCount(null)
      } finally {
        setPitchCountLoading(false)
      }
    }

    // Debounce the fetch slightly
    const timer = setTimeout(fetchPitchCount, 150)
    return () => clearTimeout(timer)
  }, [filters])

  const loadInitialData = async () => {
    try {
      const [battersRes, umpiresRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE}/api/data/batters`),
        axios.get(`${API_BASE}/api/data/umpires`),
        axios.get(`${API_BASE}/api/data/summary`)
      ])
      setBatters(battersRes.data)
      setUmpires(umpiresRes.data)
      setDataSummary(summaryRes.data)
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Failed to load initial data. Is the API running?')
    }
  }

  const calculateSZAS = async () => {
    setLoading(true)
    setError(null)

    try {
      const [szasRes, zonesRes] = await Promise.all([
        axios.post(`${API_BASE}/api/szas/calculate`, filters),
        axios.post(`${API_BASE}/api/szas/zones`, filters)
      ])

      setSzasResult(szasRes.data)
      setZoneData(zonesRes.data)
    } catch (err) {
      console.error('SZAS calculation error:', err)
      setError(err.response?.data?.message || 'Error calculating SZAS')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

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

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-white font-medium">
                  Calculator
                </Link>
                <Link to="/documentation" className="text-slate-300 hover:text-white transition-colors">
                  Documentation
                </Link>
                <Link to="/methodology" className="text-slate-300 hover:text-white transition-colors">
                  Methodology
                </Link>
              </nav>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>API Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {dataSummary && (
          <DataSummary summary={dataSummary} />
        )}

        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Analysis Parameters</h2>
          <Filters
            filters={filters}
            batters={batters}
            umpires={umpires}
            onChange={handleFilterChange}
          />

          {/* Pitch Count Indicator */}
          <div className="mt-4 flex items-center gap-4">
            {pitchCountLoading ? (
              <span className="text-slate-400 text-sm">Checking available pitches...</span>
            ) : pitchCount ? (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                pitchCount.sufficient
                  ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                  : 'bg-amber-900/30 text-amber-400 border border-amber-700/50'
              }`}>
                <span className={`w-2 h-2 rounded-full ${pitchCount.sufficient ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                <span>
                  {pitchCount.pitch_count.toLocaleString()} pitches available
                  {!pitchCount.sufficient && ` (minimum ${MIN_PITCHES} required)`}
                </span>
              </div>
            ) : null}
          </div>

          <button
            onClick={calculateSZAS}
            disabled={loading || (pitchCount && !pitchCount.sufficient)}
            className="mt-4 w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="loading-pulse">Calculating...</span>
            ) : pitchCount && !pitchCount.sufficient ? (
              'Insufficient Data'
            ) : (
              'Calculate SZAS'
            )}
          </button>
        </div>

        {error && (
          <div className="card p-4 mb-8 border-red-500 bg-red-900/20">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {szasResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ResultsPanel result={szasResult} />
            {zoneData && (
              <ZoneVisualization zoneData={zoneData} />
            )}
          </div>
        )}

        {szasResult && zoneData && (
          <Dashboard
            szasResult={szasResult}
            zoneData={zoneData}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-slate-500">
        <p>SZAS - Strike Zone Alignment Score | &copy; 2025 Joe LeBoube | A Sabermetric Analysis Tool</p>
        <p className="text-sm mt-2">Built for MLB analytics enthusiasts</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </Router>
  )
}

export default App
