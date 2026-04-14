import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import app from "../../app.js";
import { query } from "../../db.js";

const request = supertest(app);
let deviceId, deviceToken;

beforeAll(async () => {
  await query(
    `TRUNCATE users, devices, social_accounts, counts RESTART IDENTITY CASCADE`,
  );

  const {
    rows: [user],
  } = await query(
    `INSERT INTO users (email, password_hash) VALUES ('counttest@test.com', 'x') RETURNING id`,
  );
  const {
    rows: [device],
  } = await query(
    `INSERT INTO devices (owner_id, serial_number, platform, paired_at)
     VALUES ($1, 'COUNT-001', 'instagram', NOW())
     RETURNING id, device_token`,
    [user.id],
  );
  deviceId = device.id;
  deviceToken = device.device_token;

  await query(
    `INSERT INTO social_accounts (device_id, platform, platform_user_id, username, access_token)
     VALUES ($1, 'instagram', 'ig_001', 'testshop', 'mock_token')`,
    [deviceId],
  );
  await query(`INSERT INTO counts (device_id, value) VALUES ($1, 99999)`, [
    deviceId,
  ]);
});

describe("GET /api/count/:deviceId", () => {
  it("returns count for valid device and token", async () => {
    const res = await request
      .get(`/api/count/${deviceId}`)
      .set("x-device-token", deviceToken);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(99999);
    expect(res.body.interval).toBeDefined();
  });

  it("rejects missing token", async () => {
    const res = await request.get(`/api/count/${deviceId}`);
    expect(res.status).toBe(401);
  });

  it("rejects wrong token", async () => {
    const res = await request
      .get(`/api/count/${deviceId}`)
      .set("x-device-token", "wrongtoken");
    expect(res.status).toBe(403);
  });

  it("rejects unknown device id", async () => {
    const res = await request
      .get("/api/count/00000000-0000-0000-0000-000000000000")
      .set("x-device-token", deviceToken);
    expect(res.status).toBe(403);
  });
});
