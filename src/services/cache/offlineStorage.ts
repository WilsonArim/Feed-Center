import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Link } from '@/services/linksService';

interface FeedCenterDB extends DBSchema {
    financial_offline: {
        key: string;
        value: {
            id: string;
            amount: number;
            description: string;
            category: string;
            date: string;
            synced: number; // 0 or 1
            updated_at: string;
        };
        indexes: { 'by-date': string; 'by-synced': string };
    };
    links_offline: {
        key: string;
        value: Link & { synced: number };
        indexes: { 'by-created': string; 'by-synced': string; 'by-pinned': string };
    };
    settings: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'FeedCenterDB';
const DB_VERSION = 2; // Bumped for links_offline

class OfflineStorageService {
    private dbPromise: Promise<IDBPDatabase<FeedCenterDB>>;

    constructor() {
        this.dbPromise = openDB<FeedCenterDB>(DB_NAME, DB_VERSION, {
            upgrade(db, _oldVersion, _newVersion, _transaction) {
                // v1: Financial Store
                if (!db.objectStoreNames.contains('financial_offline')) {
                    const store = db.createObjectStore('financial_offline', { keyPath: 'id' });
                    store.createIndex('by-date', 'date');
                    store.createIndex('by-synced', 'synced');
                }

                // v1: Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }

                // v2: Links Store
                if (!db.objectStoreNames.contains('links_offline')) {
                    const linkStore = db.createObjectStore('links_offline', { keyPath: 'id' });
                    linkStore.createIndex('by-created', 'created_at');
                    linkStore.createIndex('by-synced', 'synced');
                    linkStore.createIndex('by-pinned', 'pinned');
                }
            },
        });
    }

    // --- Financial ---
    async addFinancialEntry(entry: any) {
        const db = await this.dbPromise;
        return db.put('financial_offline', { ...entry, synced: 0, updated_at: new Date().toISOString() });
    }

    async getFinancialEntries() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('financial_offline', 'by-date');
    }

    async getPendingFinancialSync() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('financial_offline', 'by-synced', IDBKeyRange.only(0));
    }

    async markFinancialSynced(id: string) {
        const db = await this.dbPromise;
        const tx = db.transaction('financial_offline', 'readwrite');
        const store = tx.objectStore('financial_offline');
        const entry = await store.get(id);
        if (entry) {
            entry.synced = 1;
            await store.put(entry);
        }
        await tx.done;
    }

    // --- Links ---
    async saveLinks(links: Link[]) {
        const db = await this.dbPromise;
        const tx = db.transaction('links_offline', 'readwrite');
        const store = tx.objectStore('links_offline');
        await Promise.all(links.map(link => store.put({ ...link, synced: 1 })));
        await tx.done;
    }

    async addOfflineLink(link: Link) {
        const db = await this.dbPromise;
        return db.put('links_offline', { ...link, synced: 0 });
    }

    async getLinks() {
        const db = await this.dbPromise;
        // Combine synced and unsynced? Or just get all.
        // For simple list, getAll is fine.
        return db.getAllFromIndex('links_offline', 'by-created');
    }

    async getPendingLinksSync() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('links_offline', 'by-synced', IDBKeyRange.only(0));
    }
}

export const offlineStorage = new OfflineStorageService();

