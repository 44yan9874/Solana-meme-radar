import "server-only";
import { supabase } from "@/lib/supabase";

export async function recordLiquiditySnapshot(
  tokenAddress: string,
  liquidityUsd: number
): Promise<boolean> {
  if (!supabase || !tokenAddress.trim()) return false;
  if (!Number.isFinite(liquidityUsd) || liquidityUsd < 0) return false;
  const { data: latest, error: readError } = await supabase
    .from("liquidity_snapshots")
    .select("recorded_at")
    .eq("token_address", tokenAddress)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error("Liquidity snapshot read error:", readError.message);
    return false;
  }

  if (latest?.recorded_at) {
    const lastRecorded = new Date(latest.recorded_at).getTime();
    if (
      Number.isFinite(lastRecorded) &&
      Date.now() - lastRecorded < 5 * 60 * 1000
    ) {
      return false;
    }
  }
  const { error } = await supabase
    .from("liquidity_snapshots")
    .insert({
      token_address: tokenAddress,
      liquidity_usd: liquidityUsd,
    });

  if (error) {
    console.error("Liquidity snapshot error:", error.message);
    return false;
  }

  return true;
}
export async function getLiquidityDropPercent(
  tokenAddress: string,
  currentLiquidity: number
): Promise<number | null> {
  if (!supabase || !tokenAddress.trim()) return null;
  if (!Number.isFinite(currentLiquidity) || currentLiquidity < 0) return null;

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("liquidity_snapshots")
    .select("liquidity_usd, recorded_at")
    .eq("token_address", tokenAddress)
    .lte("recorded_at", cutoff)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Liquidity history error:", error.message);
    return null;
  }

  const previousLiquidity = Number(data?.liquidity_usd);

  if (!data || !Number.isFinite(previousLiquidity) || previousLiquidity <= 0) {
    return null;
  }

  return Math.max(
    0,
    ((previousLiquidity - currentLiquidity) / previousLiquidity) * 100
  );
}