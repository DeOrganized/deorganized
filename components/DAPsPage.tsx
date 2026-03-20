import React from 'react';
import { motion } from 'framer-motion';
import {
    Wallet, Sparkles, Zap, Shield, ArrowRight, X,
    Coins, BarChart3, Radio, Gamepad2, Bot, FileText,
    CheckCircle2, AlertCircle,
} from 'lucide-react';

interface DAPsPageProps {
    onNavigate?: (page: string) => void;
}

// ─── Shared animation presets ────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.55, delay, ease: 'easeOut' },
});

// ─── Section wrapper ─────────────────────────────────────────────────────────

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => (
    <section className={`py-20 ${className}`}>
        <div className="max-w-4xl mx-auto px-6">{children}</div>
    </section>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">{children}</p>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-3xl font-bold text-ink mb-4">{children}</h2>
);

// ─── How-to-get card ─────────────────────────────────────────────────────────

const GetCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    body: string;
    delay?: number;
}> = ({ icon, title, body, delay = 0 }) => (
    <motion.div {...fadeUp(delay)} className="bg-surface border border-borderSubtle rounded-2xl p-6 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
            {icon}
        </div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="text-sm text-inkLight leading-relaxed">{body}</p>
    </motion.div>
);

// ─── Spend row ───────────────────────────────────────────────────────────────

const SpendRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    detail: string;
    badge?: string;
}> = ({ icon, title, detail, badge }) => (
    <div className="flex items-start gap-4 py-4 border-b border-borderSubtle last:border-0">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 mt-0.5">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink">{title}</span>
                {badge && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm text-inkLight mt-0.5">{detail}</p>
        </div>
    </div>
);

// ─── "Not" row ───────────────────────────────────────────────────────────────

const NotRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-3 text-sm text-ink">
        <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <span>{children}</span>
    </li>
);

// ─── Why row ─────────────────────────────────────────────────────────────────

const WhyRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-3 text-sm text-ink">
        <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <span>{children}</span>
    </li>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const DAPsPage: React.FC<DAPsPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-canvas text-ink overflow-x-hidden">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center text-center pt-36 pb-24 overflow-hidden bg-canvas">
                <div className="absolute inset-0 bg-gold-glow pointer-events-none opacity-50" />

                {/* Decorative line */}
                <svg
                    className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-15"
                    viewBox="0 0 1440 600"
                    fill="none"
                >
                    <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2.5, ease: 'easeInOut' }}
                        d="M-100 500 C 300 200, 800 700, 1540 100"
                        stroke="url(#dap-stroke)"
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <defs>
                        <linearGradient id="dap-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(217,119,6,0)" />
                            <stop offset="50%" stopColor="#D97706" />
                            <stop offset="100%" stopColor="rgba(217,119,6,0)" />
                        </linearGradient>
                    </defs>
                </svg>

                <div className="relative z-10 max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/20 bg-gold/5"
                    >
                        <Coins className="w-4 h-4 text-gold" />
                        <span className="text-gold text-sm font-bold tracking-wide">Platform Economy</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold text-ink leading-[1.1] tracking-tight"
                    >
                        DAP Credits
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-xl font-semibold text-gold"
                    >
                        The DeOrganized Economy
                    </motion.p>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.35 }}
                        className="text-lg text-inkLight max-w-xl leading-relaxed"
                    >
                        DAPs (DeOrganized Action Points) are the platform credits that power every service on DeOrganized.
                        Deposit STX, receive credits instantly, and spend them across the ecosystem.
                    </motion.p>
                </div>
            </section>

            {/* ── SECTION 1 — What DAPs Are ────────────────────────────────── */}
            <Section className="bg-surface/40">
                <motion.div {...fadeUp()}>
                    <SectionLabel>What DAPs Are</SectionLabel>
                    <SectionHeading>Built for Platform Speed</SectionHeading>
                    <p className="text-inkLight leading-relaxed mb-10 max-w-2xl">
                        DAP credits are off-chain, ledger-based platform currency — like V-Bucks or Robux — designed to
                        make the DeOrganized ecosystem work without blockchain friction on every action.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {[
                        {
                            icon: <Shield className="w-5 h-5" />,
                            title: 'Off-chain, instant ledger',
                            body: 'Credits are tracked in a fast off-chain ledger. No blockchain confirmation required for platform actions — transactions are instant and free.',
                        },
                        {
                            icon: <Coins className="w-5 h-5" />,
                            title: 'Platform currency',
                            body: 'One credit balance spans every service on DeOrganized — content generation, streaming, agent operations, and the upcoming Arcade.',
                        },
                        {
                            icon: <Zap className="w-5 h-5" />,
                            title: 'Zero fees, zero delays',
                            body: 'No gas fees, no mempool delays for routine platform actions. Credits move at application speed so the experience stays smooth.',
                        },
                        {
                            icon: <BarChart3 className="w-5 h-5" />,
                            title: 'Auditable history',
                            body: 'Every mint and deduction is logged. Your full credit history is visible in your dashboard — transparent, verifiable, and permanent.',
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={item.title}
                            {...fadeUp(i * 0.08)}
                            className="bg-surface border border-borderSubtle rounded-2xl p-5 flex gap-4"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-gold shrink-0 mt-0.5">
                                {item.icon}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-ink mb-1">{item.title}</p>
                                <p className="text-sm text-inkLight leading-relaxed">{item.body}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Section>

            {/* ── SECTION 2 — How to Get DAPs ─────────────────────────────── */}
            <Section>
                <motion.div {...fadeUp()}>
                    <SectionLabel>How to Get DAPs</SectionLabel>
                    <SectionHeading>Three Ways to Load Up</SectionHeading>
                </motion.div>

                <div className="grid sm:grid-cols-3 gap-5">
                    <GetCard
                        icon={<Wallet className="w-5 h-5" />}
                        title="Deposit STX"
                        body="Send STX to the platform deposit address with your memo code. You receive 100 credits per STX, detected automatically within 30 seconds via the Hiro API."
                        delay={0}
                    />
                    <GetCard
                        icon={<Sparkles className="w-5 h-5" />}
                        title="Earn Them"
                        body="Welcome bonus on signup (1,000 credits). Creator upgrade bonus (1,000 credits). Follow rewards (200 credits). More earning triggers coming as the platform grows."
                        delay={0.08}
                    />
                    <GetCard
                        icon={<Zap className="w-5 h-5" />}
                        title="Buy Credits"
                        body="Use the Buy Credits flow in your dashboard to send STX directly from your connected wallet with a single click. Credited instantly once the transaction is detected."
                        delay={0.16}
                    />
                </div>
            </Section>

            {/* ── SECTION 3 — What You Can Spend DAPs On ──────────────────── */}
            <Section className="bg-surface/40">
                <motion.div {...fadeUp()}>
                    <SectionLabel>Where Credits Go</SectionLabel>
                    <SectionHeading>What You Can Spend DAPs On</SectionHeading>
                </motion.div>

                <motion.div
                    {...fadeUp(0.1)}
                    className="bg-surface border border-borderSubtle rounded-2xl px-6 divide-y divide-borderSubtle"
                >
                    <SpendRow
                        icon={<FileText className="w-4 h-4" />}
                        title="Content Generation"
                        detail="Full article, X thread, and AI-generated thumbnail — produced and distributed by Gabby."
                        badge="100 credits — News · 50 credits — Stacks"
                    />
                    <SpendRow
                        icon={<Radio className="w-4 h-4" />}
                        title="Playout Engine"
                        detail="Upload and stream video content through the DeOrganized broadcast infrastructure."
                    />
                    <SpendRow
                        icon={<Bot className="w-4 h-4" />}
                        title="Agent Operations"
                        detail="Autonomous agents spend credits to generate and distribute content on the network's behalf."
                    />
                    <SpendRow
                        icon={<Gamepad2 className="w-4 h-4" />}
                        title="The Arcade"
                        detail="Community games and engagement tools — spend credits to play, earn credits for results."
                        badge="Coming soon"
                    />
                    <SpendRow
                        icon={<Sparkles className="w-4 h-4" />}
                        title="Clip Creation & Engagement Tools"
                        detail="Automated highlight clips, community engagement campaigns, and creator reward programmes."
                        badge="Coming soon"
                    />
                </motion.div>
            </Section>

            {/* ── SECTION 4 — What DAPs Are NOT ───────────────────────────── */}
            <Section>
                <motion.div {...fadeUp()}>
                    <SectionLabel>Important</SectionLabel>
                    <SectionHeading>What DAPs Are Not</SectionHeading>
                </motion.div>

                <motion.div
                    {...fadeUp(0.1)}
                    className="bg-surface border border-borderSubtle rounded-2xl p-6 md:p-8"
                >
                    <div className="flex gap-3 mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-inkLight leading-relaxed">
                            DAP credits are a <strong className="text-ink">closed-loop platform utility</strong>, not a
                            financial instrument. They exist solely to facilitate platform services.
                        </p>
                    </div>
                    <ul className="space-y-4">
                        <NotRow>Not a cryptocurrency — DAPs have no blockchain existence of their own.</NotRow>
                        <NotRow>Not tradeable or transferable between users — credits belong to the account that earned them.</NotRow>
                        <NotRow>No cash value — DAPs cannot be redeemed for money or any other currency.</NotRow>
                        <NotRow>No off-ramp — they cannot be converted back to STX, BTC, or any other asset.</NotRow>
                        <NotRow>Not speculative — DAPs measure platform engagement and service consumption, not investment returns.</NotRow>
                    </ul>
                </motion.div>
            </Section>

            {/* ── SECTION 5 — Why This Design ─────────────────────────────── */}
            <Section className="bg-surface/40">
                <motion.div {...fadeUp()}>
                    <SectionLabel>Design Philosophy</SectionLabel>
                    <SectionHeading>Why This Architecture</SectionHeading>
                    <p className="text-inkLight leading-relaxed mb-8 max-w-2xl">
                        The hybrid on-chain/off-chain model gives DeOrganized the best of both worlds — real on-chain
                        settlement where it matters, platform speed where it counts.
                    </p>
                </motion.div>

                <motion.ul {...fadeUp(0.1)} className="space-y-5">
                    <WhyRow>
                        <strong className="text-ink">On-chain settlement at the edges</strong> — STX flows in via
                        on-chain deposit, sBTC and USDCx tips flow out via on-chain transactions. The edges are trustless.
                    </WhyRow>
                    <WhyRow>
                        <strong className="text-ink">Internal economy runs at platform speed</strong> — routine actions
                        like content generation and streaming are instant, free, and don't require gas or mempool slots.
                    </WhyRow>
                    <WhyRow>
                        <strong className="text-ink">One balance, every service</strong> — a single credit balance
                        unlocks content, streaming, agents, and games. No separate token per feature.
                    </WhyRow>
                    <WhyRow>
                        <strong className="text-ink">Fully auditable</strong> — every credit mint and deduction is
                        logged with a timestamp, description, and running balance visible in your dashboard.
                    </WhyRow>
                </motion.ul>
            </Section>

            {/* ── BOTTOM CTA ───────────────────────────────────────────────── */}
            <Section>
                <motion.div
                    {...fadeUp()}
                    className="bg-surface border border-borderSubtle rounded-3xl p-10 md:p-14 flex flex-col items-center text-center gap-6"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <Coins className="w-7 h-7 text-gold" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-ink mb-3">Ready to get started?</h2>
                        <p className="text-inkLight max-w-md">
                            Create an account to receive your welcome bonus of 1,000 DAP credits — no deposit required.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={() => onNavigate?.('register')}
                            className="bg-gold-gradient text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            Start Earning
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onNavigate?.('agents')}
                            className="border border-borderSubtle bg-canvas hover:border-gold/50 hover:bg-surface px-8 py-4 rounded-full text-sm font-semibold transition-all text-ink"
                        >
                            Meet the Agents
                        </button>
                    </div>
                </motion.div>
            </Section>

        </div>
    );
};
