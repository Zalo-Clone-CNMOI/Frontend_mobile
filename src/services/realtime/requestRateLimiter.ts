type BucketName = "get" | "mutation";

const RATE_LIMITS: Record<BucketName, { limit: number; windowMs: number }> = {
  get: { limit: 20, windowMs: 60_000 },
  mutation: { limit: 10, windowMs: 60_000 },
};

export class RequestRateLimitError extends Error {
  constructor(
    message: string,
    readonly bucket: BucketName,
    readonly retryAfterMs: number,
  ) {
    super(message);
    this.name = "RequestRateLimitError";
  }
}

export class RequestRateLimiter {
  private readonly timestamps = new Map<BucketName, number[]>();

  consume(bucket: BucketName) {
    const now = Date.now();
    const policy = RATE_LIMITS[bucket];
    const windowStart = now - policy.windowMs;
    const entries = (this.timestamps.get(bucket) || []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (entries.length >= policy.limit) {
      const oldest = entries[0];
      const retryAfterMs = Math.max(policy.windowMs - (now - oldest), 0);
      throw new RequestRateLimitError(
        `Rate limit exceeded for ${bucket} requests. Retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
        bucket,
        retryAfterMs,
      );
    }

    entries.push(now);
    this.timestamps.set(bucket, entries);
  }
}

export const defaultRequestRateLimiter = new RequestRateLimiter();
