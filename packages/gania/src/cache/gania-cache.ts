import { GaniaDbSchema } from "../types";

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

export class GaniaCache {
  private db: IDBDatabase | null = null;
  private readonly storeNames = [
    "responses",
    "mutations",
  ] as const satisfies (keyof GaniaDbSchema)[];

  private readonly DB_NAME = "ganiadb";
  private readonly VERSION = 1;

  private readonly ramCache = new Map<
    keyof GaniaDbSchema,
    Map<unknown, unknown>
  >();

  private readonly hydratedStores = new Set<keyof GaniaDbSchema>();

  private readonly activeHydrations = new Map<
    keyof GaniaDbSchema,
    Promise<void>
  >();

  private channel: BroadcastChannel | null = null;

  private readonly ready: Promise<this>;

  constructor() {
    this.ready = this.#init();
  }

  private getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error("GaniaCache has not been initialized.");
    }

    return this.db;
  }

  private getStoreMap<K extends keyof GaniaDbSchema>(
    store: K,
  ): Map<GaniaDbSchema[K]["key"], GaniaDbSchema[K]["value"]> {
    const map = this.ramCache.get(store);

    if (!map) {
      throw new Error(`Store "${String(store)}" is not initialized.`);
    }

    return map as Map<GaniaDbSchema[K]["key"], GaniaDbSchema[K]["value"]>;
  }

  async #init(): Promise<this> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        for (const storeName of this.storeNames) {
          if (!db.objectStoreNames.contains(storeName as string)) {
            db.createObjectStore(storeName as string);
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;

        for (const storeName of this.storeNames) {
          this.ramCache.set(storeName, new Map());
        }

        this.channel = new BroadcastChannel(`gania-cache:${this.DB_NAME}`);

        this.channel.onmessage = (event) => this.handleBroadcast(event.data);

        resolve(this);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private handleBroadcast(event: CacheEvent) {
    const storeMap = this.ramCache.get(event.store as keyof GaniaDbSchema);

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
  private async performHydration<K extends keyof GaniaDbSchema>(
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
        key as GaniaDbSchema[K]["key"],
        values[index] as GaniaDbSchema[K]["value"],
      );
    });

    this.hydratedStores.add(store);
  }
  private async hydrateStore<K extends keyof GaniaDbSchema>(
    store: K,
  ): Promise<void> {
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

  async get<K extends keyof GaniaDbSchema>(
    store: K,
    key: GaniaDbSchema[K]["key"],
  ): Promise<GaniaDbSchema[K]["value"] | null> {
    await this.ready;
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

        resolve(value as GaniaDbSchema[K]["value"] | null);
      };

      request.onerror = () => resolve(null);
    });
  }

  async set<K extends keyof GaniaDbSchema>(
    store: K,
    key: GaniaDbSchema[K]["key"],
    value: GaniaDbSchema[K]["value"],
  ): Promise<void> {
    await this.ready;
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

  async delete<K extends keyof GaniaDbSchema>(
    store: K,
    key: GaniaDbSchema[K]["key"],
  ): Promise<void> {
    await this.ready;
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

  async clear<K extends keyof GaniaDbSchema>(store: K): Promise<void> {
    await this.ready;
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

  async keys<K extends keyof GaniaDbSchema>(
    store: K,
  ): Promise<GaniaDbSchema[K]["key"][]> {
    await this.ready;
    await this.hydrateStore(store);

    return Array.from(this.getStoreMap(store).keys());
  }

  async entries<K extends keyof GaniaDbSchema>(
    store: K,
  ): Promise<[GaniaDbSchema[K]["key"], GaniaDbSchema[K]["value"]][]> {
    await this.ready;
    await this.hydrateStore(store);

    return Array.from(this.getStoreMap(store).entries());
  }

  async destroy() {
    this.channel?.close();
    this.db?.close();

    this.channel = null;
    this.db = null;
  }
}
