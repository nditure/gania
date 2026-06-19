import { GaniaCache } from "./cache/gania-cache";
import { GaniaResponse, getResponseData, ResponseDataType } from "./response";

type RequestStrategy = "online-first" | "cache-first" | "auto";

interface GaniaRequestInit extends RequestInit {
  strategy?: RequestStrategy;
  dataType?: ResponseDataType;
}

export default class Gania {
  readonly online: boolean;
  public cache: GaniaCache
  constructor() {
    this.online = navigator.onLine;
    this.cache = new GaniaCache("ganiadb")
  }
  async get<T = any>(
    input: (string | Request) | URL,
    payload?: RequestInit["body"],
    init?: GaniaRequestInit,
  ) {
    if (!this.online) {
      return this.cache. as GaniaResponse<T>;
    } else {
      const response = await fetch(input, {
        ...init,
        body: payload,
        method: "GET",
      });
      const { data, dataType } = await getResponseData<T>(
        response,
        init?.dataType || "flexible",
      );
      const { status, statusText, headers, ok } = response;
      return {
        data,
        status,
        statusText,
        headers,
        ok,
        dataType,
      } as GaniaResponse<T>;
    }
  }
  async post<T = any>(
    input: (string | Request) | URL,
    init?: GaniaRequestInit,
  ) {
    if (!this.online) {
      return {} as GaniaResponse<T>;
    } else {
      const response = await fetch(input, { ...init, method: "POST" });
      const data = await response.json();
      return { data } as GaniaResponse<T>;
    }
  }
  async put<T = any>(input: (string | Request) | URL, init?: GaniaRequestInit) {
    if (!this.online) {
      return {} as GaniaResponse<T>;
    } else {
      const response = await fetch(input, { ...init, method: "PUT" });
      const data = await response.json();
      return { data } as GaniaResponse<T>;
    }
  }
  async delete<T = any>(
    input: (string | Request) | URL,
    init?: GaniaRequestInit,
  ) {
    if (!this.online) {
      return {} as GaniaResponse<T>;
    } else {
      const response = await fetch(input, { ...init, method: "DELETE" });
      const data = await response.json();
      return { data } as GaniaResponse<T>;
    }
  }
  async patch<T = any>(
    input: (string | Request) | URL,
    init?: GaniaRequestInit,
  ) {
    if (!this.online) {
      return {} as GaniaResponse<T>;
    } else {
      const response = await fetch(input, { ...init, method: "PATCH" });
      const data = await response.json();
      return { data } as GaniaResponse<T>;
    }
  }
}
