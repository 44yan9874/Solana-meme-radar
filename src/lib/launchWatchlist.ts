type WatchedLaunch = {
  mint: string;
  firstSeen: number;
  lastSeen: number;
  status: "WAITING_FOR_PAIR" | "LIVE";
};

const watchlist = new Map<string, WatchedLaunch>();

export function rememberLaunch(mint: string) {
  const now = Date.now();
  const existing = watchlist.get(mint);

  watchlist.set(mint, {
    mint,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
    status: existing?.status ?? "WAITING_FOR_PAIR",
  });
}

export function markLaunchLive(mint: string) {
  const existing = watchlist.get(mint);

  if (!existing) return;

  watchlist.set(mint, {
    ...existing,
    lastSeen: Date.now(),
    status: "LIVE",
  });
}

export function getWatchedLaunches() {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000;

  for (const [mint, launch] of watchlist.entries()) {
    if (now - launch.firstSeen > maxAge) {
      watchlist.delete(mint);
    }
  }

  return Array.from(watchlist.values()).sort(
    (a, b) => b.firstSeen - a.firstSeen
  );
}