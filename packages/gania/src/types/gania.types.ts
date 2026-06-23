import { RequestMethod, ResponseDataType } from ".";

type RequestStrategy = "online-first" | "cache-first" | "auto";

export interface GaniaRequestInit extends RequestInit {
  strategy?: RequestStrategy;
  dataType?: ResponseDataType;
  method?: RequestMethod
}
export interface GaniaRequestConfig extends GaniaRequestInit {
  input: string | URL | Request;
  init?: GaniaRequestInit;
}

export interface GaniaDbSchema {
  responses: {
    key: string;
    value: {
      type: "response"
      data: unknown;
      timestamp: number;
      expiresAt?: number;
    };
  };

  mutations: {
    key: string;
    value: {
      type: "mutation"
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