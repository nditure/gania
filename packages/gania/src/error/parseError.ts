import { GaniaError } from "./GaniaError";

export class ParseError extends GaniaError {
  constructor(message = "Failed to parse JSON response.") {
    super({
      message,
      code: "JSON_PARSE_ERROR",
    });
  }
}
