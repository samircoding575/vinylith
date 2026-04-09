import { TRPCError } from "@trpc/server";

/**
 * Simple in-memory fixed-window rate limiter.
 *
 * For production behind multiple serverless instances, swap this for
 * Upstash Redis (`@upstash/ratelimit`) — same interface.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodic cleanup to prevent unbounded memory growth
if (typeof globalThis !== "undefined") {
  const g = globalThis as { __rlCleanup?: NodeJS.Timeout };
  if (!g.__rlCleanup) {
    g.__rlCleanup = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
      }
    }, 60_000);
  }
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: opts.limit - bucket.count };
}

export function enforceRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
) {
  const res = rateLimit(key, opts);
  if (!res.ok) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Try again in ${Math.ceil(
        (res.retryAfterMs ?? 0) / 1000
      )}s.`,
    });
  }
}

export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "anon";
}
