import { GaniaResponse } from "../types";

export type GaniaErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "OFFLINE"
  | "CACHE_MISS"
  | "STORE_NOT_INITIALIZED"
  | "JSON_PARSE_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

export interface BaseGaniaErrorOptions<T = any> {
  message: string;
  code: GaniaErrorCode;
  response?: GaniaResponse<T>;
  cause?: unknown;
}

export abstract class GaniaError<T=any> extends Error {
  public readonly code: GaniaErrorCode;
  public readonly response?: GaniaResponse<T>;
  public readonly cause?: unknown;

  protected constructor({
    message,
    code,
    response,
    cause,
  }: BaseGaniaErrorOptions<T>) {
    super(message);

    this.name = new.target.name;
    this.code = code;
    this.response = response;
    this.cause = cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  get statusCode () {
    return this.response?.status
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}
