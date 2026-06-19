export interface CacheSchema {
  [storeName: string]: {
    key: unknown;
    value: unknown;
  };
}

type CacheEvent =
  | {
      type: "set";
      store: string;
      key: IDBValidKey;
      value: unknown;
    }
  | {
      type: "delete";
      store: string;
      key: IDBValidKey;
    }
  | {
      type: "clear";
      store: string;
    };

export class GaniaCache<Schema extends CacheSchema> {
  private db: IDBDatabase | null = null;

  private readonly ramCache = new Map<keyof Schema, Map<unknown, unknown>>();

  private readonly hydratedStores = new Set<keyof Schema>();

  private readonly activeHydrations = new Map<keyof Schema, Promise<void>>();

  private channel: BroadcastChannel | null = null;

  constructor(
    private readonly dbName: string,
    private readonly version = 1,
  ) {}

  private getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error("GaniaCache has not been initialized.");
    }

    return this.db;
  }

  private getStoreMap<K extends keyof Schema>(
    store: K,
  ): Map<Schema[K]["key"], Schema[K]["value"]> {
    const map = this.ramCache.get(store);

    if (!map) {
      throw new Error(`Store "${String(store)}" is not initialized.`);
    }

    return map as Map<Schema[K]["key"], Schema[K]["value"]>;
  }

  async init(storeNames: (keyof Schema & string)[]): Promise<this> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;

        for (const storeName of storeNames) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;

        for (const storeName of storeNames) {
          this.ramCache.set(storeName, new Map());
        }

        this.channel = new BroadcastChannel(`gania-cache:${this.dbName}`);

        this.channel.onmessage = (event) => this.handleBroadcast(event.data);

        resolve(this);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private handleBroadcast(event: CacheEvent) {
    const storeMap = this.ramCache.get(event.store as keyof Schema);

    if (!storeMap) return;

    switch (event.type) {
      case "set":
        storeMap.set(event.key, event.value);
        break;

      case "delete":
        storeMap.delete(event.key);
        break;

      case "clear":
        storeMap.clear();
        break;
    }
  }

  private broadcast(event: CacheEvent) {
    this.channel?.postMessage(event);
  }
  private async performHydration<K extends keyof Schema>(
    store: K,
  ): Promise<void> {
    const db = this.getDatabase();

    const tx = db.transaction(store as string, "readonly");

    const objectStore = tx.objectStore(store as string);

    const [keys, values] = await Promise.all([
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const req = objectStore.getAllKeys();

        req.onsuccess = () => resolve(req.result as IDBValidKey[]);

        req.onerror = () => reject(req.error);
      }),

      new Promise<unknown[]>((resolve, reject) => {
        const req = objectStore.getAll();

        req.onsuccess = () => resolve(req.result);

        req.onerror = () => reject(req.error);
      }),
    ]);

    const storeMap = this.getStoreMap(store);

    keys.forEach((key, index) => {
      storeMap.set(
        key as Schema[K]["key"],
        values[index] as Schema[K]["value"],
      );
    });

    this.hydratedStores.add(store);
  }
  private async hydrateStore<K extends keyof Schema>(store: K): Promise<void> {
    // Already hydrated
    if (this.hydratedStores.has(store)) {
      return;
    }

    // Hydration currently in progress
    const activeHydration = this.activeHydrations.get(store);

    if (activeHydration) {
      return activeHydration;
    }

    const hydrationPromise = this.performHydration(store);

    this.activeHydrations.set(store, hydrationPromise);

    try {
      await hydrationPromise;
    } finally {
      this.activeHydrations.delete(store);
    }
  }

  async get<K extends keyof Schema>(
    store: K,
    key: Schema[K]["key"],
  ): Promise<Schema[K]["value"] | null> {
    const storeMap = this.getStoreMap(store);

    if (storeMap.has(key)) {
      return storeMap.get(key) ?? null;
    }

    const db = this.getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(store as string, "readonly");

      const request = tx.objectStore(store as string).get(key as IDBValidKey);

      request.onsuccess = () => {
        const value = request.result ?? null;

        if (value !== null) {
          storeMap.set(key, value);
        }

        resolve(value as Schema[K]["value"] | null);
      };

      request.onerror = () => resolve(null);
    });
  }

  async set<K extends keyof Schema>(
    store: K,
    key: Schema[K]["key"],
    value: Schema[K]["value"],
  ): Promise<void> {
    const storeMap = this.getStoreMap(store);

    storeMap.set(key, value);

    const db = this.getDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store as string, "readwrite");

      const request = tx
        .objectStore(store as string)
        .put(value, key as IDBValidKey);

      request.onsuccess = () => resolve();

      request.onerror = () => reject(request.error);
    });

    this.broadcast({
      type: "set",
      store: String(store),
      key: key as IDBValidKey,
      value,
    });
  }

  async delete<K extends keyof Schema>(
    store: K,
    key: Schema[K]["key"],
  ): Promise<void> {
    this.getStoreMap(store).delete(key);

    const db = this.getDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store as string, "readwrite");

      const request = tx
        .objectStore(store as string)
        .delete(key as IDBValidKey);

      request.onsuccess = () => resolve();

      request.onerror = () => reject(request.error);
    });

    this.broadcast({
      type: "delete",
      store: String(store),
      key: key as IDBValidKey,
    });
  }

  async clear<K extends keyof Schema>(store: K): Promise<void> {
    this.getStoreMap(store).clear();

    const db = this.getDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store as string, "readwrite");

      const request = tx.objectStore(store as string).clear();

      request.onsuccess = () => resolve();

      request.onerror = () => reject(request.error);
    });

    this.broadcast({
      type: "clear",
      store: String(store),
    });
  }

  async keys<K extends keyof Schema>(store: K): Promise<Schema[K]["key"][]> {
    await this.hydrateStore(store);

    return Array.from(this.getStoreMap(store).keys());
  }

  async entries<K extends keyof Schema>(
    store: K,
  ): Promise<[Schema[K]["key"], Schema[K]["value"]][]> {
    await this.hydrateStore(store);

    return Array.from(this.getStoreMap(store).entries());
  }

  destroy() {
    this.channel?.close();
    this.channel = null;
  }
}
