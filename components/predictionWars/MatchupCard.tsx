import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Matchup, Memecoin, MARKET_LABELS } from '../../data/predictionWars';

interface MatchupCardProps {
  matchup: Matchup;
  coin: Memecoin;
  roundStatus: 'upcoming' | 'live' | 'resolved';
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup, coin, roundStatus }) => {
  const ctaUrl = matchup.trackedUrl || matchup.pollUrl;
  const marketLabel = MARKET_LABELS[matchup.market] || matchup.market;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 border hover:opacity-90 transition-opacity"
      style={{
        backgroundColor: coin.color + '12',
        borderColor: coin.color + '44',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={coin.iconUrl}
            alt={coin.symbol}
            width={40}
            height={40}
            className="rounded-full object-cover border-2 flex-shrink-0"
            style={{ borderColor: coin.color + '55' }}
            onError={(e) => { (e.target as HTMLImageElement).src = coin.iconUrlOriginal; }}
          />
          <div>
            <div className="font-mono font-bold text-base" style={{ color: coin.color }}>
              {coin.symbol}
            </div>
            <div className="text-inkLight text-xs font-mono">vs {marketLabel}</div>
          </div>
        </div>
        <StatusBadge status={roundStatus} />
      </div>

      {/* Question */}
      <p className="text-inkLight text-sm leading-relaxed">{matchup.question}</p>

      {/* Result (if resolved) */}
      {roundStatus === 'resolved' && matchup.result && (
        <div className="flex items-center gap-2 text-sm font-mono font-bold">
          <span className="text-inkLight">Result:</span>
          <span className={matchup.result === 'higher' ? 'text-emerald-500' : 'text-red-500'}>
            {matchup.result === 'higher' ? '↑ Higher' : '↓ Lower'}
          </span>
        </div>
      )}

      {/* Stats (if present) */}
      {(matchup.volumeSTX || matchup.uniqueWallets) && (
        <div className="flex gap-4 text-xs font-mono text-inkLight">
          {matchup.volumeSTX && <span>{matchup.volumeSTX.toLocaleString()} STX</span>}
          {matchup.uniqueWallets && <span>{matchup.uniqueWallets} wallets</span>}
        </div>
      )}

      {/* CTA */}
      {roundStatus !== 'resolved' && (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-mono font-bold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: coin.color + '22',
            color: coin.color,
            border: `1px solid ${coin.color}44`,
          }}
        >
          Trade Now <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'live') {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono border border-emerald-500/25 bg-emerald-500/10 text-emerald-500 dark:border-emerald-500/25 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        LIVE
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-mono border border-borderSubtle text-inkLight">
      {status === 'resolved' ? 'RESOLVED' : 'UPCOMING'}
    </span>
  );
};
