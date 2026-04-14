import { query } from "../db.js";
import { getFollowerCount as getMockCount } from "./providers/mock.js";

// Runs once, polls all active devices on their own interval
export async function startPoller() {
  console.log("[poller] starting...");

  // Fetch all devices that have a linked social account
  const { rows: devices } = await query(`
    SELECT
      d.id            AS device_id,
      d.platform,
      d.poll_interval_seconds,
      sa.platform_user_id,
      sa.access_token
    FROM devices d
    JOIN social_accounts sa ON sa.device_id = d.id
    WHERE d.paired_at IS NOT NULL
  `);

  if (devices.length === 0) {
    console.log("[poller] no paired devices found");
  }

  // Each device gets its own independent interval
  for (const device of devices) {
    scheduleDevice(device);
  }
}

function scheduleDevice(device) {
  console.log(
    `[poller] scheduling device ${device.device_id} every ${device.poll_interval_seconds}s`,
  );

  const intervalMs = device.poll_interval_seconds * 1000;

  // Poll immediately once, then on interval
  pollDevice(device);
  setInterval(() => pollDevice(device), intervalMs);
}

async function pollDevice(device) {
  try {
    const count = await fetchCount(device);

    // Upsert — insert if not exists, update if exists
    await query(
      `
      INSERT INTO counts (device_id, value, fetched_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (device_id)
      DO UPDATE SET value = $2, fetched_at = NOW()
    `,
      [device.device_id, count],
    );

    console.log(`[poller] device ${device.device_id} → ${count}`);
  } catch (err) {
    console.error(
      `[poller] error for device ${device.device_id}:`,
      err.message,
    );
  }
}

async function fetchCount(device) {
  // Swap this switch when real APIs are ready
  switch (device.platform) {
    case "instagram":
      return getMockCount(device.platform_user_id);
    case "tiktok":
      return getMockCount(device.platform_user_id);
    default:
      throw new Error(`Unknown platform: ${device.platform}`);
  }
}
