import { GaniaCache } from "./cache/gania-cache";
import { CacheMissError } from "./error/apiError";
import { NetworkError } from "./error/networkError";
import { getResponseData } from "./response";
import {
  BaseUrl,
  CreateGaniaOptions,
  GaniaRequestConfig,
  GaniaRequestInit,
  GaniaResponse,
  RequestMethod,
} from "./types";

export function isURL(value: any): value is URL {
  return value instanceof URL;
}

export function isRequest(value: any): value is Request {
  return value instanceof Request;
}

export default class Gania {
  public baseUrl?: BaseUrl;
  /**
   * The *`gdb`* is the indexedDB abstracted storage for the Gania data
   */
  private readonly gdb: GaniaCache;
  constructor(options?: CreateGaniaOptions) {
    this.gdb = new GaniaCache();
    this.baseUrl = options?.baseUrl;
  }
  get online() {
    return navigator.onLine;
  }
  #getUrlString(input: string | URL | Request): string {
    if (typeof input === "string") return input;
    if (isURL(input)) return input.href;
    return input.url;
  }
  #normalizeMethod(method: RequestMethod) {
    return method.trim().toUpperCase() as RequestMethod;
  }
  #prepareInput(input: string | URL | Request): string | URL | Request {
    if (!this.baseUrl) {
      return input;
    }

    if (typeof input === "string") {
      return new URL(input, this.baseUrl);
    }

    if (isURL(input)) {
      return input;
    }

    if (isRequest(input)) {
      return input;
    }

    return input;
  }
  async request<T = unknown>({
    method,
    input,
    ...init
  }: GaniaRequestConfig): Promise<GaniaResponse<T>> {
    const reqMethod: RequestMethod = method
      ? this.#normalizeMethod(method)
      : "GET";
    const finalInput = this.#prepareInput(input);
    const cacheKey = this.createCacheKey(reqMethod, finalInput);
    if (!this.online) {
      if (reqMethod === "GET") {
        const dbres = await this.gdb.get<"responses", T>("responses", cacheKey);

        if (!dbres) throw new CacheMissError();
        const { data } = dbres;

        return {
          dataType: "flexible",
          status: 200,
          statusText: "OK",
          ok: true,
          data,
        } as GaniaResponse<T>;
      }

      const success = await this.gdb.set(
        "mutations",cacheKey,
        {
          type: "mutation",
          method: reqMethod,
          url: this.#getUrlString(finalInput),
          body: init.body ?? null,
          timestamp: Date.now(),
        },
      );

      return {
        status: success ? 200 : 500,
        statusText: success ? "OK" : "FAIL",
        queued: true,
        ok: false,
      } as GaniaResponse<T>;
    }

   try {
     const response = await fetch(finalInput, {
       ...init,
       method: reqMethod,
     });
     const { data, dataType } = await getResponseData<T>(
       response,
       init.dataType ?? "flexible",
     );
     let cached = false;
     if (reqMethod === "GET") {
       cached = await this.gdb.set("responses", cacheKey, {
         type: "response",
         data,
         timestamp: Date.now(),
       });
     }
     return {
       data,
       dataType,
       cached,
       ok: response.ok,
       status: response.status,
       statusText: response.statusText,
       headers: response.headers,
     };
   } catch (error) {
  throw new NetworkError(
    error instanceof Error
      ? error.message
      : "Network request failed."
  );

   }
  }
  createCacheKey(method: RequestMethod, input: string | URL | Request): string {
    const normalizedMethod = this.#normalizeMethod(method);
    let urlString = this.#getUrlString(input);

    return `${normalizedMethod}:${urlString}`;
  }

  async get<T = any>(input: string | Request | URL, init?: GaniaRequestInit) {
    return this.request<T>({ method: "GET", input, ...init });
  }
  async post<T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ) {
    return this.request<T>({
      input,
      method: "POST",
      body,
      ...init,
    });
  }
  async put<T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ) {
    return this.request<T>({
      input,
      method: "PUT",
      body,
      ...init,
    });
  }
  async patch<T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ) {
    return this.request<T>({
      input,
      method: "PATCH",
      body,
      ...init,
    });
  }
  async delete<T = unknown>(
    input: string | URL | Request,
    init?: GaniaRequestInit,
  ) {
    return this.request<T>({
      input,
      method: "DELETE",
      ...init,
    });
  }
}