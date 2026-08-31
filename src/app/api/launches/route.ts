import { NextResponse } from "next/server";

import {
  rememberLaunch,
  markLaunchLive,
  getWatchedLaunches,
} from "../../../lib/launchWatchlist";

const PUMP_PROGRAM =
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

export async function GET() {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { launches: [], error: "Helius API key missing" },
      { status: 500 }
    );
  }

  const rpcUrl =
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  try {
    // 1. Get recent Pump.fun transactions
    const sigResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [
          PUMP_PROGRAM,
          {
            limit: 100,
          },
        ],
      }),
      cache: "no-store",
    });

    const sigData = await sigResponse.json();

    if (sigData.error) {
      throw new Error(sigData.error.message);
    }

    const signatures = (sigData.result || [])
  .filter((item: any) => item.err === null)
  .slice(0, 100);

    // 2. Fetch transactions IN PARALLEL
    const transactions = await Promise.all(
      signatures.map(async (item: any) => {
        try {
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [
                item.signature,
                {
                  encoding: "jsonParsed",
                  maxSupportedTransactionVersion: 0,
                  commitment: "confirmed",
                },
              ],
            }),
            cache: "no-store",
          });

          const data = await response.json();

          return {
            signature: item.signature,
            transaction: data.result,
          };
        } catch {
          return null;
        }
      })
    );

    const launches: any[] = [];

    // 3. Find genuine Pump creation transactions
    for (const result of transactions) {
      if (!result?.transaction) continue;

      const tx = result.transaction;

      const keys =
  tx.transaction?.message?.accountKeys || [];

const instructions =
  tx.transaction?.message?.instructions || [];

let mint: string | null = null;

// A Pump create_v2 instruction has the new mint as account #1.
// The mint account is also a signer, which lets us distinguish
// creation instructions from normal buys/sells/other Pump activity.
for (const instruction of instructions) {
  if (
    instruction.programId !== PUMP_PROGRAM ||
    !Array.isArray(instruction.accounts) ||
    instruction.accounts.length === 0
  ) {
    continue;
  }

  const firstAccount = instruction.accounts[0];

  const firstPubkey =
    typeof firstAccount === "string"
      ? firstAccount
      : firstAccount?.pubkey;

  if (!firstPubkey) continue;

  const keyInfo = keys.find((key: any) => {
    const pubkey =
      typeof key === "string"
        ? key
        : key?.pubkey;

    return pubkey === firstPubkey;
  });

  const isSigner =
    typeof keyInfo === "object" &&
    keyInfo?.signer === true;

  if (isSigner) {
    mint = firstPubkey;
    break;
  }
}

if (!mint) continue;

      const timestamp = tx.blockTime
        ? tx.blockTime * 1000
        : Date.now();

      const ageSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() - timestamp) / 1000
        )
      );
rememberLaunch(mint);
      launches.push({
        mint,
        signature: result.signature,
        ageSeconds,
        age: formatAge(ageSeconds),

        launchpad: "Pump.fun",

        stage: "BONDING_CURVE",

        status: "PRE-LAUNCH",

        tokenUrl:
          `https://solscan.io/token/${mint}`,

        transactionUrl:
          `https://solscan.io/tx/${result.signature}`,
      });
    }

    // 4. Remove duplicate coins
    const unique = Array.from(
      new Map(
        launches.map((coin) => [
          coin.mint,
          coin,
        ])
      ).values()
    );

    unique.sort(
      (a, b) =>
        a.ageSeconds - b.ageSeconds
    );

const watchedLaunches = getWatchedLaunches().map((watched) => {
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - watched.firstSeen) / 1000)
  );

  return {
    mint: watched.mint,
    signature: "",
    ageSeconds,
    age: formatAge(ageSeconds),
    launchpad: "Pump.fun",
    stage: "BONDING_CURVE",
    status: "PRE-LAUNCH",
    tokenUrl: `https://solscan.io/token/${watched.mint}`,
    transactionUrl: "#",
  };
});

const combinedLaunches = Array.from(
  new Map(
    [...watchedLaunches, ...unique].map((coin) => [
      coin.mint,
      coin,
    ])
  ).values()
);
    const enrichedLaunches = await Promise.all(
  unique.map(async (coin) => {
    try {
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${coin.mint}`,
        {
          cache: "no-store",
        }
      );

      if (!dexResponse.ok) {
        return {
          ...coin,
          dexStatus: "WAITING_FOR_PAIR",
        };
      }

      const dexData = await dexResponse.json();

      const solanaPairs = (dexData.pairs || [])
        .filter((pair: any) => pair.chainId === "solana")
        .sort(
          (a: any, b: any) =>
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

      const pair = solanaPairs[0];

      if (!pair) {
        return {
          ...coin,
          dexStatus: "WAITING_FOR_PAIR",
        };
      }
markLaunchLive(coin.mint);
      return {
        ...coin,
        dexStatus: "LIVE",
        name: pair.baseToken?.name || "Unknown",
        symbol: pair.baseToken?.symbol || "UNKNOWN",
        priceUsd: pair.priceUsd || "0",
        marketCap: pair.marketCap || pair.fdv || 0,
        liquidity: pair.liquidity?.usd || 0,
        volume24h: pair.volume?.h24 || 0,
        change24h: pair.priceChange?.h24 || 0,
        dexUrl: pair.url || "#",
      };
    } catch {
      return {
        ...coin,
        dexStatus: "WAITING_FOR_PAIR",
      };
    }
  })
);
    return NextResponse.json({
      launches: enrichedLaunches,
count: enrichedLaunches.length,
      scannedTransactions: signatures.length,
      scanner: "Pump.fun new coin detector",
    });

  } catch (error) {
    console.error(
      "Launch scanner error:",
      error
    );

    return NextResponse.json(
      {
        launches: [],
        error: "Launch scanner failed",
      },
      { status: 500 }
    );
  }
}

function formatAge(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }

  return `${Math.floor(seconds / 3600)}h`;
}