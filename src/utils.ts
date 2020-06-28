import qs from "query-string";
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

export const kebablize = (s: string): string =>
  s.replace(/^(.)/, str => str.toLowerCase()).replace(/([A-Z])/g, str => `-${str.toLowerCase()}`);

export const camelize = (s: string): string =>
  s
    .replace(/^(.)/, str => str.toLowerCase())
    .replace(/-([a-z])/g, str => str.toUpperCase().slice(1));

export const pascalize = (s: string): string =>
  s
    .replace(/^(.)/, str => str.toUpperCase())
    .replace(/-([a-z])/g, str => str.toUpperCase().slice(1));
