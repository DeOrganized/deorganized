import React from 'react';
import { predictionWarsData, getCoinData } from '../../data/predictionWars';

interface PredictionWarsBannerProps {
  onNavigate: (page: string) => void;
}

export const PredictionWarsBanner: React.FC<PredictionWarsBannerProps> = ({ onNavigate }) => {
  const round = predictionWarsData.rounds.find(r => r.status === 'live');
  if (!round) return null;

  // Duplicate matchups for seamless loop
  const items = [...round.matchups, ...round.matchups, ...round.matchups];

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative overflow-hidden cursor-pointer select-none"
      style={{
        background: 'linear-gradient(90deg, #0c0a18 0%, #110e1f 50%, #0c0a18 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
      onClick={() => onNavigate('prediction-wars')}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate('prediction-wars')}
    >
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #0c0a18, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(-90deg, #0c0a18, transparent)' }} />

      {/* Scrolling content */}
      <div
        className="flex"
        style={{ animation: 'pw-ticker 40s linear infinite', willChange: 'transform' }}
      >
        {items.map((matchup, idx) => {
          const coin = getCoinData(matchup.memecoin);
          return (
            <div key={idx} className="flex items-center gap-0 flex-shrink-0">
              <div className="flex items-center gap-2 px-5 py-2.5 whitespace-nowrap">
                {coin && (
                  <img
                    src={coin.iconUrl}
                    alt={coin.symbol}
                    width={16}
                    height={16}
                    className="rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = coin.iconUrlOriginal; }}
                  />
                )}
                <span className="text-xs font-mono font-bold" style={{ color: coin?.color ?? '#fff' }}>
                  {matchup.memecoin}
                </span>
                <span className="text-white/30 text-xs font-mono">vs</span>
                <span className="text-white/55 text-xs font-mono">{matchup.market}</span>
              </div>
              <span className="text-white/15 text-xs font-mono">·</span>
            </div>
          );
        })}

        {/* Live label woven in */}
        <div className="flex items-center px-5 flex-shrink-0 whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-white/70 px-3 py-1 rounded-full border border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            PREDICTION WARS LIVE
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pw-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};
