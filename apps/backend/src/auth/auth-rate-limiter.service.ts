import { Injectable } from '@nestjs/common';

type BucketState = {
  hits: number[];
};

/**
 * Простой in-memory rate limiter для auth-сценариев.
 *
 * Хранит timestamps успешных попыток по ключу (`register:email:...`,
 * `verify:ip:...` и т.п.) и считает лимит в скользящем окне.
 *
 * Важно: состояние живет только в памяти процесса NestJS. Для нескольких
 * инстансов backend или production-нагрузки этот сервис нужно заменить на
 * Redis/БД-backed limiter.
 */
@Injectable()
export class AuthRateLimiterService {
  private readonly buckets = new Map<string, BucketState>();

  /**
   * Регистрирует новую попытку по ключу и возвращает, можно ли продолжать.
   *
   * @param key Уникальный ключ лимита (например, `register:email:user@example.com`).
   * @param limit Максимальное количество попыток в пределах окна.
   * @param windowSec Размер скользящего окна в секундах.
   * @returns `allowed=true`, если попытка разрешена; иначе `retryAfterSec`
   *          показывает, через сколько секунд можно повторить запрос.
   */
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
