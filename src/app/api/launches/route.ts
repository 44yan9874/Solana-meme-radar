import { NextResponse } from "next/server";

const PUMP_FUN_PROGRAM =
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

export async function GET() {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { launches: [], error: "Helius API key missing" },
      { status: 500 }
    );
  }

  try {
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [
          PUMP_FUN_PROGRAM,
          {
            limit: 25,
          },
        ],
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Helius RPC error");
    }

    const signatures = data.result || [];

    const launches = signatures
      .filter((tx: any) => tx.err === null)
      .map((tx: any) => {
        const timestamp = tx.blockTime
          ? tx.blockTime * 1000
          : Date.now();

        const ageSeconds = Math.max(
          0,
          Math.floor((Date.now() - timestamp) / 1000)
        );

        return {
          signature: tx.signature,
          timestamp,
          ageSeconds,
          age: formatAge(ageSeconds),
          status: "Launch activity detected",
          explorerUrl: `https://solscan.io/tx/${tx.signature}`,
        };
      });

    return NextResponse.json({
      launches,
      count: launches.length,
    });
  } catch (error) {
    console.error("Launch scanner error:", error);

    return NextResponse.json(
      {
        launches: [],
        error: "Failed to scan launch activity",
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