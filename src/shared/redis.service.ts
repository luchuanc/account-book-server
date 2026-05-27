import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly memory = new Map<string, string>();
  private client: Redis | null = null;

  constructor() {
    const host = process.env.REDIS_HOST;
    if (!host) {
      this.logger.warn('REDIS_HOST is not configured, using in-process token cache');
      return;
    }

    this.client = new Redis({
      host,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.client.connect().catch((error) => {
      this.logger.warn(`Redis unavailable, using in-process token cache: ${String(error)}`);
      this.client = null;
    });
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (!this.client) {
      this.memory.set(key, value);
      return;
    }
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async get(key: string) {
    if (!this.client) {
      return this.memory.get(key) ?? null;
    }
    return this.client.get(key);
  }

  async del(key: string) {
    if (!this.client) {
      this.memory.delete(key);
      return;
    }
    await this.client.del(key);
  }
}
