export async function getTelegramMemberCount(
  telegramUrl: string | null
): Promise<number | null> {
  if (!telegramUrl) return null;

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return null;
    }

    const match = telegramUrl.match(
      /(?:t\.me|telegram\.me)\/(?:joinchat\/|\+)?([^/?#]+)/
    );

    if (!match) {
      return null;
    }

    const username = match[1];

    // Invite links cannot be queried as @usernames.
    if (!username || telegramUrl.includes("/+")) {
      return null;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=@${username}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.ok || typeof data.result !== "number") {
      return null;
    }

    return data.result;
  } catch {
    return null;
  }
}