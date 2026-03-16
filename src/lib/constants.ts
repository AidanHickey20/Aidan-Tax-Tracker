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

// Default deal workflow steps for new deals
export const DEFAULT_DEAL_STEPS = [
  { name: "ACQUISITION", sortOrder: 0 },
  { name: "DEMO", sortOrder: 1 },
  { name: "RENOVATION", sortOrder: 2 },
  { name: "LISTING", sortOrder: 3 },
  { name: "UNDER_CONTRACT", sortOrder: 4 },
  { name: "CLOSED", sortOrder: 5 },
];
