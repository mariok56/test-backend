import { query } from "../db.js";
import {
  getFollowerCount as getInstagramCount,
  refreshToken,
} from "./providers/instagram.js";

const activeIntervals = new Map();
const RECONCILE_MS = 30_000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function startPoller() {
  console.log("[poller] starting...");
  await reconcile();
  setInterval(reconcile, RECONCILE_MS);

  // Refresh Instagram tokens every 30 days
  await refreshAllTokens();
  setInterval(refreshAllTokens, THIRTY_DAYS_MS);
}

export async function triggerReconcile() {
  await reconcile();
}

async function refreshAllTokens() {
  console.log("[token-refresh] starting refresh cycle...");
  try {
    const { rows } = await query(
      `SELECT id, access_token, username
       FROM social_accounts
       WHERE platform = 'instagram'`,
    );
    if (rows.length === 0) {
      console.log("[token-refresh] no instagram accounts found");
      return;
    }
    for (const account of rows) {
      try {
        const newToken = await refreshToken(account.access_token);
        await query(
          `UPDATE social_accounts SET access_token = $1 WHERE id = $2`,
          [newToken, account.id],
        );
        console.log(`[token-refresh] refreshed token for @${account.username}`);
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

  for (const [id, intervalId] of activeIntervals) {
    if (!currentIds.has(id)) {
      clearInterval(intervalId);
      activeIntervals.delete(id);
      console.log(`[poller] stopped polling removed device ${id}`);
    }
  }

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
    console.log(`[poller] device ${device.device_id} → ${count}`);
  } catch (err) {
    console.error(
      `[poller] error for device ${device.device_id}:`,
      err.message,
    );
  }
}

async function fetchCount(device) {
  switch (device.platform) {
    case "instagram":
      return getInstagramCount(device.access_token, device.platform_user_id);
    case "tiktok":
      throw new Error("TikTok provider not yet implemented");
    default:
      throw new Error(`Unknown platform: ${device.platform}`);
  }
}
