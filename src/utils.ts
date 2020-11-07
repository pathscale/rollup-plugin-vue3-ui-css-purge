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

export const includesMagicStrings = (code: string): boolean =>
  code.includes("import '@pathscale/bulma-pull-2981-css-var-only'") &&
  code.includes("import '@pathscale/bulma-extensions-css-var'");

export const replaceImportsWithBundle = (code: string): string => {
  let newJs = code.replace("import '@pathscale/bulma-pull-2981-css-var-only'", "");
  newJs = newJs.replace(
    "import '@pathscale/bulma-extensions-css-var'",
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

export const camelCase = (input: string): string => {
  const str = input.toLowerCase().replace(/-(.)/g, function (_, group1: string) {
    return group1.toUpperCase();
  });

  return str.charAt(0).toUpperCase() + str.slice(1);
};
