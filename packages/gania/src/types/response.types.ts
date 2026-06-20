import { CreateGaniaOptions, GaniaRequestConfig, GaniaRequestInit } from ".";

export type ResponseDataType = "text" | "blob" | "bytes" | "json" | "flexible";

export interface GaniaResponse<T = any> {
  data: T;
  dataType: ResponseDataType;
  queued?: boolean;
  headers: Response["headers"];
  status: Response["status"];
  statusText: Response["statusText"];
  ok: Response["ok"];
}

export interface GaniaInstance {
  <T = unknown>(config: GaniaRequestConfig): Promise<GaniaResponse<T>>;
  create(options?: CreateGaniaOptions): GaniaInstance;
  request: <T = unknown>(
    config: GaniaRequestConfig,
  ) => Promise<GaniaResponse<T>>;
  put: <T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ) => Promise<GaniaResponse<T>>;
  patch: <T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ) => Promise<GaniaResponse<T>>;
  delete: <T = unknown>(
    input: string | URL | Request,
    init?: GaniaRequestInit,
  ) => Promise<GaniaResponse<T>>;
  get<T = unknown>(
    input: string | URL | Request,
    init?: GaniaRequestInit,
  ): Promise<GaniaResponse<T>>;
  post<T = unknown>(
    input: string | URL | Request,
    body?: BodyInit,
    init?: GaniaRequestInit,
  ): Promise<GaniaResponse<T>>;
}