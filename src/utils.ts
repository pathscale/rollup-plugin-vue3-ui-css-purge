import path from "path";
import qs from "query-string";
import { Query } from "./types";
import fs from "fs";

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

export function normalizePath(...paths: string[]): string {
  const f = path.join(...paths).replace(/\\/g, "/");
  if (/^\.[/\\]/.test(paths[0])) return `./${f}`;
  return f;
}

export const relativePath = (from: string, to: string): string =>
  normalizePath(path.relative(from, to));

export const humanlizePath = (file: string): string => relativePath(process.cwd(), file);

/** Every project is expected to have a main file which imports both vue3-ui css packages */
export const isMain = (code: string): boolean =>
  new RegExp("^import.*@pathscale/bulma-pull").test(code) &&
  new RegExp("^import.*@pathscale/bulma-extensions").test(code);

/** The imports are nuked and replaced with an import for a fake file that will be dynamically created by the plugin */
export const injectFakeBundle = (code: string): string => {
  let newJs = code;
  newJs = newJs.replace(/^import.*@pathscale\/bulma-pull.*/gi, "");
  newJs = newJs.replace(/^import.*user.css.*/gi, "");
  newJs = newJs.replace(
    /^import.*@pathscale\/bulma-extensions.*/gi,
    "import './vue3-ui-bundle.css'",
  );
  return newJs;
};

export const makeVue3UiBundle = (): string => {
  return (
    fs.readFileSync(
      "./node_modules/@pathscale/bulma-pull-2981-css-var-only/css/bulma.css",
      "utf-8",
    ) +
    fs.readFileSync(
      "node_modules/@pathscale/bulma-extensions-css-var/css/bulma-extensions-css-var.css",
      "utf-8",
    )
  );
};

export const camelCaseUp = (input: string): string => {
  const str = input.toLowerCase().replace(/-(.)/g, function (_, group1: string) {
    return group1.toUpperCase();
  });

  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelCaseDown = (input: string): string => {
  const str = input.toLowerCase().replace(/-(.)/g, function (_, group1: string) {
    return group1.toUpperCase();
  });

  return str.charAt(0).toLocaleLowerCase() + str.slice(1);
};
