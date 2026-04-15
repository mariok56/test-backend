import { query } from "../db.js";
import { getFollowerCount as getMockCount } from "./providers/mock.js";

// device_id -> intervalId
const activeIntervals = new Map();

const RECONCILE_MS = 30_000; // re-check DB for new/removed devices every 30s

export async function startPoller() {
  console.log("[poller] starting...");
  await reconcile();
  setInterval(reconcile, RECONCILE_MS);
}

// Called by devices/pair route so new devices start polling immediately
export async function triggerReconcile() {
  await reconcile();
}

async function reconcile() {
  let devices;
  try {
    const { rows } = await query(`
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
    devices = rows;
  } catch (err) {
    console.error("[poller] reconcile query failed:", err.message);
    return;
  }

  const currentIds = new Set(devices.map((d) => d.device_id));

  // Clear intervals for devices no longer in the DB
  for (const [id, intervalId] of activeIntervals) {
    if (!currentIds.has(id)) {
      clearInterval(intervalId);
      activeIntervals.delete(id);
      console.log(`[poller] stopped polling removed device ${id}`);
    }
  }

  // Start intervals for newly paired devices
  for (const device of devices) {
    if (!activeIntervals.has(device.device_id)) {
      scheduleDevice(device);
    }
  }

  if (devices.length === 0) {
    console.log("[poller] no paired devices found");
  }
}

function scheduleDevice(device) {
  console.log(
    `[poller] scheduling device ${device.device_id} every ${device.poll_interval_seconds}s`,
  );

  const intervalMs = device.poll_interval_seconds * 1000;

  // Poll immediately once, then on interval
  pollDevice(device);
  const intervalId = setInterval(() => pollDevice(device), intervalMs);
  activeIntervals.set(device.device_id, intervalId);
}

async function pollDevice(device) {
  try {
    const count = await fetchCount(device);

    await query(
      `INSERT INTO counts (device_id, value, fetched_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (device_id)
       DO UPDATE SET value = $2, fetched_at = NOW()`,
      [device.device_id, count],
    );

    // Append to time-series history for trend charts
    await query(
      `INSERT INTO count_history (device_id, value) VALUES ($1, $2)`,
      [device.device_id, count],
    );

    console.log(`[poller] device ${device.device_id} → ${count}`);
  } catch (err) {
    console.error(`[poller] error for device ${device.device_id}:`, err.message);
  }
}

async function fetchCount(device) {
  switch (device.platform) {
    case "instagram":
    case "tiktok":
      return getMockCount(device.platform_user_id);
    default:
      throw new Error(`Unknown platform: ${device.platform}`);
  }
}
