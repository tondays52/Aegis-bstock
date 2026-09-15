import React from 'react';
import { Wallet, TrendingUp, ShieldAlert, Fuel, DollarSign, Layers } from 'lucide-react';
import { DashboardPortfolio } from '../types.js';

interface PortfolioProps {
  portfolio: DashboardPortfolio;
}

export const PortfolioBreakdown: React.FC<PortfolioProps> = ({ portfolio }) => {
  const pnlUsd = portfolio.totalEquityUsd - portfolio.openingEquityUsd;
  const pnlPct = (pnlUsd / portfolio.openingEquityUsd) * 100;
  const isProfit = pnlUsd >= 0;

  let totalHoldingsValue = 0;
  for (const sym in portfolio.holdings) {
    const h = portfolio.holdings[sym];
    totalHoldingsValue += h.amount * h.currentPrice;
  }

  const cashPct = portfolio.totalEquityUsd > 0
    ? (portfolio.cashUsd / portfolio.totalEquityUsd) * 100
    : 100;
  const stockPct = 100 - cashPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Equity & Score */}
      <div className="glass-panel p-5 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#F0B90B]" /> Wallet Equity (BNB Chain)
          </span>
          <span className="badge-yellow px-2 py-0.5 rounded text-[10px] font-mono">
            Scored Asset
          </span>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          ${portfolio.totalEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className={`font-mono font-bold flex items-center gap-0.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
          <span className="text-[#94A3B8]">
            ({isProfit ? '+' : ''}${pnlUsd.toFixed(2)} Net PnL)
          </span>
        </div>
      </div>

      {/* Maximum Drawdown (Tie-Breaker) */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" /> Max Drawdown (MDD)
          </span>
          <span className="badge-green px-2 py-0.5 rounded text-[10px] font-mono">
            Official Tie-Breaker
          </span>
        </div>
        <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
          {portfolio.maxDrawdownPct.toFixed(2)}%
        </div>
        <div className="mt-2 text-xs text-[#94A3B8] flex items-center justify-between">
          <span>Peak: ${portfolio.peakEquityUsd.toFixed(2)}</span>
          <span className="text-emerald-400/80 font-semibold">Limit: 5.00%</span>
        </div>
      </div>

      {/* Capital Allocation: Cash vs bStocks */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> Capital Allocation
          </span>
          <span className="font-mono text-xs text-white">
            {cashPct.toFixed(0)}% Cash
          </span>
        </div>
        <div className="h-3 bg-black/50 rounded-full overflow-hidden flex my-2 border border-white/5">
          <div
            className="bg-purple-500 h-full transition-all duration-300"
            style={{ width: `${cashPct}%` }}
            title={`Stablecoin Cash: ${cashPct.toFixed(1)}%`}
          />
          <div
            className="bg-[#F0B90B] h-full transition-all duration-300"
            style={{ width: `${stockPct}%` }}
            title={`bStocks: ${stockPct.toFixed(1)}%`}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#94A3B8] font-mono mt-2">
          <span>Cash: ${portfolio.cashUsd.toFixed(2)}</span>
          <span>Stocks: ${totalHoldingsValue.toFixed(2)}</span>
        </div>
      </div>

      {/* Real Execution Friction (Fees & Gas) */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-amber-400" /> Network & Trading Costs
          </span>
          <span className="font-mono text-xs text-slate-300">
            {portfolio.tradesCount} Trades
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-[#94A3B8]">Gas on BNB:</div>
            <div className="text-sm font-bold text-amber-300 font-mono">
              {portfolio.totalGasSpentBnb.toFixed(5)} BNB
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#94A3B8]">Trade Fees:</div>
            <div className="text-sm font-bold text-slate-200 font-mono">
              ${portfolio.totalTradingFeesUsd.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-[#94A3B8] text-right">
          Total Fee Drag: ${(portfolio.totalTradingFeesUsd + portfolio.totalGasSpentBnb * 600).toFixed(2)} USD
        </div>
      </div>
    </div>
  );
};
