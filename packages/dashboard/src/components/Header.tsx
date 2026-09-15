import React from 'react';
import { ShieldCheck, Cpu, GitCommit, Activity, Radio } from 'lucide-react';

interface HeaderProps {
  activeCommitSha: string;
  merkleRoot: string;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  dayNumber: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeCommitSha,
  merkleRoot,
  isRunning,
  onToggleRun,
  onReset,
  dayNumber
}) => {
  return (
    <header className="glass-header sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & System Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#D97706] flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <ShieldCheck className="w-6 h-6 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              AEGIS<span className="text-[#F0B90B]">-bSTOCK</span>
            </h1>
            <span className="badge-yellow text-xs px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> BNB Smart Chain
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Binance Autonomous Agentic AI Challenge • Scored Run (Day {dayNumber}/14)
          </p>
        </div>
      </div>

      {/* Center: System Status & Version Manifest */}
      <div className="hidden lg:flex items-center gap-4 bg-black/40 border border-white/5 rounded-xl px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <GitCommit className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-[#94A3B8]">Registered SHA:</span>
          <span className="font-mono text-[#F0B90B] font-semibold">{activeCommitSha}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2 text-xs">
          <Cpu className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-[#94A3B8]">Model:</span>
          <span className="font-mono text-purple-400 font-semibold">Gemini 2.5 Pro</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[#94A3B8]">Merkle Root:</span>
          <span className="font-mono text-emerald-300 font-semibold truncate max-w-[120px]" title={merkleRoot}>
            {merkleRoot ? merkleRoot.slice(0, 10) + '...' : 'Building...'}
          </span>
        </div>
      </div>

      {/* Right: Simulation & Control Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleRun}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-[#F0B90B] text-black font-bold hover:bg-[#d8a509] shadow-yellow-500/20'
          }`}
        >
          <Activity className="w-4 h-4" />
          {isRunning ? 'Pause Autonomous Loop' : 'Start 14-Day Simulation'}
        </button>

        <button
          onClick={onReset}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          Reset State
        </button>
      </div>
    </header>
  );
};
