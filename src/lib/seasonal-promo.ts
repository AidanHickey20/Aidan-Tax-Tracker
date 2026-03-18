// Monthly seasonal promotions — rotates automatically based on current month.
// "Original" prices are the displayed strike-through values.
// Actual prices ($9.99 Basic, $19.99 Pro) stay the same.

interface SeasonalPromo {
  name: string;
  badge: string; // short label for badges/tags
  basicOriginal: string;
  proOriginal: string;
}

const MONTHLY_PROMOS: Record<number, SeasonalPromo> = {
  0:  { name: "New Year, New Numbers Sale",  badge: "New Year Sale",        basicOriginal: "$14.99", proOriginal: "$29.99" },
  1:  { name: "Tax Season Prep Sale",        badge: "Tax Prep Sale",        basicOriginal: "$14.99", proOriginal: "$29.99" },
  2:  { name: "Lucky Ledger Event",          badge: "Lucky Ledger",         basicOriginal: "$14.99", proOriginal: "$29.99" },
  3:  { name: "Spring Into Savings",         badge: "Spring Sale",          basicOriginal: "$14.99", proOriginal: "$29.99" },
  4:  { name: "May Day Money Sale",          badge: "May Day Sale",         basicOriginal: "$14.99", proOriginal: "$29.99" },
  5:  { name: "Mid-Year Momentum Sale",      badge: "Mid-Year Sale",        basicOriginal: "$14.99", proOriginal: "$29.99" },
  6:  { name: "Freedom Financials Sale",     badge: "Summer Sale",          basicOriginal: "$14.99", proOriginal: "$29.99" },
  7:  { name: "Back to Business Sale",       badge: "Back to Biz",         basicOriginal: "$14.99", proOriginal: "$29.99" },
  8:  { name: "Fall Into Finance Sale",      badge: "Fall Sale",            basicOriginal: "$14.99", proOriginal: "$29.99" },
  9:  { name: "Q4 Kickoff Sale",             badge: "Q4 Kickoff",          basicOriginal: "$14.99", proOriginal: "$29.99" },
  10: { name: "Year-End Write-Off Sale",     badge: "Year-End Sale",       basicOriginal: "$14.99", proOriginal: "$29.99" },
  11: { name: "Holiday Hustle Sale",         badge: "Holiday Sale",         basicOriginal: "$14.99", proOriginal: "$29.99" },
};

export function getSeasonalPromo(): SeasonalPromo {
  const month = new Date().getMonth();
  return MONTHLY_PROMOS[month];
}
