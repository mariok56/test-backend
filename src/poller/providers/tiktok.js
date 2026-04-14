// TODO: implement when TikTok app is approved
// Docs: https://developers.tiktok.com/doc/tiktok-api-v2-user-info

export async function getFollowerCount(accessToken) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data.user.follower_count;
}
