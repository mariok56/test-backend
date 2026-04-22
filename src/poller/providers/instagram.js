export async function getFollowerCount(accessToken, platformUserId) {
  const res = await fetch(
    `https://graph.instagram.com/me?fields=followers_count&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.followers_count && data.followers_count !== 0) {
    throw new Error(`No followers_count in response: ${JSON.stringify(data)}`);
  }
  return data.followers_count;
}

async function refreshAllTokens() {
  try {
    const { rows } = await query(
      `SELECT id, access_token, username
       FROM social_accounts
       WHERE platform = 'instagram'`,
    );
    if (rows.length === 0) return;

    for (const account of rows) {
      try {
        const newToken = await refreshToken(account.access_token);
        await query(
          `UPDATE social_accounts SET access_token = $1 WHERE id = $2`,
          [newToken, account.id],
        );
      } catch (err) {
        console.error(
          `[token-refresh] FAILED for @${account.username}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.error("[token-refresh] query failed:", err.message);
  }
}
