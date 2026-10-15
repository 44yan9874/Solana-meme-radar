"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

type LiquidityPoint = {
  liquidity: number;
  timestamp: string;
};

export default function LiquidityChart({ address }: { address: string }) {
  const [hours, setHours] = useState(24);
  const [history, setHistory] = useState<LiquidityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");
      setHistory([]);

      try {
        const response = await fetch(
          `/api/liquidity-history?address=${encodeURIComponent(address)}&hours=${hours}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Request failed");

        const data = await response.json();
        if (!controller.signal.aborted) {
          setHistory(Array.isArray(data.history) ? data.history : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load liquidity history.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadHistory();
    return () => controller.abort();
  }, [address, hours]);

  const chartData = history.map((point) => ({
    liquidity: point.liquidity,
    timestamp: point.timestamp,
    time: new Date(point.timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="rounded-xl border border-purple-800 bg-gray-950 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-purple-300">Liquidity History</h3>
        <div className="flex gap-2">
          {[1, 6, 24].map((range) => (
            <button
              key={range}
              onClick={() => setHours(range)}
              className={`rounded px-3 py-1 text-sm ${
                hours === range
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {range}H
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading liquidity history...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : chartData.length < 2 ? (
        <p className="text-gray-400">
          Not enough historical snapshots to display a chart yet.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis
                stroke="#9CA3AF"
                width={75}
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Liquidity",
                ]}
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#6D28D9",
                  color: "#FFFFFF",
                }}
              />
              <Line
                type="monotone"
                dataKey="liquidity"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}