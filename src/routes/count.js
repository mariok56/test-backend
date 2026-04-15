import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/count/:deviceId
// Called by the ESP32 on every poll cycle
router.get("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  const token = req.headers["x-device-token"];

  if (!token) {
    return res.status(401).json({ error: "Missing device token" });
  }

  try {
    // 1. Verify the device exists and token matches
    const deviceResult = await query(
      `SELECT id, poll_interval_seconds, display_digits
       FROM devices
       WHERE id = $1 AND device_token = $2`,
      [deviceId, token],
    );

    if (deviceResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid device or token" });
    }

    const device = deviceResult.rows[0];

    // 2. Fetch the latest count for this device
    const countResult = await query(
      `SELECT value, fetched_at
       FROM counts
       WHERE device_id = $1`,
      [device.id],
    );

    const count = countResult.rows[0] ?? { value: 0, fetched_at: null };

    // 3. Return what the ESP32 needs
    res.json({
      count: Number(count.value),
      interval: device.poll_interval_seconds,
      display_digits: device.display_digits,
      fetched_at: count.fetched_at,
    });
  } catch (err) {
    console.error("GET /count error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
