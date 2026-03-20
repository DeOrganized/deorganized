import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wallet, Zap, Bot, Cpu, Shield, Radio, Gamepad2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface HeroProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { connectWallet, isBackendAuthenticated } = useAuth();

  return (
    <>
      {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 overflow-hidden bg-canvas">
        <div className="absolute inset-0 bg-gold-glow pointer-events-none opacity-60" />

        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20"
          viewBox="0 0 1440 800"
          fill="none"
        >
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            d="M-100 600 C 200 400, 600 800, 1540 200"
            stroke="url(#hero-gradient-stroke)"
            strokeWidth="2"
            fill="none"
          />
          <defs>
            <linearGradient id="hero-gradient-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(217,119,6,0)" />
              <stop offset="50%" stopColor="#D97706" />
              <stop offset="100%" stopColor="rgba(217,119,6,0)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="container max-w-[1280px] mx-auto px-6 relative z-10 flex flex-col items-center text-center gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/20 bg-gold/5 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-bold tracking-wide">Live on Stacks Mainnet</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-ink leading-[1.1] tracking-tight"
          >
            Community Infrastructure
            <br />
            <span className="text-gold">for the Narrative Economy</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg text-inkLight max-w-2xl leading-relaxed font-medium"
          >
            AI-powered tools, autonomous agents, and a credit economy backed by Bitcoin — for the
            communities shaping culture, narrative, and digital media.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              onClick={() => isBackendAuthenticated ? onNavigate?.('dashboard') : connectWallet()}
              className="bg-gold-gradient text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all hover:-translate-y-1"
            >
              {isBackendAuthenticated ? 'My Dashboard' : 'Connect Wallet'}
            </button>
            <button
              onClick={() => onNavigate?.('dashboard', 'content-engine')}
              className="border border-borderSubtle bg-canvas hover:border-gold/50 hover:bg-surface px-8 py-4 rounded-full text-sm font-semibold transition-all text-ink"
            >
              Creator Studio
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE STREAM EMBED ────────────────────────────────── */}
      <section className="py-20 bg-canvas">
        <div className="container max-w-[1280px] mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-inkLight tracking-widest uppercase">Now Playing</span>
            </div>
            <h2 className="text-3xl font-bold text-ink mb-2">DeOrganized Live</h2>
            <p className="text-inkLight mb-8 leading-relaxed">
              Creator content streaming 24/7 — powered by the Playout Engine. When creators go
              live, this is where it plays.
            </p>

            {/* 16:9 embed */}
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-borderSubtle shadow-lg"
              style={{ paddingTop: '56.25%' }}
            >
              <iframe
                src="https://player.restream.io/?token=34663e6520564a09b488b82266a870da"
                allow="autoplay"
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
                title="DeOrganized Live"
              />
            </div>

            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={() => onNavigate?.('shows')}
                className="text-sm font-semibold text-gold hover:text-gold/80 transition-colors"
              >
                View Schedule →
              </button>
              <button
                onClick={() => onNavigate?.('dashboard', 'content-engine')}
                className="text-sm font-medium text-inkLight hover:text-ink transition-colors"
              >
                Create Content →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: STATS BAR ────────────────────────────────────────── */}
      <section className="py-12 bg-surface border-y border-borderSubtle">
        <div className="container max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              { Icon: Cpu, stat: '7', label: 'Services Running', detail: undefined },
              { Icon: Bot, stat: '2', label: 'Mainnet Agents', detail: undefined },
              { Icon: Shield, stat: '3', label: 'On-Chain Tokens', detail: 'STX · sBTC · USDCx' },
            ] as const).map(({ Icon, stat, label, detail }) => (
              <div
                key={label}
                className="flex items-center gap-4 bg-canvas rounded-xl p-5 border border-borderSubtle"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{stat}</div>
                  <div className="text-sm text-inkLight font-medium">{label}</div>
                  {detail && (
                    <div className="text-xs text-gold font-mono mt-0.5">{detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-24 bg-canvas">
        <div className="container max-w-[1280px] mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-ink mb-12 text-center"
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {([
              {
                step: '01',
                Icon: Wallet,
                title: 'Connect Your Wallet',
                desc: 'Sign in with your Stacks wallet. Your address is your identity — no passwords, no email.',
              },
              {
                step: '02',
                Icon: Zap,
                title: 'Fund Your Account',
                desc: 'Deposit STX to receive DAP credits. 100 credits per STX, detected automatically within 30 seconds.',
              },
              {
                step: '03',
                Icon: Sparkles,
                title: 'Generate Content',
                desc: 'Spend credits to produce news articles, X threads, and thumbnails — powered by AI, guided by your editorial direction.',
              },
              {
                step: '04',
                Icon: Bot,
                title: 'Agents Handle the Rest',
                desc: 'Autonomous agents post to social media, tip creators on-chain, and keep the content cycle running.',
              },
            ] as const).map(({ step, Icon, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-surface border border-borderSubtle rounded-xl p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-gold tracking-widest">{step}</span>
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-ink">{title}</h3>
                <p className="text-sm text-inkLight leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: AUDIENCE CARDS ───────────────────────────────────── */}
      <section className="py-24 bg-surface border-t border-borderSubtle">
        <div className="container max-w-[1280px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Built for Everyone in the Ecosystem
            </h2>
            <p className="text-inkLight max-w-2xl mx-auto leading-relaxed">
              Whether you run a community, create content, consume media, or build tools —
              DeOrganized is infrastructure you can plug into.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {([
              {
                title: 'For Communities',
                desc: 'Engagement tools, games, contests, and gated experiences that keep your audience showing up and participating.',
                cta: 'Create Account',
                page: 'register' as const,
                id: undefined,
                disabled: false,
              },
              {
                title: 'For Creators',
                desc: 'AI content generation, automated distribution, streaming infrastructure, and a credit economy to monetize it all.',
                cta: 'Creator Studio',
                page: 'dashboard' as const,
                id: 'content-engine',
                disabled: false,
              },
              {
                title: 'For Audiences',
                desc: 'Discover shows, watch live streams, earn credits through participation, and be part of the communities you care about.',
                cta: 'Show Schedule',
                page: 'shows' as const,
                id: undefined,
                disabled: false,
              },
              {
                title: 'For Builders',
                desc: 'An agent-powered platform with MCP integration, x402 payments, and Stacks settlement — build services that agents and creators can discover and consume.',
                cta: 'Coming Soon',
                page: undefined,
                id: undefined,
                disabled: true,
              },
            ]).map(({ title, desc, cta, page, id, disabled }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-canvas border border-borderSubtle rounded-xl p-6 flex flex-col gap-4"
              >
                <h3 className="text-lg font-bold text-ink">{title}</h3>
                <p className="text-sm text-inkLight leading-relaxed flex-1">{desc}</p>
                {disabled ? (
                  <span className="text-xs font-medium text-inkLight/40">{cta}</span>
                ) : (
                  <button
                    onClick={() => page && onNavigate?.(page, id)}
                    className="text-sm font-semibold text-gold hover:text-gold/80 transition-colors text-left"
                  >
                    {cta} →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: PLATFORM FEATURES ────────────────────────────────── */}
      <section className="py-24 bg-canvas border-t border-borderSubtle">
        <div className="container max-w-[1280px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">The Platform</h2>
            <p className="text-inkLight max-w-xl mx-auto leading-relaxed">
              Every tool connects through the DAP economy. One wallet, one credit balance, every service.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              {
                Icon: Sparkles,
                title: 'Content Engine',
                desc: 'Generate crypto news articles, X threads, and thumbnails from a single click. Powered by Claude and DALL-E.',
                cta: 'Open Studio',
                page: 'dashboard' as const,
                id: 'content-engine',
                soon: false,
              },
              {
                Icon: Bot,
                title: 'Autonomous Agents',
                desc: 'AI agents with their own wallets produce content, post to X, and tip creators in sBTC — all on autopilot.',
                cta: undefined,
                page: undefined,
                id: undefined,
                soon: true,
              },
              {
                Icon: Zap,
                title: 'DAP Credit Economy',
                desc: 'Deposit STX, receive credits instantly. Every platform service — content, streaming, agents — runs through one economy.',
                cta: 'Get Credits',
                page: 'dashboard' as const,
                id: 'content-engine',
                soon: false,
              },
              {
                Icon: Radio,
                title: 'Playout Engine',
                desc: '24/7 automated RTMP streaming. Upload clips, the engine normalizes and streams them live to every platform.',
                cta: undefined,
                page: undefined,
                id: undefined,
                soon: true,
              },
              {
                Icon: Shield,
                title: 'Wallet Auth',
                desc: "No passwords. No email. Connect your Stacks wallet, sign a message, and you're in. Cryptographic identity.",
                cta: 'Connect',
                page: 'register' as const,
                id: undefined,
                soon: false,
              },
              {
                Icon: Gamepad2,
                title: 'The Arcade',
                desc: 'AI-generated browser games for communities. Hyper-casual, DAP-powered, creator-published. Coming soon.',
                cta: undefined,
                page: undefined,
                id: undefined,
                soon: true,
              },
            ]).map(({ Icon, title, desc, cta, page, id, soon }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-surface border border-borderSubtle rounded-xl p-6 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  {soon && (
                    <span className="text-xs font-medium text-inkLight/60 border border-borderSubtle px-2 py-0.5 rounded-full">
                      Coming soon
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-ink">{title}</h3>
                <p className="text-sm text-inkLight leading-relaxed flex-1">{desc}</p>
                {!soon && cta && page && (
                  <button
                    onClick={() => onNavigate?.(page, id)}
                    className="text-sm font-semibold text-gold hover:text-gold/80 transition-colors text-left"
                  >
                    {cta} →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: BOTTOM CTA ───────────────────────────────────────── */}
      <section className="relative py-24 bg-canvas border-t border-borderSubtle overflow-hidden">
        <div className="absolute inset-0 bg-gold-glow pointer-events-none opacity-40" />
        <div className="container max-w-[1280px] mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-ink">Start Building Today</h2>
            <p className="text-inkLight max-w-xl leading-relaxed">
              Connect your Stacks wallet, fund your account, and generate your first content
              package in minutes. The platform is live.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => isBackendAuthenticated ? onNavigate?.('dashboard') : connectWallet()}
                className="bg-gold-gradient text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all hover:-translate-y-1"
              >
                {isBackendAuthenticated ? 'My Dashboard' : 'Connect Wallet'}
              </button>
              <button
                onClick={() => onNavigate?.('shows')}
                className="border border-borderSubtle bg-canvas hover:border-gold/50 hover:bg-surface px-8 py-4 rounded-full text-sm font-semibold transition-all text-ink"
              >
                Watch Shows
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};
