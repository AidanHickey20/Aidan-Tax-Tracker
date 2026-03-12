import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function fetchStockPrice(symbol: string): Promise<number> {
  try {
    const quote = await yf.quote(symbol);
    return quote.regularMarketPrice ?? 0;
  } catch {
    return 0;
  }
}

async function fetchCryptoPrice(coinGeckoId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currency=usd`
    );
    const data = await res.json();
    return data[coinGeckoId]?.usd ?? 0;
  } catch {
    return 0;
  }
}

async function fetchPrice(symbol: string, type: string): Promise<number> {
  if (type === "STOCK") return fetchStockPrice(symbol);
  if (type === "CRYPTO") return fetchCryptoPrice(symbol.toLowerCase());
  return 0;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayDayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const investments = await prisma.trackedInvestment.findMany({
    where: {
      recurringDay: todayDayOfWeek,
      recurringAmount: { gt: 0 },
      OR: [
        { lastProcessedDate: null },
        { lastProcessedDate: { lt: todayStart } },
      ],
    },
  });

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const inv of investments) {
    try {
      const price = await fetchPrice(inv.symbol, inv.type);
      if (price <= 0) {
        skipped++;
        continue;
      }

      const newSharesAcquired = inv.recurringAmount / price;
      const newTotalShares = inv.shares + newSharesAcquired;
      const newAvgCost =
        newTotalShares > 0
          ? (inv.shares * inv.avgCost + inv.recurringAmount) / newTotalShares
          : price;

      await prisma.$transaction([
        prisma.trackedInvestment.update({
          where: { id: inv.id },
          data: {
            shares: newTotalShares,
            avgCost: newAvgCost,
            lastProcessedDate: now,
          },
        }),
        prisma.investmentTransaction.create({
          data: {
            investmentId: inv.id,
            userId: inv.userId,
            type: "AUTO_INVEST",
            amount: inv.recurringAmount,
            price,
            shares: newSharesAcquired,
          },
        }),
      ]);

      processed++;
    } catch (err) {
      errors.push(`${inv.symbol}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    processed,
    skipped,
    errors,
    day: todayDayOfWeek,
    date: todayStart.toISOString().slice(0, 10),
    total: investments.length,
  });
}
