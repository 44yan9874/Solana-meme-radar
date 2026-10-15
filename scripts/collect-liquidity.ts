
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("liquidity_snapshots")
    .select("token_address")
    .gte("recorded_at", cutoff)
    .order("recorded_at", { ascending: false })
    .limit(1000);

  if (error) throw error;

  const addresses = [...new Set(
    (data ?? []).map(row => row.token_address).filter(Boolean)
  )].slice(0, 100);

  console.log("Tracking", addresses.length, "tokens");

  let saved = 0;

  for (const address of addresses) {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`
      );

      if (!response.ok) {
        console.error("DEX Screener error:", response.status);
        continue;
      }

      const result = await response.json();
      const pairs = (result.pairs ?? [])
        .filter((pair: any) => pair.chainId === "solana")
        .sort((a: any, b: any) =>
          (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
        );

      const liquidity = pairs[0]?.liquidity?.usd;

      if (typeof liquidity !== "number" || !Number.isFinite(liquidity) || liquidity < 0) {
        continue;
      }

      const { data: latest, error: readError } = await supabase
        .from("liquidity_snapshots")
        .select("recorded_at")
        .eq("token_address", address)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (readError) throw readError;

      if (latest?.recorded_at &&
          Date.now() - new Date(latest.recorded_at).getTime() < 5 * 60 * 1000) {
        continue;
      }

      const { error: insertError } = await supabase
        .from("liquidity_snapshots")
        .insert({ token_address: address, liquidity_usd: liquidity });

      if (insertError) throw insertError;

      saved++;
    } catch (error) {
      console.error("Failed token:", address, error);
    }
  }

  console.log("Snapshots saved:", saved);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
  