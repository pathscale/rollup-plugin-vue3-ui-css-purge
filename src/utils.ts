import path from "path";
import qs from "query-string";
import fs from "fs-extra";
import postcss from "postcss";
import colorConverter from "postcss-color-converter";
import { Query } from "./types";
import resolveAsync, { AsyncOpts } from "resolve";

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

export const resolveId = async (id: string, options: AsyncOpts = {}): Promise<string | void> =>
  new Promise(resolve => resolveAsync(id, options, (err, res) => (err ? resolve() : resolve(res))));

/** Every project is expected to have a main file which imports both vue3-ui css packages */
export const isMain = (code: string): boolean =>
  new RegExp("import.*@bulvar/bulma/css/bulma.css").test(code) &&
  new RegExp("import.*@pathscale/bulma-extensions").test(code);

export const getDeclaredVariables = (code: string): string[] =>
  code.match(/(?<=--)(.*?)(?=:)/g) ?? [];

export const isVariableUsed = (v: string, code: string): boolean => code.includes(`var(--${v})`);

/** The imports are nuked and replaced with an import for a fake file that will be dynamically created by the plugin */
export const injectFakeBundle = (code: string): string =>
  `import './vue3-ui-bundle.css';
  ${code
    .replace(/import.*@bulvar\/bulma\/css\/bulma\.css.*/gi, "")
    .replace(/import.*@pathscale\/bulma-extensions.*/gi, "")
    .replace(/import.*user\.css.*/gi, "")}`;

export const makeVue3UiBundle = async (id: string): Promise<string> => {
  const bulmaCSSFile = await resolveId("@bulvar/bulma/css/bulma.css");
  if (!bulmaCSSFile) throw new Error("TRANSFORM - BULMA CSS NOT FOUND");

  const extensionsCSSFile = await resolveId("@pathscale/bulma-extensions-css-var");
  if (!extensionsCSSFile) throw new Error("TRANSFORM - EXTENSIONS CSS NOT FOUND");

  let bulmaCSS = await fs.readFile(bulmaCSSFile, "utf-8");
  const extensionsCSS = await fs.readFile(extensionsCSSFile, "utf-8");

  const userCSSFile = normalizePath(path.dirname(id), "user.css");
  if (!(await fs.pathExists(userCSSFile))) return bulmaCSS + extensionsCSS;

  let userCSS = await fs.readFile(userCSSFile, "utf-8");
  console.log(`TRANSFORM - USER CSS FOUND (${humanlizePath(userCSSFile)})`);

  // maps any color declaration to --xxx: hsl(a, b, c)
  userCSS = postcss(colorConverter({ outputColorFormat: "hsl" })).process(userCSS).css;

  // nuke comments
  userCSS = userCSS.replace(/\/\*[^*]*\*+([^*/][^*]*\*+)*\//gi, "");

  // map hsl(a, b, c) into for variable declarations, each with postfix -h -s -l -a
  userCSS = userCSS.replace(
    /--(.*):\shsl\((\d*),\s*(\d*)%,\s*(\d*)%\);?/gi,
    (_: string, name: string, h: string, s: string, l: string) =>
      `${_.endsWith(";") ? _ : _.slice(0, -1)}
        --${name}-h: ${h};
        --${name}-s: ${s}%;
        --${name}-l: ${l}%;
        --${name}-a: 1;`,
  );

  // console.log(`TRANSFORM - USER CSS RESULT:\n`, userCSS);

  // replaces on bulmaCSS the definition of the variables swaping line for line
  const vars = getDeclaredVariables(userCSS);
  for (const v of vars) {
    const decl = new RegExp(`.*${v}:.*`);
    bulmaCSS = bulmaCSS.replace(decl, decl.exec(userCSS)?.[0] ?? "");
  }

  return bulmaCSS + extensionsCSS;
};

export const kebabCase = (s: string): string => {
  const str = s.slice(1).replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
  return s.charAt(0).toLowerCase() + str;
};

export const camelCase = (s: string): string => {
  const str = s.slice(1).replace(/-([a-z])/g, (_, $1: string) => $1.toUpperCase());
  return s.charAt(0).toLowerCase() + str;
};

export const pascalCase = (s: string): string => {
  const str = s.slice(1).replace(/-([a-z])/g, (_, $1: string) => $1.toUpperCase());
  return s.charAt(0).toUpperCase() + str;
};
