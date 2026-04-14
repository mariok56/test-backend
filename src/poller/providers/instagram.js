// TODO: implement when Facebook app is approved
// Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-user

export async function getFollowerCount(accessToken, platformUserId) {
  const res = await fetch(
    `https://graph.instagram.com/${platformUserId}?fields=followers_count&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.followers_count;
}
