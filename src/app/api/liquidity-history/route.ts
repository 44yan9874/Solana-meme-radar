import { NextRequest, NextResponse } from "next/server";
import { getLiquidityHistory } from "@/lib/liquidity";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  const hours = Number(searchParams.get("hours") ?? "24");

  if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json(
      { error: "Invalid token address" },
      { status: 400 }
    );
  }

  if (![1, 6, 24].includes(hours)) {
    return NextResponse.json(
      { error: "Invalid time range" },
      { status: 400 }
    );
  }

  const history = await getLiquidityHistory(address, hours);

  return NextResponse.json(
    { address, hours, history },
    { headers: { "Cache-Control": "no-store" } }
  );
}
