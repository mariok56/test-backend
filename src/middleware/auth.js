import jwt from "jsonwebtoken";
import { query } from "../db.js";

export function requireAuth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
export async function requireAdmin(req, res, next) {
  // requireAuth must run first — this depends on req.user
  const { rows } = await query(`SELECT is_admin FROM users WHERE id = $1`, [
    req.user.userId,
  ]);
  if (!rows[0]?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
