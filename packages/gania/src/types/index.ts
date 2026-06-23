
export type Simplify<T> = { [K in keyof T]: T[K] } & {};
export * from "./gania.types"
export * from "./response.types"
export * from "./request.types"