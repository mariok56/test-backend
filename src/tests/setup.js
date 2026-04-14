import { afterAll } from "vitest";
import { pool } from "../db.js";

afterAll(async () => {
  await pool.end();
});
