type RateLimitStore = Map<string, { count: number; expiresAt: number }>;

const store: RateLimitStore = new Map();

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export function rateLimit(ip: string, options: RateLimitOptions = {}) {
  const limit = options.limit || 30; // 30 requests
  const windowMs = options.windowMs || 60 * 1000; // per 1 minute
  const now = Date.now();

  const record = store.get(ip);

  if (!record || now > record.expiresAt) {
    store.set(ip, { count: 1, expiresAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}
