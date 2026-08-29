"use client";

import { useEffect, useState } from "react";

type Token = {
  name: string;
  symbol: string;
  address: string;
  priceUsd: string;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  change24h: number;
  dexUrl: string;
  score: number;
};

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    try {
      setLoading(true);

      const response = await fetch("/api/tokens");
      const data = await response.json();

      setTokens(data.tokens || []);
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">🚨 Solana Meme Radar</h1>
          <p className="text-gray-400 mt-2">
            Finding low-cap Solana meme coins before they trend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Coins Found" value={tokens.length.toString()} />
          <StatCard
            title="High Score"
            value={
              tokens.length
                ? Math.max(...tokens.map((token) => token.score)).toString()
                : "0"
            }
          />
          <StatCard title="Network" value="Solana" />
          <StatCard title="Radar" value="ONLINE" />
        </div>

        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-semibold">Live Radar</h2>

          <button
            onClick={loadTokens}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-5 py-2 rounded-lg"
          >
            Refresh Radar
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Scanning Solana...</div>
        ) : tokens.length === 0 ? (
          <div className="border border-gray-800 rounded-xl p-10 text-center">
            No coins found yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-800 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="p-4 text-left">Coin</th>
                  <th className="p-4 text-left">Price</th>
                  <th className="p-4 text-left">Market Cap</th>
                  <th className="p-4 text-left">Liquidity</th>
                  <th className="p-4 text-left">24H Volume</th>
                  <th className="p-4 text-left">24H Change</th>
                  <th className="p-4 text-left">Radar Score</th>
                  <th className="p-4 text-left">DEX</th>
                </tr>
              </thead>

              <tbody>
                {tokens.map((token, index) => (
  <tr
    key={`${token.address}-${index}`}
                    className="border-t border-gray-800 hover:bg-gray-950"
                  >
                    <td className="p-4">
                      <div className="font-semibold">{token.name}</div>
                      <div className="text-gray-500">${token.symbol}</div>
                    </td>

                    <td className="p-4">
                      ${Number(token.priceUsd || 0).toFixed(8)}
                    </td>

                    <td className="p-4">${formatNumber(token.marketCap)}</td>
                    <td className="p-4">${formatNumber(token.liquidity)}</td>
                    <td className="p-4">${formatNumber(token.volume24h)}</td>

                    <td
                      className={`p-4 ${
                        token.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {token.change24h}%
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full font-bold ${
                          token.score >= 75
                            ? "bg-green-500 text-black"
                            : token.score >= 50
                            ? "bg-yellow-500 text-black"
                            : "bg-red-500 text-black"
                        }`}
                      >
                        {token.score}/100
                      </span>
                    </td>

                    <td className="p-4">
                      <a
                        href={token.dexUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function formatNumber(value: number) {
  if (!value) return "0";

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(0);
}
