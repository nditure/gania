import { GaniaError, GaniaErrorCode } from "./GaniaError";

export class NetworkError extends GaniaError {
  constructor(message: string, code: GaniaErrorCode = "NETWORK_ERROR") {
    super({
      message,
      code,
    });
  }
}

export class TimeoutError extends NetworkError {
  constructor(message = "Request timed out.") {
    super(message, "TIMEOUT");
  }
}

export class OfflineError extends NetworkError {
  constructor(message = "Device is offline.") {
    super(message, "OFFLINE");
  }
}
