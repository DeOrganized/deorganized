import React from 'react';
import { LeaderboardEntry, Memecoin } from '../../data/predictionWars';
import { TierBadge } from './TierBadge';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  memecoins: Memecoin[];
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries, memecoins }) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-borderSubtle bg-surface p-10 text-center">
        <p className="text-inkLight font-mono text-sm">Leaderboard updates after Round 1 resolves</p>
        <p className="text-inkLight/60 font-mono text-xs mt-1">March 27, 2026 at 20:00 UTC</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-borderSubtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borderSubtle bg-surface">
            <th className="text-left px-4 py-3 text-inkLight font-mono text-xs">#</th>
            <th className="text-left px-4 py-3 text-inkLight font-mono text-xs">COIN</th>
            <th className="text-right px-4 py-3 text-inkLight font-mono text-xs">
              SCORE <span className="text-inkLight/50 normal-case font-sans font-normal" title="Social score pending">*</span>
            </th>
            <th className="text-right px-4 py-3 text-inkLight font-mono text-xs hidden sm:table-cell">VOLUME (STX)</th>
            <th className="text-right px-4 py-3 text-inkLight font-mono text-xs hidden sm:table-cell">USERS</th>
            <th className="text-center px-4 py-3 text-inkLight font-mono text-xs">TIER</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const coin = memecoins.find(c => c.symbol === entry.memecoin);
            return (
              <tr key={entry.memecoin} className="border-b border-borderSubtle hover:bg-surface transition-colors">
                <td className="px-4 py-3 text-inkLight font-mono text-sm">{entry.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {coin && (
                      <img
                        src={coin.iconUrl}
                        alt={coin.symbol}
                        width={24}
                        height={24}
                        className="rounded-full object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = coin.iconUrlOriginal; }}
                      />
                    )}
                    <span className="font-mono font-bold" style={{ color: coin?.color }}>
                      {entry.memecoin}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-ink">{entry.score}</td>
                <td className="px-4 py-3 text-right font-mono text-inkLight hidden sm:table-cell">
                  {entry.totalVolumeSTX.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-inkLight hidden sm:table-cell">
                  {entry.totalUsers}
                </td>
                <td className="px-4 py-3 text-center">
                  <TierBadge tier={entry.tier} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-inkLight/50 font-mono text-xs border-t border-borderSubtle">
        * Social score pending — will be added when available from Stacksmarket
      </p>
    </div>
  );
};
