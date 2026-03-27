import React from 'react';
import { Round } from '../../data/predictionWars';

interface RoundTimelineProps {
  rounds: Round[];
  currentRound: number;
}

const DOT_STYLES: Record<Round['status'], string> = {
  live: 'bg-emerald-500',
  resolved: 'bg-inkLight',
  upcoming: 'bg-borderSubtle',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const RoundTimeline: React.FC<RoundTimelineProps> = ({ rounds, currentRound }) => {
  return (
    <div className="flex flex-col">
      {rounds.map((round, i) => (
        <div key={round.number} className="flex gap-4">
          {/* Dot + connector */}
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${DOT_STYLES[round.status]} ${round.status === 'live' ? 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}
            />
            {i < rounds.length - 1 && (
              <div className="w-px flex-1 bg-borderSubtle my-1.5" style={{ minHeight: 24 }} />
            )}
          </div>

          {/* Content */}
          <div className={`pb-6 ${round.number === currentRound ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono font-bold text-ink text-sm">Round {round.number}</span>
              {round.status === 'live' && (
                <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Live</span>
              )}
              {round.status === 'resolved' && (
                <span className="text-xs font-mono text-inkLight uppercase tracking-wide">Resolved</span>
              )}
            </div>
            <div className="text-inkLight text-xs font-mono">
              {fmtDate(round.startDate)} — {fmtDateFull(round.resolveDate)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
