import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
// All routes here require a logged-in dashboard user
router.use(requireAuth);

// POST /api/devices/pair
// Customer registers their device and links a social account
router.post("/pair", async (req, res) => {
  const { serial_number, platform, platform_user_id, username, access_token } =
    req.body;

  if (!serial_number || !platform || !platform_user_id || !username)
    return res.status(400).json({ error: "Missing required fields" });

  if (!["instagram", "tiktok"].includes(platform))
    return res.status(400).json({ error: "Invalid platform" });

  try {
    // 1. Create the device row
    const deviceResult = await query(
      `INSERT INTO devices (owner_id, serial_number, platform, paired_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, device_token`,
      [req.user.userId, serial_number, platform],
    );

    const device = deviceResult.rows[0];

    // 2. Link the social account
    await query(
      `INSERT INTO social_accounts
         (device_id, platform, platform_user_id, username, access_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        device.id,
        platform,
        platform_user_id,
        username,
        access_token || "mock_token",
      ],
    );

    // 3. Seed an initial count of 0
    await query(`INSERT INTO counts (device_id, value) VALUES ($1, 0)`, [
      device.id,
    ]);

    res.status(201).json({
      device_id: device.id,
      device_token: device.device_token,
      message: "Device paired successfully",
    });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "Serial number already registered" });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/devices
// List all devices owned by the logged-in user
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         d.id,
         d.serial_number,
         d.platform,
         d.poll_interval_seconds,
         d.paired_at,
         sa.username,
         c.value        AS current_count,
         c.fetched_at   AS last_updated
       FROM devices d
       LEFT JOIN social_accounts sa ON sa.device_id = d.id
       LEFT JOIN counts c ON c.device_id = d.id
       WHERE d.owner_id = $1
       ORDER BY d.paired_at DESC`,
      [req.user.userId],
    );
    res.json({ devices: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/devices/:id/status
// Current count + last updated for one device
router.get("/:id/status", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         d.id,
         d.serial_number,
         d.platform,
         d.poll_interval_seconds,
         sa.username,
         c.value        AS current_count,
         c.fetched_at   AS last_updated
       FROM devices d
       LEFT JOIN social_accounts sa ON sa.device_id = d.id
       LEFT JOIN counts c ON c.device_id = d.id
       WHERE d.id = $1 AND d.owner_id = $2`,
      [req.params.id, req.user.userId],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Device not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/devices/:id/settings
// Update poll interval
router.put("/:id/settings", async (req, res) => {
  const { poll_interval_seconds } = req.body;

  if (!poll_interval_seconds || poll_interval_seconds < 6)
    return res.status(400).json({ error: "Minimum interval is 6 seconds" });

  try {
    const { rows } = await query(
      `UPDATE devices
       SET poll_interval_seconds = $1
       WHERE id = $2 AND owner_id = $3
       RETURNING id, poll_interval_seconds`,
      [poll_interval_seconds, req.params.id, req.user.userId],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Device not found" });

    res.json({ updated: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/devices — all devices (you only, for now)
// In production you'd add an is_admin check on the user
router.get("/admin/devices", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        d.id, d.serial_number, d.platform,
        d.poll_interval_seconds, d.paired_at,
        sa.username,
        c.value      AS current_count,
        c.fetched_at AS last_updated
      FROM devices d
      LEFT JOIN social_accounts sa ON sa.device_id = d.id
      LEFT JOIN counts c ON c.device_id = d.id
      ORDER BY d.paired_at DESC
    `);
    res.json({ devices: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
