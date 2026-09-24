export type TwitterMetrics = {
  followers: number | null;
  engagement: number | null;
  mentions24h: number | null;
};

export async function getTwitterMetrics(
  username: string | null
): Promise<TwitterMetrics> {
  if (!username) {
    return {
      followers: null,
      engagement: null,
      mentions24h: null,
    };
  }

  const apiKey = process.env.SOCIALDATA_API_KEY;

  if (!apiKey) {
    console.error("SOCIALDATA_API_KEY is missing");

    return {
      followers: null,
      engagement: null,
      mentions24h: null,
    };
  }

  try {
    const cleanUsername = username.replace(/^@/, "");

    const response = await fetch(
      `https://api.socialdata.tools/twitter/user/${encodeURIComponent(
        cleanUsername
      )}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `SocialData request failed: ${response.status} ${response.statusText}`
      );
    }

    const user = await response.json();

    const followers =
      typeof user.followers_count === "number"
        ? user.followers_count
        : null;
console.log(`SocialData @${cleanUsername}: ${followers} followers`);
    return {
      followers,
      engagement: null,
      mentions24h: null,
    };
  } catch (error) {
    console.error(`Failed to fetch X metrics for @${username}:`, error);

    return {
      followers: null,
      engagement: null,
      mentions24h: null,
    };
  }
}