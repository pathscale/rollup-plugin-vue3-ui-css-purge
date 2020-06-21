import qs from "querystring";
import { Query } from "./types";

export function parseQuery(id: string): Query {
  const [filename, query] = id.split("?", 2);
  if (!query) return { vue: false };

  const raw = qs.parse(query);
  if (!("vue" in raw)) return { vue: false };

  return {
    ...raw,
    filename,
    vue: true,
    index: raw.index && Number(raw.index),
    src: "src" in raw,
    scoped: "scoped" in raw,
  } as Query;
}
