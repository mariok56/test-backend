// Simulates a follower count that slowly grows
// so you can watch the display update in real time

const state = {};

export async function getFollowerCount(platformUserId) {
  if (!state[platformUserId]) {
    state[platformUserId] = 10000 + Math.floor(Math.random() * 5000);
  }
  // Random chance of +1 to +3 new followers each poll
  const gain = Math.random() > 0.4 ? Math.floor(Math.random() * 3) : 0;
  state[platformUserId] += gain;
  return state[platformUserId];
}
