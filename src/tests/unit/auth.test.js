import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test_secret";

describe("bcrypt", () => {
  it("hashes a password", async () => {
    const hash = await bcrypt.hash("password123", 10);
    expect(hash).not.toBe("password123");
    expect(hash.startsWith("$2b$")).toBe(true);
  });

  it("verifies correct password", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const valid = await bcrypt.compare("password123", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const valid = await bcrypt.compare("wrongpassword", hash);
    expect(valid).toBe(false);
  });
});

describe("jwt", () => {
  it("signs and verifies a token", () => {
    const token = jwt.sign({ userId: "abc", email: "a@b.com" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const payload = jwt.verify(token, JWT_SECRET);
    expect(payload.userId).toBe("abc");
    expect(payload.email).toBe("a@b.com");
  });

  it("rejects a tampered token", () => {
    const token = jwt.sign({ userId: "abc" }, JWT_SECRET);
    expect(() => jwt.verify(token + "x", JWT_SECRET)).toThrow();
  });

  it("rejects expired token", async () => {
    const token = jwt.sign({ userId: "abc" }, JWT_SECRET, { expiresIn: "0s" });
    await new Promise((r) => setTimeout(r, 10));
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });
});
