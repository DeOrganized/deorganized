export interface Matchup {
  memecoin: string;
  market: string;
  pollUrl: string;
  trackedUrl?: string;
  question: string;
  result?: 'higher' | 'lower' | null;
  volumeSTX?: number;
  uniqueWallets?: number;
  tradeCount?: number;
}

export interface Round {
  number: number;
  status: 'upcoming' | 'live' | 'resolved';
  startDate: string;
  resolveDate: string;
  matchups: Matchup[];
}

export interface LeaderboardEntry {
  memecoin: string;
  rank: number;
  score: number;
  volumeRank: number;
  walletRank: number;
  socialRank: number;
  tier: 'top' | 'mid' | 'at-risk';
  totalVolumeSTX: number;
  totalUsers: number;
}

export interface Memecoin {
  symbol: string;
  name: string;
  color: string;
  iconUrl: string;
  iconUrlOriginal: string;
  externalLinks?: {
    twitter?: string;
    discord?: string;
  };
}

export interface PredictionWarsData {
  season: number;
  currentRound: number;
  rounds: Round[];
  leaderboard: LeaderboardEntry[];
  memecoins: Memecoin[];
}

export const predictionWarsData: PredictionWarsData = {
  season: 1,
  currentRound: 1,
  rounds: [
    {
      number: 1,
      status: 'live',
      startDate: '2026-03-26',
      resolveDate: '2026-03-27',
      matchups: [
        {
          memecoin: 'LEO',
          market: 'BTC',
          pollUrl: 'https://www.stacksmarket.app/poll/69c552e5512fb6362ccf1b21',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326',
          question: 'Will Bitcoin close ABOVE $69,000 at 20:00 UTC on March 27, 2026?',
        },
        {
          memecoin: 'WELSH',
          market: 'STX',
          pollUrl: 'https://www.stacksmarket.app/poll/69c54b53512fb6362ccf1495',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-2',
          question: 'Will STX close ABOVE 0.2350 at 20:00 UTC on March 27, 2026?',
        },
        {
          memecoin: 'PEPE',
          market: 'NASDAQ',
          pollUrl: 'https://www.stacksmarket.app/poll/69c550e7512fb6362ccf187c',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-3',
          question: 'Will NASDAQ 100 close ABOVE 24,100 at 20:00 UTC on March 27, 2026?',
        },
        {
          memecoin: 'ROO',
          market: 'GOLD',
          pollUrl: 'https://www.stacksmarket.app/poll/69c542e6512fb6362ccf1027',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-4',
          question: 'Will Gold close ABOVE $4,450 at 20:00 UTC on March 27, 2026?',
        },
        {
          memecoin: 'FLAT',
          market: 'SP500',
          pollUrl: 'https://www.stacksmarket.app/poll/69c54880512fb6362ccf135b',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-5',
          question: 'Will the S&P 500 close ABOVE 6,610 at 20:00 UTC on March 27, 2026?',
        },
        {
          memecoin: 'PLAY',
          market: 'OIL',
          pollUrl: 'https://www.stacksmarket.app/poll/69c54eb2512fb6362ccf1741',
          trackedUrl: 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-6',
          question: 'Will WTI Crude Oil close ABOVE $94.00 at 20:00 UTC on March 27, 2026?',
        },
      ],
    },
    {
      number: 2,
      status: 'upcoming',
      startDate: '2026-03-30',
      resolveDate: '2026-04-01',
      matchups: [],
    },
    {
      number: 3,
      status: 'upcoming',
      startDate: '2026-04-01',
      resolveDate: '2026-04-03',
      matchups: [],
    },
  ],
  leaderboard: [],
  memecoins: [
    {
      symbol: 'LEO',
      name: 'LEO',
      color: '#EF9F27',
      iconUrl: '/images/prediction-wars/LEO.webp',
      iconUrlOriginal: 'https://i.ibb.co/LT7CPBD/LEO.webp',
    },
    {
      symbol: 'WELSH',
      name: 'WELSH',
      color: '#5DCAA5',
      iconUrl: '/images/prediction-wars/WELSH.jpg',
      iconUrlOriginal: 'https://i.ibb.co/RGsrQ52N/WELSH.jpg',
    },
    {
      symbol: 'PEPE',
      name: 'Pepe Coin',
      color: '#AFA9EC',
      iconUrl: '/images/prediction-wars/PEPE.png',
      iconUrlOriginal: 'https://i.ibb.co/9PQNVf9/PEPE.png',
      externalLinks: {
        twitter: 'https://x.com/PepeCoinSTX',
      },
    },
    {
      symbol: 'ROO',
      name: 'ROO',
      color: '#F0997B',
      iconUrl: '/images/prediction-wars/ROO.jpg',
      iconUrlOriginal: 'https://i.ibb.co/kg7hYjG2/ROO.jpg',
    },
    {
      symbol: 'FLAT',
      name: 'FLAT',
      color: '#ED93B1',
      iconUrl: '/images/prediction-wars/FLAT.jpg',
      iconUrlOriginal: 'https://i.ibb.co/7xY2f6nY/FLAT.jpg',
    },
    {
      symbol: 'PLAY',
      name: 'PLAY',
      color: '#85B7EB',
      iconUrl: '/images/prediction-wars/PLAY.png',
      iconUrlOriginal: 'https://i.ibb.co/hJdgYv0S/PLAY.png',
    },
  ],
};

export const STACKSMARKET_HOME = 'https://go.deorganized.com/r/stacksmarket-mkt-20260326-7';

export const stacksmarketBranding = {
  logoUrl: '/images/prediction-wars/stacksmarket-logo.png',
  iconUrl: '/images/prediction-wars/stacksmarket-icon.png',
  siteUrl: 'https://www.stacksmarket.app',
};

export const MARKET_LABELS: Record<string, string> = {
  BTC: 'Bitcoin',
  STX: 'Stacks',
  NASDAQ: 'NASDAQ 100',
  GOLD: 'Gold (XAU)',
  SP500: 'S&P 500',
  OIL: 'Oil (WTI)',
};

export function getCoinData(symbol: string): Memecoin | undefined {
  return predictionWarsData.memecoins.find(c => c.symbol === symbol.toUpperCase());
}

export const VALID_COIN_SLUGS = ['leo', 'welsh', 'pepe', 'roo', 'flat', 'play'];
