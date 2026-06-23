import { GaniaResponse } from "..";
import { GaniaError, GaniaErrorCode } from "./GaniaError";

export class NotFoundError<T = unknown> extends GaniaError<T> {
  constructor(response?: GaniaResponse<T>) {
    super({
      message: "Resource not found.",
      code: "NOT_FOUND",
      response,
    });
  }
}

export class CacheError<T = any> extends GaniaError<T> {
  constructor(message: string, code: GaniaErrorCode) {
    super({
      message,
      code,
    });
  }
}

export class CacheMissError extends CacheError {
  constructor(message = "No cached response found.") {
    super(message, "CACHE_MISS");
  }
}

export class StoreNotInitializedError extends CacheError {
  constructor(storeName?: string) {
    super(
      storeName
        ? `Store "${storeName}" is not initialized.`
        : "Store is not initialized.",
      "STORE_NOT_INITIALIZED",
    );
  }
}
