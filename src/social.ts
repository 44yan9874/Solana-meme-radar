export type SocialLinks = {
  twitter: string | null;
  telegram: string | null;
  website: string | null;
};

export type SocialScore = {
  score: number;
  breakdown: {
    twitter: number;
    telegram: number;
    website: number;
  };
};

export function extractSocialLinks(token: any): SocialLinks {
  const websites = token.info?.websites || [];
  const socials = token.info?.socials || [];

  const website =
    websites.find((site: any) => site.url)?.url || null;

  const twitter =
    socials.find(
      (social: any) => social.type?.toLowerCase() === "twitter"
    )?.url || null;

  const telegram =
    socials.find(
      (social: any) => social.type?.toLowerCase() === "telegram"
    )?.url || null;

  return {
    website,
    twitter,
    telegram,
  };
}

export function calculateSocialScore(
  links: SocialLinks
): SocialScore {
  let twitterScore = 0;
  let telegramScore = 0;
  let websiteScore = 0;

  if (links.twitter) twitterScore = 35;
  if (links.telegram) telegramScore = 35;
  if (links.website) websiteScore = 30;

  return {
    score: twitterScore + telegramScore + websiteScore,
    breakdown: {
      twitter: twitterScore,
      telegram: telegramScore,
      website: websiteScore,
    },
  };
}