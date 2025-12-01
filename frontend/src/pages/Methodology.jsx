import React from 'react'
import { Link } from 'react-router-dom'

function Methodology() {
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
              <Link to="/bayesian" className="text-slate-300 hover:text-white transition-colors">
                Bayesian Method
              </Link>
              <Link to="/documentation" className="text-slate-300 hover:text-white transition-colors">
                Documentation
              </Link>
              <Link to="/methodology" className="text-white font-medium">
                Methodology
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-4">Methodology</h1>
        <p className="text-xl text-slate-400 mb-12">
          The science behind Strike Zone Alignment Score
        </p>

        {/* Introduction */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
          <p className="text-slate-300 mb-4">
            The Strike Zone Alignment Score (SZAS) is a novel Sabermetric that quantifies the alignment
            between three distinct perspectives of the strike zone in Major League Baseball:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-4">
            <li><strong className="text-green-400">Textbook Zone:</strong> The MLB rulebook definition</li>
            <li><strong className="text-blue-400">Umpire Zone:</strong> How umpires actually call pitches</li>
            <li><strong className="text-amber-400">Batter Zone:</strong> Where batters choose to swing</li>
          </ol>
          <p className="text-slate-300">
            By modeling these three zones probabilistically and measuring their overlap, SZAS provides
            insights into plate discipline, umpire tendencies, and the interplay between all participants
            in each at-bat.
          </p>
        </section>

        {/* The Three Zones */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">The Three Strike Zones</h2>

          {/* Textbook Zone */}
          <div className="mb-8 pb-8 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <h3 className="text-xl font-medium text-white">1. Textbook Strike Zone</h3>
            </div>
            <p className="text-slate-300 mb-4">
              The textbook zone is defined by MLB Rule 2.00:
            </p>
            <blockquote className="border-l-4 border-green-500 pl-4 py-2 bg-slate-800 rounded-r-lg mb-4">
              <p className="text-slate-300 italic">
                "The STRIKE ZONE is that area over home plate the upper limit of which is a horizontal
                line at the midpoint between the top of the shoulders and the top of the uniform pants,
                and the lower level is a line at the hollow beneath the kneecap."
              </p>
            </blockquote>
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Implementation:</p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Width: 17 inches (1.417 feet) - the width of home plate</li>
                <li>• Height: Varies per batter (sz_bot to sz_top from Statcast data)</li>
                <li>• Ball radius adjustment: +1.45 inches (if any part of ball crosses zone)</li>
                <li>• Binary classification: Pitch is strike if it intersects the zone cylinder</li>
              </ul>
            </div>
            <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-sm font-mono text-green-300">
                Strike if: |px| ≤ 0.708 + 0.12 AND sz_bot ≤ pz ≤ sz_top
              </p>
            </div>
          </div>

          {/* Umpire Zone */}
          <div className="mb-8 pb-8 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <h3 className="text-xl font-medium text-white">2. Umpire Called Zone</h3>
            </div>
            <p className="text-slate-300 mb-4">
              The umpire zone models how pitches are actually called in games. It uses only
              "takes" (pitches where the batter didn't swing) to isolate umpire decision-making.
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-400 mb-2">Modeling Approach:</p>
              <p className="text-sm text-slate-300 mb-3">
                Logistic regression with polynomial features:
              </p>
              <p className="font-mono text-sm text-blue-300 mb-3">
                P(strike | px, pz) = σ(β₀ + β₁px + β₂pz + β₃px² + β₄pz² + β₅px·pz)
              </p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Zone boundary defined at 50% probability contour</li>
                <li>• Minimum 100 takes required for reliable model</li>
                <li>• Can be computed per umpire, per batter-side, or aggregate</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-300 mb-2">2025 Season Context</h4>
              <p className="text-sm text-slate-300">
                MLB reduced the umpire evaluation buffer from 2 inches to 0.75 inches around zone edges.
                This resulted in:
              </p>
              <ul className="text-sm text-slate-300 mt-2 space-y-1">
                <li>• Overall accuracy: 88%+ (up from ~86%)</li>
                <li>• Shadow zone accuracy: 82%</li>
                <li>• Fewer borderline strikes called</li>
              </ul>
            </div>
          </div>

          {/* Batter Zone */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <h3 className="text-xl font-medium text-white">3. Batter Swing Zone</h3>
            </div>
            <p className="text-slate-300 mb-4">
              The batter zone represents where a hitter chooses to swing, reflecting their
              pitch recognition, plate discipline, and swing decisions.
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-400 mb-2">Modeling Approach:</p>
              <p className="text-sm text-slate-300 mb-3">
                Kernel Density Estimation (KDE) on swing locations:
              </p>
              <p className="font-mono text-sm text-amber-300 mb-3">
                P(swing | px, pz) ∝ Σ K((px - xi)/h) · K((pz - zi)/h)
              </p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Uses Gaussian kernel with Scott's bandwidth</li>
                <li>• Zone boundary at 50% of max density</li>
                <li>• Minimum 200 pitches recommended for reliable model</li>
              </ul>
            </div>
            <div className="p-4 bg-amber-900/20 border border-amber-800 rounded-lg">
              <h4 className="text-sm font-medium text-amber-300 mb-2">Research Note</h4>
              <p className="text-sm text-slate-300">
                Studies show batters have equal or superior accuracy in discriminating balls from strikes
                compared to umpires, attributed to motor experience in swinging. Batters in 2025 showed
                increased takes on shadow-zone pitches in response to the tighter called zone.
              </p>
            </div>
          </div>
        </section>

        {/* SZAS Calculation */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">SZAS Calculation</h2>

          <h3 className="text-lg font-medium text-white mb-4">Step 1: Zone Overlap (IoU)</h3>
          <p className="text-slate-300 mb-4">
            Intersection over Union (IoU) measures the overlap between two zones by converting
            probability surfaces to binary masks at the 50% threshold:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 mb-6">
            <p className="font-mono text-sm text-slate-300">
              IoU(A, B) = |A ∩ B| / |A ∪ B|
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Where A and B are binary zone masks (probability ≥ 0.5)
            </p>
          </div>

          <h3 className="text-lg font-medium text-white mb-4">Step 2: Influence Bias Check</h3>
          <p className="text-slate-300 mb-4">
            We check if umpire calls are influenced by batter swing tendencies:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 mb-4">
            <p className="font-mono text-sm text-slate-300">
              called_strike ~ pitch_location + batter_swing_tendency
            </p>
          </div>
          <p className="text-slate-300 mb-6">
            Research consistently shows no significant influence coefficient—umpires maintain
            independence in their calls regardless of batter reputation.
          </p>

          <h3 className="text-lg font-medium text-white mb-4">Step 3: Final SZAS Formula</h3>
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg p-6">
            <p className="font-mono text-lg text-white text-center mb-4">
              SZAS = (IoU_TU + IoU_TB + IoU_UB) / 3 × (1 - |bias|)
            </p>
            <div className="text-sm text-slate-300 space-y-1">
              <p>Where:</p>
              <ul className="ml-4 space-y-1">
                <li>• IoU_TU = Textbook-Umpire overlap</li>
                <li>• IoU_TB = Textbook-Batter overlap</li>
                <li>• IoU_UB = Umpire-Batter overlap</li>
                <li>• bias = Influence coefficient (typically 0)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Additional Metrics */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Additional Metrics</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h3 className="font-medium text-white mb-2">Divergence Score</h3>
              <p className="text-sm text-slate-400 mb-2">
                Mean absolute difference between zone probability surfaces:
              </p>
              <p className="font-mono text-xs text-slate-300">
                Div(A, B) = mean(|P_A(x,z) - P_B(x,z)|)
              </p>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h3 className="font-medium text-white mb-2">Zone Centroids</h3>
              <p className="text-sm text-slate-400 mb-2">
                Probability-weighted center of each zone:
              </p>
              <p className="font-mono text-xs text-slate-300">
                C_x = Σ(P·x) / Σ(P), C_z = Σ(P·z) / Σ(P)
              </p>
            </div>
          </div>
        </section>

        {/* Interpretation Guide */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Interpreting Results</h2>

          <h3 className="text-lg font-medium text-white mb-4">What High SZAS Indicates</h3>
          <ul className="text-slate-300 space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Umpire calling close to rulebook zone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Batter swinging at pitches in the zone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Good plate discipline and zone recognition</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Consistent strike zone throughout games</span>
            </li>
          </ul>

          <h3 className="text-lg font-medium text-white mb-4">What Low SZAS Indicates</h3>
          <ul className="text-slate-300 space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">✗</span>
              <span>Significant deviation between zones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">✗</span>
              <span>Possible umpire inconsistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">✗</span>
              <span>Batter chasing pitches outside zone (poor discipline)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-1">✗</span>
              <span>Batter taking pitches inside zone (overly passive)</span>
            </li>
          </ul>

          <h3 className="text-lg font-medium text-white mb-4">Component Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-300">If...</th>
                  <th className="text-left py-2 text-slate-300">Then...</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <td className="py-2">IoU_TU high, IoU_TB low</td>
                  <td className="py-2">Umpire accurate but batter has discipline issues</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">IoU_TU low, IoU_TB high</td>
                  <td className="py-2">Batter well-calibrated but umpire deviates from rules</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">IoU_UB high, others low</td>
                  <td className="py-2">Batter adapting to umpire's zone (not textbook)</td>
                </tr>
                <tr>
                  <td className="py-2">All IoU values similar</td>
                  <td className="py-2">Consistent interpretation across all parties</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Bayesian Influence Analysis */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-amber-400 mb-6">Bayesian Influence Analysis</h2>
          <p className="text-slate-300 mb-6">
            Based on research proposed by <span className="text-amber-400 font-medium">Tangotiger</span>, this analysis
            explores whether umpire strike/ball calls are influenced by observing a batter's swing behavior earlier in an at-bat.
          </p>

          <h3 className="text-lg font-medium text-white mb-4">The Freeswinger Hypothesis</h3>
          <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-slate-300">
              <strong className="text-amber-400">Key Question:</strong> When a "freeswinger" (who swings at everything close)
              takes a borderline pitch, does the umpire unconsciously think: "They swing at anything close, so if they took it,
              it must be a ball"?
            </p>
          </div>

          <h3 className="text-lg font-medium text-white mb-4">The Three Zones Framework</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-blue-800">
              <h4 className="font-medium text-blue-400 mb-2">Textbook Zone</h4>
              <p className="text-sm text-slate-400">The rulebook definition of the strike zone</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-green-800">
              <h4 className="font-medium text-green-400 mb-2">Umpire Zone</h4>
              <p className="text-sm text-slate-400">What the umpire actually calls on takes</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-purple-800">
              <h4 className="font-medium text-purple-400 mb-2">Batter Zone</h4>
              <p className="text-sm text-slate-400">Where the batter chooses to swing (their personal zone)</p>
            </div>
          </div>

          <h3 className="text-lg font-medium text-white mb-4">Methodology</h3>
          <div className="bg-slate-900 rounded-lg p-4 mb-6">
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-amber-400 font-mono">1.</span>
                <span><strong className="text-white">Filter Long At-Bats:</strong> Focus on at-bats with 4+ pitches to observe swing behavior before later calls</span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-400 font-mono">2.</span>
                <span><strong className="text-white">Calculate Cumulative Swing Rate:</strong> Track the batter's swing rate on pitches 1 through N-1 within each at-bat</span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-400 font-mono">3.</span>
                <span><strong className="text-white">Model Umpire Calls:</strong> Use logistic regression on taken pitches (pitch 4+):</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <p className="font-mono text-sm text-amber-300 text-center">
                P(called_strike) = σ(β₀ + β₁·plate_x + β₂·plate_z + β₃·plate_x² + β₄·plate_z² + <span className="text-white">β₅·prior_swing_rate</span>)
              </p>
            </div>
            <ol className="space-y-3 text-slate-300 mt-4" start="4">
              <li className="flex gap-3">
                <span className="text-amber-400 font-mono">4.</span>
                <span><strong className="text-white">Interpret β₅:</strong> The swing rate coefficient reveals umpire influence</span>
              </li>
            </ol>
          </div>

          <h3 className="text-lg font-medium text-white mb-4">Interpreting Results</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-amber-900/20 border border-amber-800 rounded-lg">
              <h4 className="font-medium text-amber-400 mb-2">Negative Coefficient (β₅ &lt; 0)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Supports the freeswinger effect: higher swing rate in the AB leads to fewer called strikes on takes.
              </p>
              <p className="text-xs text-amber-300">
                Umpire thinks: "They swing at everything, so if they didn't swing, it must be a ball"
              </p>
            </div>
            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-400 mb-2">Positive Coefficient (β₅ &gt; 0)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Opposite effect: higher swing rate leads to more called strikes on takes.
              </p>
              <p className="text-xs text-blue-300">
                Umpire might think: "This batter swings freely, so this must be a strike they missed"
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg mb-6">
            <h4 className="font-medium text-white mb-2">Odds Ratio Interpretation</h4>
            <p className="text-sm text-slate-300">
              The odds ratio (e^β₅) indicates the multiplicative change in strike odds per unit increase in swing rate:
            </p>
            <ul className="text-sm text-slate-400 mt-2 space-y-1">
              <li>• <span className="text-white">1.0x:</span> No influence detected</li>
              <li>• <span className="text-amber-400">&lt;1.0x:</span> Higher swing rate decreases strike probability</li>
              <li>• <span className="text-blue-400">&gt;1.0x:</span> Higher swing rate increases strike probability</li>
            </ul>
          </div>

          <h3 className="text-lg font-medium text-white mb-4">Minimum Data Requirements</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-300"><span className="text-white font-medium">Long At-Bats:</span> At least 10 at-bats with 4+ pitches</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-300"><span className="text-white font-medium">Takes for Analysis:</span> At least 20 taken pitches in qualifying at-bats</p>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="card p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Limitations & Future Work</h2>
          <ul className="text-slate-300 space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span><strong className="text-white">Sample size sensitivity:</strong> Models require minimum pitch counts for reliability (100 takes, 200 swings)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span><strong className="text-white">Context ignored:</strong> Count, game situation, and pitcher identity affect real decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span><strong className="text-white">2D simplification:</strong> True zones are 3D cylinders; we model 2D cross-sections</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span><strong className="text-white">Annual recalibration needed:</strong> Rule changes (like 2025 buffer reduction) affect baselines</span>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
            <h4 className="text-sm font-medium text-purple-300 mb-2">Future Enhancements</h4>
            <p className="text-sm text-slate-300">
              Planned improvements include count-specific zones, pitch-type adjustments,
              time-series analysis for within-game zone evolution, and integration with
              MLB's upcoming Automated Ball-Strike system (ABS) data in 2026.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-slate-500">
        <p>SZAS - Strike Zone Alignment Score | A Sabermetric Analysis Tool</p>
      </footer>
    </div>
  )
}

export default Methodology
