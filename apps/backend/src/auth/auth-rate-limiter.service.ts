import { Injectable } from '@nestjs/common';

type BucketState = {
  hits: number[];
};

@Injectable()
export class AuthRateLimiterService {
  private readonly buckets = new Map<string, BucketState>();

  hit(key: string, limit: number, windowSec: number): {
    allowed: boolean;
    retryAfterSec: number;
  } {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const minAllowedTs = now - windowMs;

    const state = this.buckets.get(key) ?? { hits: [] };
    state.hits = state.hits.filter((timestamp) => timestamp > minAllowedTs);

    if (state.hits.length >= limit) {
      const oldestHit = state.hits[0];
      const retryAfterMs = oldestHit + windowMs - now;
      this.buckets.set(key, state);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    state.hits.push(now);
    this.buckets.set(key, state);
    return {
      allowed: true,
      retryAfterSec: 0,
    };
  }
}
