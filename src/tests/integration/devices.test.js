import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import app from "../../app.js";
import { query } from "../../db.js";

const request = supertest(app);
let token, deviceId;

beforeAll(async () => {
  await query(
    `TRUNCATE users, devices, social_accounts, counts RESTART IDENTITY CASCADE`,
  );
  await request
    .post("/api/auth/register")
    .send({ email: "devices@test.com", password: "password123" });
  const res = await request
    .post("/api/auth/login")
    .send({ email: "devices@test.com", password: "password123" });
  token = res.body.token;
});

describe("POST /api/devices/pair", () => {
  it("pairs a new device", async () => {
    const res = await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "TEST-001",
        platform: "instagram",
        username: "testshop",
        platform_user_id: "ig_test_001",
      });
    expect(res.status).toBe(201);
    expect(res.body.device_token).toBeDefined();
    deviceId = res.body.device_id;
  });

  it("rejects duplicate serial number", async () => {
    await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "TEST-DUP",
        platform: "instagram",
        username: "shop1",
        platform_user_id: "ig_dup_001",
      });
    const res = await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "TEST-DUP",
        platform: "instagram",
        username: "shop2",
        platform_user_id: "ig_dup_002",
      });
    expect(res.status).toBe(409);
  });

  it("rejects invalid platform", async () => {
    const res = await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "TEST-002",
        platform: "twitter",
        username: "testshop",
        platform_user_id: "tw_001",
      });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request.post("/api/devices/pair").send({
      serial_number: "TEST-003",
      platform: "instagram",
      username: "x",
      platform_user_id: "y",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/devices", () => {
  beforeAll(async () => {
    const res = await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "LIST-001",
        platform: "instagram",
        username: "listshop",
        platform_user_id: "ig_list_001",
      });
    deviceId = res.body.device_id;
  });

  it("returns list of devices", async () => {
    const res = await request
      .get("/api/devices")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.devices)).toBe(true);
    expect(res.body.devices.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request.get("/api/devices");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/devices/:id/settings", () => {
  beforeAll(async () => {
    const res = await request
      .post("/api/devices/pair")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serial_number: "SETTINGS-001",
        platform: "instagram",
        username: "settingsshop",
        platform_user_id: "ig_settings_001",
      });
    deviceId = res.body.device_id;
  });

  it("updates poll interval", async () => {
    const res = await request
      .put(`/api/devices/${deviceId}/settings`)
      .set("Authorization", `Bearer ${token}`)
      .send({ poll_interval_seconds: 30 });
    expect(res.status).toBe(200);
    expect(res.body.updated.poll_interval_seconds).toBe(30);
  });

  it("rejects interval below 6", async () => {
    const res = await request
      .put(`/api/devices/${deviceId}/settings`)
      .set("Authorization", `Bearer ${token}`)
      .send({ poll_interval_seconds: 3 });
    expect(res.status).toBe(400);
  });
});
describe("GET /api/admin/devices", () => {
  it("rejects non-admin user", async () => {
    const res = await request
      .get("/api/admin/devices")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
