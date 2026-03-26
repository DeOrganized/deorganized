import React from 'react';
import { Memecoin } from '../../data/predictionWars';

interface CoinChipProps {
  coin: Memecoin;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { pill: 'px-2 py-0.5 text-xs gap-1', icon: 16 },
  md: { pill: 'px-3 py-1 text-sm gap-1.5', icon: 20 },
  lg: { pill: 'px-4 py-2 text-base gap-2', icon: 24 },
};

export const CoinChip: React.FC<CoinChipProps> = ({ coin, size = 'md' }) => {
  const s = SIZE[size];
  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-bold ${s.pill}`}
      style={{
        backgroundColor: coin.color + '22',
        color: coin.color,
        border: `1px solid ${coin.color}44`,
      }}
    >
      <img
        src={coin.iconUrl}
        alt={coin.symbol}
        width={s.icon}
        height={s.icon}
        className="rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = coin.iconUrlOriginal; }}
      />
      {coin.symbol}
    </span>
  );
};
