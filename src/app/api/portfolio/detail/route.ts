import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { requireUserId } from "@/lib/get-user";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(request: NextRequest) {
  await requireUserId();
  const symbol = request.nextUrl.searchParams.get("symbol");
  const type = request.nextUrl.searchParams.get("type");
  const range = request.nextUrl.searchParams.get("range") || "1mo";

  if (!symbol || !type) {
    return NextResponse.json({ error: "Missing symbol or type" }, { status: 400 });
  }

  if (type === "STOCK") {
    return NextResponse.json(await getStockDetail(symbol, range));
  } else {
    return NextResponse.json(await getCryptoDetail(symbol, range));
  }
}

async function getStockDetail(symbol: string, range: string) {
  try {
    const [quote, chartData] = await Promise.all([
      yf.quote(symbol),
      getStockChart(symbol, range),
    ]);

    // Try to get summary detail for extra stats
    let summaryDetail: Record<string, unknown> = {};
    try {
      const result = await yf.quoteSummary(symbol, { modules: ["summaryDetail", "defaultKeyStatistics", "financialData"] });
      summaryDetail = {
        ...result.summaryDetail,
        ...result.defaultKeyStatistics,
        ...result.financialData,
      };
    } catch {
      // Some symbols don't have summary data
    }

    return {
      symbol,
      type: "STOCK",
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? 0,
      dayLow: quote.regularMarketDayLow ?? 0,
      open: quote.regularMarketOpen ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? 0,
      marketCap: quote.marketCap ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
      trailingPE: (summaryDetail as { trailingPE?: number }).trailingPE ?? null,
      forwardPE: (summaryDetail as { forwardPE?: number }).forwardPE ?? null,
      dividendYield: (summaryDetail as { dividendYield?: number }).dividendYield ?? null,
      beta: (summaryDetail as { beta?: number }).beta ?? null,
      eps: (summaryDetail as { trailingEps?: number }).trailingEps ?? null,
      targetMeanPrice: (summaryDetail as { targetMeanPrice?: number }).targetMeanPrice ?? null,
      recommendationMean: (summaryDetail as { recommendationMean?: number }).recommendationMean ?? null,
      recommendationKey: (summaryDetail as { recommendationKey?: string }).recommendationKey ?? null,
      profitMargins: (summaryDetail as { profitMargins?: number }).profitMargins ?? null,
      revenueGrowth: (summaryDetail as { revenueGrowth?: number }).revenueGrowth ?? null,
      chartData,
    };
  } catch (e) {
    return { error: `Failed to fetch stock data: ${e}` };
  }
}

async function getCryptoDetail(symbol: string, range: string) {
  try {
    const id = symbol.toLowerCase();
    const days = rangeToDays(range);

    const [marketRes, chartRes] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`),
      fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`),
    ]);

    const market = await marketRes.json();
    const chart = await chartRes.json();

    const price = market.market_data?.current_price?.usd ?? 0;
    const change24h = market.market_data?.price_change_24h ?? 0;
    const changePercent24h = market.market_data?.price_change_percentage_24h ?? 0;

    const chartData = (chart.prices || []).map((p: [number, number]) => ({
      time: new Date(p[0]).toISOString(),
      price: p[1],
    }));

    return {
      symbol: symbol.toUpperCase(),
      type: "CRYPTO",
      name: market.name || symbol,
      price,
      previousClose: price - change24h,
      change: change24h,
      changePercent: changePercent24h,
      dayHigh: market.market_data?.high_24h?.usd ?? 0,
      dayLow: market.market_data?.low_24h?.usd ?? 0,
      open: 0,
      volume: market.market_data?.total_volume?.usd ?? 0,
      avgVolume: 0,
      marketCap: market.market_data?.market_cap?.usd ?? 0,
      fiftyTwoWeekHigh: market.market_data?.ath?.usd ?? 0,
      fiftyTwoWeekLow: market.market_data?.atl?.usd ?? 0,
      trailingPE: null,
      forwardPE: null,
      dividendYield: null,
      beta: null,
      eps: null,
      targetMeanPrice: null,
      recommendationMean: null,
      recommendationKey: null,
      profitMargins: null,
      revenueGrowth: null,
      // Crypto-specific
      circulatingSupply: market.market_data?.circulating_supply ?? 0,
      totalSupply: market.market_data?.total_supply ?? 0,
      maxSupply: market.market_data?.max_supply ?? null,
      athDate: market.market_data?.ath_date?.usd ?? null,
      athChangePercent: market.market_data?.ath_change_percentage?.usd ?? null,
      atlDate: market.market_data?.atl_date?.usd ?? null,
      priceChange7d: market.market_data?.price_change_percentage_7d ?? null,
      priceChange30d: market.market_data?.price_change_percentage_30d ?? null,
      priceChange1y: market.market_data?.price_change_percentage_1y ?? null,
      chartData,
    };
  } catch (e) {
    return { error: `Failed to fetch crypto data: ${e}` };
  }
}

async function getStockChart(symbol: string, range: string) {
  try {
    const now = new Date();
    const { period, interval } = rangeToParams(range);
    const start = new Date(now.getTime() - period);

    const result = await yf.chart(symbol, {
      period1: start,
      period2: now,
      interval,
    });

    return (result.quotes || [])
      .filter((q: { close?: number | null; date?: Date | null }) => q.close != null && q.date != null)
      .map((q: { date: Date; close: number | null }) => ({
        time: q.date.toISOString(),
        price: q.close,
      }));
  } catch {
    return [];
  }
}

function rangeToParams(range: string): { period: number; interval: "1d" | "1h" | "5m" | "1wk" | "1mo" } {
  switch (range) {
    case "1d": return { period: 1 * 24 * 60 * 60 * 1000, interval: "5m" };
    case "5d": return { period: 5 * 24 * 60 * 60 * 1000, interval: "1h" };
    case "1mo": return { period: 30 * 24 * 60 * 60 * 1000, interval: "1d" };
    case "3mo": return { period: 90 * 24 * 60 * 60 * 1000, interval: "1d" };
    case "6mo": return { period: 180 * 24 * 60 * 60 * 1000, interval: "1d" };
    case "1y": return { period: 365 * 24 * 60 * 60 * 1000, interval: "1wk" };
    case "5y": return { period: 5 * 365 * 24 * 60 * 60 * 1000, interval: "1mo" };
    default: return { period: 30 * 24 * 60 * 60 * 1000, interval: "1d" };
  }
}

function rangeToDays(range: string): number {
  switch (range) {
    case "1d": return 1;
    case "5d": return 5;
    case "1mo": return 30;
    case "3mo": return 90;
    case "6mo": return 180;
    case "1y": return 365;
    case "5y": return 1825;
    default: return 30;
  }
}
