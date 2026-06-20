import { GaniaCache } from "./cache/gania-cache";
import { getResponseData } from "./response";
import {
  BaseUrl,
  CreateGaniaOptions,
  GaniaDbSchema,
  GaniaRequestConfig,
  GaniaRequestInit,
  GaniaResponse,
} from "./types";

export default class Gania {
  readonly online: boolean;
  public baseUrl?: BaseUrl;
  /**
   * The *`gdb`* is the indexedDB abstracted storage for the Gania data
   */
  private readonly gdb: GaniaCache<GaniaDbSchema>;
  constructor(options?: CreateGaniaOptions) {
    this.online = navigator.onLine;
    this.gdb = new GaniaCache<GaniaDbSchema>("ganiadb");
    this.baseUrl = options?.baseUrl;
  }
  async request<T = unknown>({
    method,
    input,
    ...init
  }: GaniaRequestConfig): Promise<GaniaResponse<T>> {
    if (!this.online) {
      if (method === "GET") {
        const cached = await this.gdb.get(
          "responses",
          this.createCacheKey(method, input),
        );

        return {
          data: cached?.data as T,
        } as GaniaResponse<T>;
      }

      await this.gdb.set("mutations", this.createCacheKey(method!, input), {
        method: method!,
        url: String(input),
        body: init.body,
        timestamp: Date.now(),
      });

      return {
        queued: true,
      } as GaniaResponse<T>;
    }
    if (typeof input === "string") input = `${this.baseUrl || ""}${input}`;
    else input;
    const response = await fetch(input, {
      ...init,
      method,
    });
    const { data, dataType } = await getResponseData<T>(
      response,
      init.dataType ?? "flexible",
    );
    if (method === "GET") {
      await this.gdb.set("responses", this.createCacheKey(method, input), {
        data,
        timestamp: Date.now(),
      });
    }
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      ok: response.ok,
      dataType,
    };
  }
  createCacheKey(method: string, input: string | URL | Request): string {
    return `${method.trim().toUpperCase()}:${String(input)}`;
  }
  async get<T = any>(input: (string | Request) | URL, init?: GaniaRequestInit) {
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
