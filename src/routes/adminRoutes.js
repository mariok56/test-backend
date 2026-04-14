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
