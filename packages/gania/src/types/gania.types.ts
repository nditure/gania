import { ResponseDataType } from ".";

type RequestStrategy = "online-first" | "cache-first" | "auto";

export interface GaniaRequestInit extends RequestInit {
  strategy?: RequestStrategy;
  dataType?: ResponseDataType;
}
export interface GaniaRequestConfig extends GaniaRequestInit {
  input: string | URL | Request;
  init?: GaniaRequestInit;
}

export interface GaniaDbSchema {
  responses: {
    key: string;
    value: {
      data: unknown;
      timestamp: number;
      expiresAt?: number;
    };
  };

  mutations: {
    key: string;
    value: {
      method: string;
      url: string;
      body: unknown;
      timestamp: number;
    };
  };
}

export type BaseUrl = `/${string}` | `http://${string}` | `https://${string}`;
export interface CreateGaniaOptions {
  baseUrl?: BaseUrl;
}