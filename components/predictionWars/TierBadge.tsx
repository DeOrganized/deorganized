import React from 'react';

type Tier = 'top' | 'mid' | 'at-risk';

const CONFIG: Record<Tier, { label: string; cls: string }> = {
  top: { label: 'TOP', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  mid: { label: 'MID', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'at-risk': { label: 'AT RISK', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface TierBadgeProps {
  tier: Tier;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const { label, cls } = CONFIG[tier];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${cls}`}>
      {label}
    </span>
  );
};
