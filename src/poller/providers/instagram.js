export async function getFollowerCount(accessToken, platformUserId) {
  const res = await fetch(
    `https://graph.instagram.com/me?fields=followers_count&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.followers_count && data.followers_count !== 0) {
    throw new Error(`No followers_count in response: ${JSON.stringify(data)}`);
  }
  return data.followers_count;
}

export async function refreshToken(accessToken) {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}