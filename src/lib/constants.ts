// Crypto CoinGecko ID → ticker symbol mapping
export const CRYPTO_TICKERS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  ripple: "XRP",
  solana: "SOL",
  dogecoin: "DOGE",
  cardano: "ADA",
  polkadot: "DOT",
  litecoin: "LTC",
};

// Default assumed annual growth rate for MANUAL investments (7%)
export const DEFAULT_INVESTMENT_GROWTH_RATE = 0.07;

// Default deal workflow steps for fix & flip deals
export const DEFAULT_DEAL_STEPS = [
  { name: "ACQUISITION", sortOrder: 0 },
  { name: "DEMO", sortOrder: 1 },
  { name: "RENOVATION", sortOrder: 2 },
  { name: "LISTING", sortOrder: 3 },
  { name: "UNDER_CONTRACT", sortOrder: 4 },
  { name: "CLOSED", sortOrder: 5 },
];

// Default deal workflow steps for wholesale deals
export const DEFAULT_WHOLESALE_STEPS = [
  { name: "ACQUISITION", sortOrder: 0 },
  { name: "FIND_BUYER", sortOrder: 1 },
  { name: "ASSIGNMENT", sortOrder: 2 },
  { name: "CLOSING", sortOrder: 3 },
  { name: "CLOSED", sortOrder: 4 },
];
