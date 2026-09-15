import React from 'react';
import { Gauge, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { DashboardPortfolio } from '../types.js';

interface PreflightProps {
  portfolio: DashboardPortfolio;
}

export const PreflightSimulatorView: React.FC<PreflightProps> = ({ portfolio }) => {
  const currentDrawdown = portfolio.maxDrawdownPct;
  const isCircuitSafe = currentDrawdown < 4.0;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Pre-Flight Safety Engine & Circuit Breakers
          </h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
          isCircuitSafe ? 'badge-green' : 'badge-red'
        }`}>
          {isCircuitSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {isCircuitSafe ? 'CIRCUITS ARMED (NORMAL)' : 'CIRCUIT ENGAGED (DEFENSIVE)'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drawdown Budget Monitor */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4">
          <div className="text-xs text-[#94A3B8] mb-1">Max Drawdown Budget</div>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-black text-white font-mono">
              {currentDrawdown.toFixed(2)}% / 5.00%
            </div>
            <div className="text-xs font-mono text-emerald-400">
              {((5.0 - currentDrawdown) / 5.0 * 100).toFixed(0)}% Headroom
            </div>
          </div>
          <div className="h-2 bg-black/50 rounded-full overflow-hidden mt-3 border border-white/5">
            <div
              className={`h-full transition-all ${
                currentDrawdown > 3.5 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${(currentDrawdown / 5.0) * 100}%` }}
            />
          </div>
        </div>

        {/* Single Asset Concentration Limit */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4">
          <div className="text-xs text-[#94A3B8] mb-1">Max Asset Allocation Cap</div>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-black text-white font-mono">
              25.00%
            </div>
            <div className="text-xs font-mono text-purple-400">
              Hard Ceiling
            </div>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2">
            Prevents single bStock idiosyncratic shocks from degrading 14-day score.
          </p>
        </div>

        {/* Alpha-to-Fee Ratio Threshold */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4">
          <div className="text-xs text-[#94A3B8] mb-1">Min Alpha / Cost Ratio</div>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-black text-amber-300 font-mono">
              &ge; 3.0 &times;
            </div>
            <div className="text-xs font-mono text-amber-400">
              Fee Guard Active
            </div>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2">
            Trades are rejected if net expected profit does not clear 3x gas & slippage.
          </p>
        </div>
      </div>
    </div>
  );
};
