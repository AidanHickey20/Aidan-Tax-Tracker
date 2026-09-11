import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit, then blocks", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(false);
  });

  it("reports decreasing remaining count", () => {
    const opts = { limit: 5, windowMs: 1000 };
    expect(rateLimit("b", opts).remaining).toBe(4);
    expect(rateLimit("b", opts).remaining).toBe(3);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("c", opts).ok).toBe(true);
    expect(rateLimit("c", opts).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("c", opts).ok).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("user:1", opts).ok).toBe(true);
    expect(rateLimit("user:2", opts).ok).toBe(true);
    expect(rateLimit("user:1", opts).ok).toBe(false);
  });
});
