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

  try {
    // X metrics provider will be connected here.
    // For now we fail safely instead of inventing social data.
    return {
      followers: null,
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