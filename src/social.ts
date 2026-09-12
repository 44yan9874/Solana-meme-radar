export type SocialLinks = {
  twitter: string | null;
  telegram: string | null;
  website: string | null;
};

export type SocialMetrics = {
  twitterFollowers: number | null;
  twitterEngagement: number | null;
  telegramMembers: number | null;
  mentions24h: number | null;
};

export type SocialScore = {
  score: number;
  breakdown: {
    twitter: number;
    telegram: number;
    traction: number;
    website: number;
  };
};

type SocialWebsite = {
  url?: string | null;
};

type SocialItem = {
  type?: string | null;
  url?: string | null;
};

type TokenSocialInfo = {
  info?: {
    websites?: SocialWebsite[];
    socials?: SocialItem[];
  };
};

export function extractSocialLinks(token: TokenSocialInfo): SocialLinks {
  const websites = token.info?.websites || [];
  const socials = token.info?.socials || [];

  const website =
    websites.find((site) => site.url)?.url || null;

  const twitter =
    socials.find(
      (social) => social.type?.toLowerCase() === "twitter"
    )?.url || null;

  const telegram =
    socials.find(
      (social) => social.type?.toLowerCase() === "telegram"
    )?.url || null;

  return {
    website,
    twitter,
    telegram,
  };
}

export function calculateTractionScore(
  metrics: SocialMetrics
): number {
  let score = 0;

  if (metrics.twitterFollowers !== null) {
    if (metrics.twitterFollowers >= 10000) score += 25;
    else if (metrics.twitterFollowers >= 2500) score += 18;
    else if (metrics.twitterFollowers >= 500) score += 10;
    else if (metrics.twitterFollowers >= 100) score += 5;
  }

  if (metrics.telegramMembers !== null) {
    if (metrics.telegramMembers >= 5000) score += 20;
    else if (metrics.telegramMembers >= 1000) score += 12;
    else if (metrics.telegramMembers >= 250) score += 6;
  }

  if (metrics.mentions24h !== null) {
    if (metrics.mentions24h >= 100) score += 25;
    else if (metrics.mentions24h >= 25) score += 15;
    else if (metrics.mentions24h >= 5) score += 7;
  }

  if (metrics.twitterEngagement !== null) {
    if (metrics.twitterEngagement >= 10) score += 30;
    else if (metrics.twitterEngagement >= 5) score += 20;
    else if (metrics.twitterEngagement >= 2) score += 10;
  }

  return Math.min(score, 100);
}
export function calculateSocialScore(
  
    links: SocialLinks,
  metrics?: SocialMetrics
): SocialScore {
  let twitterScore = 0;
  let telegramScore = 0;
  let websiteScore = 0;

  if (links.twitter) {
  if (metrics?.twitterFollowers != null) {
    if (metrics.twitterFollowers >= 10000) twitterScore = 35;
    else if (metrics.twitterFollowers >= 2500) twitterScore = 28;
    else if (metrics.twitterFollowers >= 500) twitterScore = 20;
    else if (metrics.twitterFollowers >= 100) twitterScore = 12;
    else twitterScore = 6;
  } else {
    twitterScore = 10;
  }
}
  if (links.telegram) telegramScore = 35;
  if (links.website) websiteScore = 30;
  const tractionScore = metrics
  ? calculateTractionScore(metrics)
  : 0;

  return {
    score: Math.min(
  twitterScore + telegramScore + websiteScore + tractionScore,
  100
),
    breakdown: {
      twitter: twitterScore,
      telegram: telegramScore,
      website: websiteScore,
      traction: tractionScore,
    },
  };
}

export function extractTwitterUsername(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname !== "x.com" &&
      hostname !== "www.x.com" &&
      hostname !== "twitter.com" &&
      hostname !== "www.twitter.com"
    ) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const username = parts[0];

    if (!username) return null;

    const blocked = [
      "home",
      "search",
      "explore",
      "notifications",
      "messages",
      "i",
      "intent",
    ];

    if (blocked.includes(username.toLowerCase())) return null;

    return username.replace(/^@/, "");
  } catch {
    return null;
  }
}