import path from "path";
import qs from "query-string";
import fs from "fs";
import postcss from "postcss";
import colorConverter from "postcss-color-converter";
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
  new RegExp("import.*@pathscale/bulma-pull").test(code) &&
  new RegExp("import.*@pathscale/bulma-extensions").test(code);

/** The imports are nuked and replaced with an import for a fake file that will be dynamically created by the plugin */
export const injectFakeBundle = (code: string): string => {
  let newJs = code;
  newJs = newJs.replace(/import.*@pathscale\/bulma-pull.*/gi, "");
  newJs = newJs.replace(/import.*user.css.*/gi, "");
  newJs = newJs.replace(/import.*@pathscale\/bulma-extensions.*/gi, "");
  newJs = `import './vue3-ui-bundle.css'; ${newJs}`;
  return newJs;
};

export const makeVue3UiBundle = (id: string): string => {
  let bulmaCss = "";
  let extensionsCss = "";
  let override = "";

  try {
    bulmaCss = fs.readFileSync(
      "node_modules/@pathscale/bulma-pull-2981-css-var-only/css/bulma.css",
      "utf-8",
    );
    extensionsCss = fs.readFileSync(
      "node_modules/@pathscale/bulma-extensions-css-var/css/bulma-extensions-css-var.css",
      "utf-8",
    );
  } catch (error) {
    console.log("there was an error reading vue3-ui recomended style packages", error);
  }

  try {
    override = fs.readFileSync(`${path.dirname(id)}/user.css`, "utf-8");
    console.log(`vue3-ui purger will process ${path.dirname(id)}/user.css`);

    // maps any color declaration to --xxx: hsl(a, b, c)
    override = postcss(colorConverter({ outputColorFormat: "hsl" })).process(override).css;

    // nuke comments
    override = override.replace(/\/\*[^*]*\*+([^*/][^*]*\*+)*\//gi, "");

    // map hsl(a, b, c) into for variable declarations, each with postfix -h -s -l -a
    override = override.replace(
      /--(.*):\shsl\((\d*),\s*(\d*)%,\s*(\d*)%\);?/gi,
      (_: string, name: string, h: string, s: string, l: string) => {
        return `
        ${_.endsWith(";") ? _ : _.slice(0, -1)}
        --${name}-h: ${h};
        --${name}-s: ${s}%;
        --${name}-l: ${l}%;
        --${name}-a: 1;`;
      },
    );

    // console.log("user.css was transformed into", override)
  } catch (error) {
    console.log(error);
  }

  const variablesOverwritten = override.match(/(?<=--)(.*?)(?=:)/g) ?? [];

  // replaces on bulmaCss the definition of the variables swaping line for line
  variablesOverwritten.forEach(v => {
    const declaration = new RegExp(`.*${v}:.*`);
    // !declaration.exec(bulmaCss) &&
    //   console.log(`${v} was not overwritten because it does not exist in bulmaCss`);
    bulmaCss = bulmaCss.replace(declaration, declaration.exec(override)?.[0] ?? "");
  });

  // bulmaCss = bulmaCss.replace(/:root.*{/g, `:root { ${override}`)
  return bulmaCss + extensionsCss;
};

export const camelCaseUp = (s: string): string => {
  const str = s.toLowerCase().replace(/-(.)/g, (_, $1: string) => $1.toUpperCase());
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelCaseDown = (s: string): string => {
  const str = s.toLowerCase().replace(/-(.)/g, (_, $1: string) => $1.toUpperCase());
  return str.charAt(0).toLowerCase() + str.slice(1);
};
