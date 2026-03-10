import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { requireUserId } from "@/lib/get-user";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface PriceResult {
  symbol: string;
  type: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  sparkline: number[];
}

export async function GET(request: NextRequest) {
  await requireUserId();
  const symbols = request.nextUrl.searchParams.get("symbols");
  const types = request.nextUrl.searchParams.get("types");

  if (!symbols || !types) {
    return NextResponse.json([]);
  }

  const symbolList = symbols.split(",");
  const typeList = types.split(",");

  const results: PriceResult[] = [];

  // Group by type
  const stocks = symbolList.filter((_, i) => typeList[i] === "STOCK");
  const cryptos = symbolList.filter((_, i) => typeList[i] === "CRYPTO");

  // Fetch stock prices from Yahoo Finance
  for (const symbol of stocks) {
    try {
      const quote = await yf.quote(symbol);
      const sparkData = await getStockSparkline(symbol);

      results.push({
        symbol,
        type: "STOCK",
        price: quote.regularMarketPrice ?? 0,
        previousClose: quote.regularMarketPreviousClose ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        dayHigh: quote.regularMarketDayHigh ?? 0,
        dayLow: quote.regularMarketDayLow ?? 0,
        sparkline: sparkData,
      });
    } catch {
      results.push({
        symbol,
        type: "STOCK",
        price: 0,
        previousClose: 0,
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        sparkline: [],
      });
    }
  }

  // Fetch crypto prices from CoinGecko
  if (cryptos.length > 0) {
    try {
      const ids = cryptos.map((s) => s.toLowerCase()).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
      );
      const data = await res.json();

      for (const coin of data) {
        const symbol = coin.id.toUpperCase();
        const prevPrice = coin.current_price / (1 + coin.price_change_percentage_24h / 100);
        results.push({
          symbol,
          type: "CRYPTO",
          price: coin.current_price ?? 0,
          previousClose: prevPrice,
          change: coin.price_change_24h ?? 0,
          changePercent: coin.price_change_percentage_24h ?? 0,
          dayHigh: coin.high_24h ?? 0,
          dayLow: coin.low_24h ?? 0,
          sparkline: coin.sparkline_in_7d?.price?.slice(-24) ?? [],
        });
      }
    } catch {
      for (const symbol of cryptos) {
        results.push({
          symbol: symbol.toUpperCase(),
          type: "CRYPTO",
          price: 0,
          previousClose: 0,
          change: 0,
          changePercent: 0,
          dayHigh: 0,
          dayLow: 0,
          sparkline: [],
        });
      }
    }
  }

  return NextResponse.json(results);
}

async function getStockSparkline(symbol: string): Promise<number[]> {
  try {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const result = await yf.chart(symbol, {
      period1: fiveDaysAgo,
      period2: now,
      interval: "1h",
    });
    return (result.quotes || [])
      .map((q: { close?: number | null }) => q.close)
      .filter((v): v is number => v != null)
      .slice(-24);
  } catch {
    return [];
  }
}
