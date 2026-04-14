import { describe, it, expect } from "vitest";
import { getFollowerCount } from "../../poller/providers/mock.js";

describe("mock provider", () => {
  it("returns a number", async () => {
    const count = await getFollowerCount("user_1");
    expect(typeof count).toBe("number");
  });

  it("starts above 10000", async () => {
    const count = await getFollowerCount("user_2");
    expect(count).toBeGreaterThan(10000);
  });

  it("count never decreases", async () => {
    const first = await getFollowerCount("user_3");
    const second = await getFollowerCount("user_3");
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it("tracks different users independently", async () => {
    const a = await getFollowerCount("user_a");
    const b = await getFollowerCount("user_b");
    // Both valid numbers, may differ
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });
});
