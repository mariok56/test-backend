import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import app from "../../app.js";
import { query } from "../../db.js";

const request = supertest(app);

beforeAll(async () => {
  await query(
    `TRUNCATE users, devices, social_accounts, counts RESTART IDENTITY CASCADE`,
  );
});

describe("POST /api/auth/register", () => {
  it("creates a new user", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ email: "newuser@test.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("newuser@test.com");
  });

  it("rejects duplicate email", async () => {
    await request
      .post("/api/auth/register")
      .send({ email: "dupe@test.com", password: "password123" });
    const res = await request
      .post("/api/auth/register")
      .send({ email: "dupe@test.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects missing fields", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ email: "nopass@test.com" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ email: "notanemail", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("rejects password shorter than 8 characters", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ email: "short@test.com", password: "abc" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request
      .post("/api/auth/register")
      .send({ email: "login@test.com", password: "password123" });
  });

  it("returns a token on valid credentials", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("rejects unknown email", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "ghost@test.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});
