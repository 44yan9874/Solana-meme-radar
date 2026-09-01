import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.dexscreener.com/token-boosts/latest/v1",
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("DEX Screener request failed");
    }

    const boostedTokens = await response.json();

    const solanaTokens = Array.from(
  new Map(
    boostedTokens
      .filter((token: any) => token.chainId === "solana")
      .map((token: any) => [token.tokenAddress, token])
  ).values()
).slice(0, 20);

    const results = [];

    for (const token of solanaTokens) {
      try {
        const pairResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.tokenAddress}`,
          {
            cache: "no-store",
          }
        );

        if (!pairResponse.ok) {
          continue;
        }

        const pairData = await pairResponse.json();
        const pairs = pairData.pairs || [];

        const solanaPair = pairs
          .filter((pair: any) => pair.chainId === "solana")
          .sort(
            (a: any, b: any) =>
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
          )[0];

        if (!solanaPair) {
          continue;
        }

const marketCap = solanaPair.marketCap || solanaPair.fdv || 0;
const liquidity = solanaPair.liquidity?.usd || 0;
const volume24h = solanaPair.volume?.h24 || 0;
const change24h = solanaPair.priceChange?.h24 || 0;
const buys24h = solanaPair.txns?.h24?.buys || 0;
const sells24h = solanaPair.txns?.h24?.sells || 0;
const buyPressure = buys24h + sells24h > 0
  ? buys24h / (buys24h + sells24h)
  : 0;
const pairCreatedAt = solanaPair.pairCreatedAt || 0;

const ageMinutes = pairCreatedAt
  ? Math.max(0, Math.floor((Date.now() - pairCreatedAt) / 60000))
  : 0;

        const score = calculateScore({
          marketCap,
          liquidity,
          volume24h,
          change24h,
          buys24h,
sells24h,
buyPressure,
          ageMinutes,
        });

        results.push({
          name: solanaPair.baseToken?.name || "Unknown",
          symbol: solanaPair.baseToken?.symbol || "UNKNOWN",
          address:
            solanaPair.baseToken?.address || token.tokenAddress,
          priceUsd: solanaPair.priceUsd || "0",
          marketCap,
          liquidity,
          volume24h,
          change24h,
          buys24h,
sells24h,
buyPressure,
          ageMinutes,
          dexUrl: solanaPair.url || "#",
          score,
        });
      } catch (error) {
        console.error("Failed to process token:", error);
      }
    }

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      tokens: results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        tokens: [],
        error: "Radar failed",
      },
      { status: 500 }
    );
  }
}

function calculateScore({
  marketCap,
  liquidity,
  volume24h,
  change24h,
  buys24h,
sells24h,
buyPressure,
  ageMinutes,
}: {
  marketCap: number;
  liquidity: number;
  volume24h: number;
  change24h: number;
  buys24h: number;
sells24h: number;
buyPressure: number;
  ageMinutes: number;
}) {
  let score = 0;

  // NEW LAUNCH — max 20
  if (ageMinutes > 0 && ageMinutes <= 10) {
    score += 20;
  } else if (ageMinutes <= 30) {
    score += 17;
  } else if (ageMinutes <= 60) {
    score += 14;
  } else if (ageMinutes <= 180) {
    score += 10;
  } else if (ageMinutes <= 720) {
    score += 5;
  }

  // MARKET CAP — max 20
  if (marketCap >= 25_000 && marketCap < 75_000) {
    score += 20;
  } else if (marketCap >= 75_000 && marketCap < 150_000) {
    score += 18;
  } else if (marketCap >= 150_000 && marketCap < 300_000) {
    score += 14;
  } else if (marketCap >= 300_000 && marketCap < 500_000) {
    score += 10;
  } else if (marketCap > 0 && marketCap < 25_000) {
    score += 6;
  }

  // LIQUIDITY — max 20
  if (liquidity >= 75_000) {
    score += 20;
  } else if (liquidity >= 40_000) {
    score += 18;
  } else if (liquidity >= 20_000) {
    score += 14;
  } else if (liquidity >= 10_000) {
    score += 9;
  } else if (liquidity >= 5_000) {
    score += 4;
  }

  // VOLUME — max 20
  if (volume24h >= 500_000) {
    score += 20;
  } else if (volume24h >= 250_000) {
    score += 18;
  } else if (volume24h >= 100_000) {
    score += 15;
  } else if (volume24h >= 50_000) {
    score += 11;
  } else if (volume24h >= 20_000) {
    score += 7;
  } else if (volume24h >= 5_000) {
    score += 3;
  }

  // MOMENTUM — max 20
  if (change24h >= 20 && change24h < 100) {
    score += 12;
  } else if (change24h >= 100 && change24h < 300) {
    score += 18;
  } else if (change24h >= 300 && change24h < 1000) {
    score += 20;
  } else if (change24h >= 1000) {
    score += 10;
  } else if (change24h > 0) {
    score += 6;
  }

  // BUY PRESSURE - max 10
const totalTxns = buys24h + sells24h;

if (totalTxns >= 20) {
  if (buyPressure >= 0.60 && buyPressure <= 0.75) {
    score += 10;
  } else if (buyPressure > 0.50 && buyPressure < 0.60) {
    score += 6;
  } else if (buyPressure > 0.75 && buyPressure <= 0.90) {
    score += 5;
  } else if (buyPressure < 0.40) {
    score -= 8;
  }
}

  // RISK PENALTIES
  if (liquidity < 5_000) {
    score -= 20;
  }

  if (marketCap > 0 && marketCap < 10_000) {
    score -= 10;
  }

  if (change24h <= -50) {
    score -= 15;
  } else if (change24h <= -25) {
    score -= 8;
  }

  return Math.max(0, Math.min(score, 100));
}