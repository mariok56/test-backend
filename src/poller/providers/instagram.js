export async function getFollowerCount(accessToken, platformUserId) {
  const res = await fetch(
    `https://graph.instagram.com/me?fields=followers_count&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.followers_count;
}
