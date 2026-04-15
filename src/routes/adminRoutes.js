import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/admin/devices — all devices across all users
router.get("/devices", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        d.id, d.serial_number, d.platform,
        d.poll_interval_seconds, d.paired_at,
        u.email        AS owner_email,
        sa.username,
        c.value        AS current_count,
        c.fetched_at   AS last_updated
      FROM devices d
      JOIN users u ON u.id = d.owner_id
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

// GET /api/admin/users — all registered users with their device count
router.get("/users", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.id,
        u.email,
        u.is_admin,
        u.created_at,
        COUNT(d.id)::int AS device_count
      FROM users u
      LEFT JOIN devices d ON d.owner_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/stats — platform-level summary
router.get("/stats", async (req, res) => {
  try {
    const [usersRes, devicesRes, platformRes, countsRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users`),
      query(`SELECT COUNT(*)::int AS total FROM devices WHERE paired_at IS NOT NULL`),
      query(`
        SELECT platform, COUNT(*)::int AS count
        FROM devices
        WHERE paired_at IS NOT NULL
        GROUP BY platform
      `),
      query(`SELECT COALESCE(SUM(value), 0)::bigint AS total_followers FROM counts`),
    ]);

    const byPlatform = {};
    for (const row of platformRes.rows) byPlatform[row.platform] = row.count;

    res.json({
      total_users: usersRes.rows[0].total,
      total_devices: devicesRes.rows[0].total,
      devices_by_platform: byPlatform,
      total_followers_tracked: Number(countsRes.rows[0].total_followers),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/devices/:id — force-remove any device (admin override)
router.delete("/devices/:id", async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM devices WHERE id = $1`,
      [req.params.id],
    );
    if (rowCount === 0)
      return res.status(404).json({ error: "Device not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
