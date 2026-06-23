export type RequestMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "CONNECT"
  | "TRACE"
  // WebDAV Extensions
  | "COPY"
  | "LOCK"
  | "MKCOL"
  | "MOVE"
  | "PROPFIND"
  | "PROPPATCH"
  | "UNLOCK"
  | "REPORT";
