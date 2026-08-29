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

    const solanaTokens = boostedTokens
      .filter((token: any) => token.chainId === "solana")
      .slice(0, 20);

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

        const score = calculateScore({
          marketCap,
          liquidity,
          volume24h,
          change24h,
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
}: {
  marketCap: number;
  liquidity: number;
  volume24h: number;
  change24h: number;
}) {
  let score = 0;

  // LOW MARKET CAP
  if (marketCap > 0 && marketCap < 50_000) {
    score += 30;
  } else if (marketCap < 100_000) {
    score += 25;
  } else if (marketCap < 250_000) {
    score += 20;
  } else if (marketCap < 500_000) {
    score += 10;
  }

  // LIQUIDITY
  if (liquidity >= 50_000) {
    score += 25;
  } else if (liquidity >= 20_000) {
    score += 20;
  } else if (liquidity >= 10_000) {
    score += 15;
  } else if (liquidity >= 5_000) {
    score += 5;
  }

  // 24H VOLUME
  if (volume24h >= 250_000) {
    score += 25;
  } else if (volume24h >= 100_000) {
    score += 20;
  } else if (volume24h >= 50_000) {
    score += 15;
  } else if (volume24h >= 10_000) {
    score += 10;
  }

  // PRICE MOMENTUM
  if (change24h >= 100) {
    score += 20;
  } else if (change24h >= 50) {
    score += 15;
  } else if (change24h >= 20) {
    score += 10;
  } else if (change24h > 0) {
    score += 5;
  }

  return Math.min(score, 100);
}