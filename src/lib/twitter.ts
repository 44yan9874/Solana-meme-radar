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

const userId = user.id_str ? String(user.id_str) : null;

if (!userId) {
  return {
    followers,
    engagement: null,
    mentions24h: null,
  };
}
const tweetsResponse = await fetch(
  `https://api.socialdata.tools/twitter/user/${encodeURIComponent(
    userId
  )}/tweets`,
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  }
);
if (!tweetsResponse.ok) {
  throw new Error(
    `SocialData tweets request failed: ${tweetsResponse.status} ${tweetsResponse.statusText}`
  );
}
const tweetsData = await tweetsResponse.json();

const tweets = Array.isArray(tweetsData.tweets)
  ? tweetsData.tweets
  : [];
  const totalEngagement = tweets.reduce(
  (sum: number, tweet: Record<string, number>) =>
    sum +
    (tweet.favorite_count ?? 0) +
    (tweet.retweet_count ?? 0) +
    (tweet.reply_count ?? 0) +
    (tweet.quote_count ?? 0),
  0
);

const avgInteractions =
  tweets.length > 0
    ? totalEngagement / tweets.length
    : null;

const engagement =
  avgInteractions !== null && followers !== null && followers > 0
    ? Number(((avgInteractions / followers) * 100).toFixed(2))
    : null;
  
const since24h = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

const mentionsQuery =
  `@${cleanUsername} -from:${cleanUsername} since_time:${since24h}`;
  const mentionsResponse = await fetch(
  `https://api.socialdata.tools/twitter/search?query=${encodeURIComponent(
    mentionsQuery
  )}&type=Latest`,
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  }
);
if (!mentionsResponse.ok) {
  throw new Error(
    `SocialData mentions request failed: ${mentionsResponse.status} ${mentionsResponse.statusText}`
  );
}
const mentionsData = await mentionsResponse.json();
const nextCursor =
  typeof mentionsData.next_cursor === "string"
    ? mentionsData.next_cursor
    : null;
let mentionTweets = Array.isArray(mentionsData.tweets)
  ? mentionsData.tweets
  : [];

 let cursor = nextCursor;
let pagesFetched = 1;
const MAX_MENTION_PAGES = 5;

while (cursor && pagesFetched < MAX_MENTION_PAGES) {
  const nextMentionsResponse = await fetch(
    `https://api.socialdata.tools/twitter/search?query=${encodeURIComponent(
      mentionsQuery
    )}&type=Latest&cursor=${encodeURIComponent(cursor)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!nextMentionsResponse.ok) break;

  const nextMentionsData = await nextMentionsResponse.json();

  const nextMentionTweets = Array.isArray(nextMentionsData.tweets)
    ? nextMentionsData.tweets
    : [];

  mentionTweets = [...mentionTweets, ...nextMentionTweets];

  cursor =
    typeof nextMentionsData.next_cursor === "string"
      ? nextMentionsData.next_cursor
      : null;

  pagesFetched++;
}

const mentions24h = mentionTweets.length;

    return {
      followers,
     engagement,
      mentions24h,
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