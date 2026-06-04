const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function getIdempotencyKey(headers: Headers) {
  const value = headers.get("Idempotency-Key");

  return value?.trim() || null;
}

export function getRequestIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(identifier: string) {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count,
    resetAt: bucket.resetAt,
  };
}
