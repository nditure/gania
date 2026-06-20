import Gania from "./gania";
import { CreateGaniaOptions, GaniaInstance, GaniaRequestConfig } from "./types";

export function create(options?: CreateGaniaOptions): GaniaInstance {
  const context = new Gania(options);

  const instance = Object.assign(
    <T = unknown>(config: GaniaRequestConfig) => context.request<T>(config),

    {
      request: context.request.bind(context),
      get: context.get.bind(context),
      post: context.post.bind(context),
      put: context.put.bind(context),
      patch: context.patch.bind(context),
      delete: context.delete.bind(context),
      create,
    },
  ) as GaniaInstance;

  return instance;
}