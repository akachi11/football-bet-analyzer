interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

export class RequestBudget {
  private count = 0;
  private resetDate = "";

  constructor(private readonly dailyLimit: number) {
    this.reset();
  }

  private reset(): void {
    const today = new Date().toISOString().split("T")[0];
    if (this.resetDate !== today) {
      this.count = 0;
      this.resetDate = today;
    }
  }

  check(): { allowed: boolean; remaining: number } {
    this.reset();
    return {
      allowed: this.count < this.dailyLimit,
      remaining: this.dailyLimit - this.count,
    };
  }

  consume(): void {
    this.reset();
    this.count++;
  }
}
