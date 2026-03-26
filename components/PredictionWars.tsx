import React, { useEffect } from 'react';
import { ExternalLink, Swords, Trophy, TrendingUp, Users, Zap, Info } from 'lucide-react';
import {
  predictionWarsData,
  getCoinData,
  STACKSMARKET_HOME,
  MARKET_LABELS,
  VALID_COIN_SLUGS,
  stacksmarketBranding,
  Memecoin,
  Matchup,
} from '../data/predictionWars';
import { MatchupCard } from './predictionWars/MatchupCard';
import { LeaderboardTable } from './predictionWars/LeaderboardTable';
import { CoinChip } from './predictionWars/CoinChip';
import { TierBadge } from './predictionWars/TierBadge';
import { RoundTimeline } from './predictionWars/RoundTimeline';

interface PredictionWarsProps {
  onNavigate: (page: string, id?: string) => void;
  coin?: string;
}

export const PredictionWars: React.FC<PredictionWarsProps> = ({ onNavigate, coin }) => {
  const { memecoins, rounds, leaderboard, currentRound, season } = predictionWarsData;

  // Redirect unknown coin slugs to main page
  useEffect(() => {
    if (coin && !VALID_COIN_SLUGS.includes(coin.toLowerCase())) {
      onNavigate('prediction-wars');
    }
  }, [coin, onNavigate]);

  const activeCoin: Memecoin | undefined = coin ? getCoinData(coin.toLowerCase()) : undefined;

  const currentRoundData = rounds.find(r => r.number === currentRound);
  const displayMatchups: Matchup[] = activeCoin
    ? (currentRoundData?.matchups.filter(m => m.memecoin === activeCoin.symbol) ?? [])
    : (currentRoundData?.matchups ?? []);
  const roundStatus = currentRoundData?.status ?? 'upcoming';

  const leaderboardEntries = activeCoin
    ? leaderboard.filter(e => e.memecoin === activeCoin.symbol)
    : leaderboard;

  return (
    <div
      className="min-h-screen bg-canvas"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-16 px-4">
        {/* Grid — gray lines visible in light and dark */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(128,128,128) 1px, transparent 1px), linear-gradient(90deg, rgb(128,128,128) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Subtle glow — more visible in dark, very subtle in light */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: activeCoin
              ? `radial-gradient(ellipse at 50% 0%, ${activeCoin.color}14 0%, transparent 70%)`
              : 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-borderSubtle bg-surface text-inkLight text-xs font-mono mb-8">
            <Swords className="w-3.5 h-3.5" />
            SEASON {season} · ROUND {currentRound} LIVE
          </div>

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink mb-4 tracking-tight leading-none"
            style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
          >
            {activeCoin ? (
              <>
                <span style={{ color: activeCoin.color }}>{activeCoin.symbol}</span>
                {' '}in Prediction Wars
              </>
            ) : (
              <>
                Memecoin{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Prediction Wars
                </span>
              </>
            )}
          </h1>

          {/* Tagline */}
          <p className="text-inkLight text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            {activeCoin
              ? `Follow ${activeCoin.symbol}'s performance in the live prediction league on StacksMarket.`
              : 'Six memecoins. Six real markets. One winner. Pick your side and trade the outcome on StacksMarket.'}
          </p>

          {/* Powered by StacksMarket */}
          <div className="flex items-center justify-center gap-3 mb-10 px-5 py-3 rounded-2xl border border-borderSubtle bg-surface">
            <span className="text-inkLight text-sm font-mono uppercase tracking-widest">Powered by</span>
            <a
              href={stacksmarketBranding.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src={stacksmarketBranding.logoUrl}
                alt="StacksMarket"
                className="h-16 w-auto"
              />
            </a>
          </div>

          {/* Coin chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {memecoins.map(c => (
              <button
                key={c.symbol}
                onClick={() =>
                  activeCoin?.symbol === c.symbol
                    ? onNavigate('prediction-wars')
                    : onNavigate('prediction-wars', c.symbol.toLowerCase())
                }
                className="transition-transform hover:scale-105 focus:outline-none"
              >
                <CoinChip
                  coin={c}
                  size={activeCoin?.symbol === c.symbol ? 'lg' : 'md'}
                />
              </button>
            ))}
          </div>

          {/* Primary CTA */}
          <a
            href={STACKSMARKET_HOME}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-mono font-bold text-sm transition-opacity hover:opacity-90 text-white"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: '0 4px 24px rgba(124,58,237,0.3)',
            }}
          >
            Trade on StacksMarket <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── CURRENT ROUND MATCHUPS ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <SectionHeader
          icon={<Zap className="w-4 h-4" />}
          label={`Round ${currentRound} — ${roundStatus === 'live' ? 'Live Now' : roundStatus === 'resolved' ? 'Resolved' : 'Upcoming'}`}
          accent={roundStatus === 'live' ? '#10b981' : undefined}
        />
        {displayMatchups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {displayMatchups.map(matchup => {
              const coinData = getCoinData(matchup.memecoin);
              if (!coinData) return null;
              return (
                <MatchupCard
                  key={matchup.memecoin}
                  matchup={matchup}
                  coin={coinData}
                  roundStatus={roundStatus}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-borderSubtle bg-surface p-10 text-center">
            <p className="text-inkLight font-mono text-sm">No matchups scheduled yet</p>
          </div>
        )}
      </section>

      {/* ── LEADERBOARD ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <SectionHeader icon={<Trophy className="w-4 h-4" />} label="Season Leaderboard" />
        <div className="mt-6">
          <LeaderboardTable entries={leaderboardEntries} memecoins={memecoins} />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      {!activeCoin && (
        <section className="py-16 px-4 border-t border-borderSubtle bg-surface">
          <div className="max-w-5xl mx-auto">
            <SectionHeader icon={<Info className="w-4 h-4" />} label="How It Works" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="rounded-xl p-5 border border-borderSubtle bg-canvas">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-4 font-mono font-bold text-sm"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}
                  >
                    {i + 1}
                  </div>
                  <h3
                    className="font-bold text-ink text-sm mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-inkLight text-xs leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SCORING + REWARDS + TIERS ─────────────────────────────────── */}
      {!activeCoin && (
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Scoring 60/20/20 */}
            <div className="rounded-xl p-6 border border-borderSubtle bg-surface">
              <h3
                className="font-bold text-ink text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Scoring
              </h3>
              <div className="flex flex-col gap-3">
                {SCORING.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-inkLight text-xs">{s.label}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="flex rounded-full overflow-hidden mt-4 h-2">
                <div className="h-full" style={{ width: '60%', background: '#7c3aed' }} />
                <div className="h-full" style={{ width: '20%', background: '#0ea5e9' }} />
                <div className="h-full" style={{ width: '20%', background: '#f59e0b' }} />
              </div>
            </div>

            {/* Rewards 70/30 */}
            <div className="rounded-xl p-6 border border-borderSubtle bg-surface">
              <h3
                className="font-bold text-ink text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                <Trophy className="w-4 h-4 text-yellow-500 dark:text-yellow-400" /> Rewards Split
              </h3>
              <div className="flex flex-col gap-3">
                {REWARDS.map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-inkLight text-xs">{r.label}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: r.color }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="flex rounded-full overflow-hidden mt-4 h-2">
                <div className="h-full" style={{ width: '70%', background: '#f59e0b' }} />
                <div className="h-full" style={{ width: '30%', background: '#9ca3af' }} />
              </div>
            </div>

            {/* Performance Tiers */}
            <div className="rounded-xl p-6 border border-borderSubtle bg-surface">
              <h3
                className="font-bold text-ink text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Weekly Tiers
              </h3>
              <div className="flex flex-col gap-3">
                {TIERS.map(t => (
                  <div key={t.label} className="flex items-center justify-between">
                    <TierBadge tier={t.tier} />
                    <span className="text-inkLight text-xs font-mono">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SCHEDULE + COMPETITORS ────────────────────────────────────── */}
      {!activeCoin && (
        <section className="py-16 px-4 border-t border-borderSubtle bg-surface">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* Timeline */}
            <div>
              <SectionHeader icon={<Swords className="w-4 h-4" />} label="Season Schedule" />
              <div className="mt-6">
                <RoundTimeline rounds={rounds} currentRound={currentRound} />
              </div>
            </div>

            {/* Competitors */}
            <div>
              <SectionHeader icon={<TrendingUp className="w-4 h-4" />} label="The Competitors" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {memecoins.map(c => {
                  const matchup = currentRoundData?.matchups.find(m => m.memecoin === c.symbol);
                  const ctaUrl = matchup?.trackedUrl || matchup?.pollUrl || STACKSMARKET_HOME;
                  return (
                    <a
                      key={c.symbol}
                      href={ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl p-3 border border-borderSubtle bg-canvas hover:bg-surface transition-colors group"
                    >
                      <img
                        src={c.iconUrl}
                        alt={c.symbol}
                        width={32}
                        height={32}
                        className="rounded-full object-cover flex-shrink-0"
                        style={{ border: `2px solid ${c.color}44` }}
                        onError={(e) => { (e.target as HTMLImageElement).src = c.iconUrlOriginal; }}
                      />
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-sm" style={{ color: c.color }}>{c.symbol}</div>
                        {matchup && (
                          <div className="text-inkLight text-xs font-mono truncate">
                            vs {MARKET_LABELS[matchup.market] || matchup.market}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-inkLight/40 group-hover:text-inkLight ml-auto flex-shrink-0 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ───────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-ink mb-4 tracking-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Ready to trade the outcome?
          </h2>
          <p className="text-inkLight mb-8 leading-relaxed">
            Pick a market, back your memecoin, and put STX on the line. Rounds resolve every 48 hours.
          </p>
          <a
            href={STACKSMARKET_HOME}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-mono font-bold transition-opacity hover:opacity-90 text-white"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: '0 4px 32px rgba(124,58,237,0.3)',
            }}
          >
            Trade on StacksMarket <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-inkLight/50 text-xs mt-6 font-mono">
            DeOrganized is the broadcast partner for Prediction Wars Season 1.
          </p>
          <p className="text-inkLight/40 text-xs mt-8 max-w-xl mx-auto leading-relaxed">
            Memecoin Prediction Wars markets are operated by Stacksmarket. DeOrganized is a media and broadcast partner — we do not operate markets, accept funds, or facilitate trades. Participation involves financial risk. This page is for informational purposes only and does not constitute financial advice. Trade only what you can afford to lose.
          </p>
        </div>
      </section>
    </div>
  );
};

/* ── SectionHeader ──────────────────────────────────────────────────────── */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  accent?: string;
}> = ({ icon, label, accent }) => (
  <div className="flex items-center gap-2">
    <span className={accent ? '' : 'text-inkLight'} style={accent ? { color: accent } : undefined}>
      {icon}
    </span>
    <span
      className={`text-xs font-mono font-bold uppercase tracking-widest ${accent ? '' : 'text-inkLight'}`}
      style={accent ? { color: accent } : undefined}
    >
      {label}
    </span>
    <div className="flex-1 h-px bg-borderSubtle ml-2" />
  </div>
);

/* ── Static data ──────────────────────────────────────────────────────────── */

const HOW_IT_WORKS = [
  {
    title: 'Six memecoins compete',
    body: 'LEO, WELSH, PEPE, ROO, FLAT, and PLAY are each paired with a real-world market every round.',
  },
  {
    title: 'Predict the outcome',
    body: 'Will Bitcoin finish higher or lower? Trade the prediction on StacksMarket using STX.',
  },
  {
    title: 'Volume drives standings',
    body: "Each coin's STX trading volume, unique wallets, and social engagement determine its weekly score.",
  },
  {
    title: 'Top coins earn rewards',
    body: 'At the end of each week, top performers earn a share of the prize pool. Bottom performers risk elimination.',
  },
];

const SCORING = [
  { label: 'Trading Volume', pct: 60, color: '#7c3aed' },
  { label: 'Unique Wallets', pct: 20, color: '#0ea5e9' },
  { label: 'Social Engagement', pct: 20, color: '#f59e0b' },
];

const REWARDS = [
  { label: 'Traders (winners)', pct: 70, color: '#f59e0b' },
  { label: 'Platform / fees', pct: 30, color: '#9ca3af' },
];

const TIERS = [
  { tier: 'top' as const, label: 'TOP', desc: '≥ 5,000 STX/wk' },
  { tier: 'mid' as const, label: 'MID', desc: '2,000–5,000 STX' },
  { tier: 'at-risk' as const, label: 'AT RISK', desc: '< 2,000 STX' },
];
