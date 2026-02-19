export interface CacheAdapter {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export class MemoryCacheAdapter implements CacheAdapter {
    private cache = new Map<string, { value: any; expiry: number }>();

    async get<T>(key: string): Promise<T | null> {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttlSeconds * 1000
        });
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}

// Placeholder for future Redis adapter (requires backend)
export class RedisCacheStubAdapter implements CacheAdapter {
    async get<T>(_key: string): Promise<T | null> {
        console.warn('Redis adapter not implemented. Using Null.');
        return null;
    }
    async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
        console.warn('Redis adapter not implemented.');
    }
    async delete(_key: string): Promise<void> { }
    async clear(): Promise<void> { }
}

export const cacheService = new MemoryCacheAdapter();
// In production, we could swap this based on environment
// e.g. export const cacheService = import.meta.env.VITE_USE_REDIS ? new RedisCacheStubAdapter() : new MemoryCacheAdapter();
