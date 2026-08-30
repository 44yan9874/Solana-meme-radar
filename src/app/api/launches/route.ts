import { NextResponse } from "next/server";

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
  .slice(0, 5);

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

      const logs: string[] =
        tx.meta?.logMessages || [];

      const isCreate = logs.some(
        (log) =>
          log.includes("Instruction: CreateV2") ||
          log.includes("Instruction: Create")
      );

      if (!isCreate) continue;

      const keys =
        tx.transaction?.message?.accountKeys || [];

      // Pump create_v2 account #1 = new mint.
      // Find Pump instruction and take its first account.
      let mint: string | null = null;

      const instructions =
        tx.transaction?.message?.instructions || [];

      for (const instruction of instructions) {
        if (
          instruction.programId === PUMP_PROGRAM &&
          Array.isArray(instruction.accounts) &&
          instruction.accounts.length > 0
        ) {
          const firstAccount = instruction.accounts[0];

          if (typeof firstAccount === "string") {
            mint = firstAccount;
          } else if (firstAccount?.pubkey) {
            mint = firstAccount.pubkey;
          }

          if (mint) break;
        }
      }

      // Fallback for parsed transaction formats
      if (!mint && keys.length > 0) {
        const possibleMint = keys.find(
          (key: any) =>
            key.signer === true &&
            key.writable === true &&
            key.pubkey !== PUMP_PROGRAM
        );

        mint = possibleMint?.pubkey || null;
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

    return NextResponse.json({
      launches: unique,
      count: unique.length,
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