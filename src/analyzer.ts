import { camelCase, humanlizePath, kebabCase, normalizePath, pascalCase } from "./utils";
import { parseSFC, isVueSFC } from "./analyzer-utils";
import { sync as resolveSync } from "resolve";
import * as htmlparser from "htmlparser2";
import * as jsparser from "@babel/parser";
import fs from "fs-extra";
import path from "path";
import traverse from "@babel/traverse";

type Data<K extends string, T> = { [P in K]?: T };

const parserOpts: jsparser.ParserOptions = {
  sourceType: "unambiguous",
  plugins: [
    "asyncGenerators",
    "bigInt",
    "classPrivateMethods",
    "classPrivateProperties",
    "classProperties",
    "decimal",
    "doExpressions",
    "dynamicImport",
    "exportDefaultFrom",
    "functionBind",
    "functionSent",
    "importMeta",
    "jsx",
    "logicalAssignment",
    "nullishCoalescingOperator",
    "numericSeparator",
    "objectRestSpread",
    "optionalCatchBinding",
    "optionalChaining",
    "partialApplication",
    "placeholders",
    "privateIn",
    "throwExpressions",
    "typescript",
  ],
};

const vue3ui = resolveSync("@pathscale/vue3-ui", {
  basedir: __dirname,
  packageFilter(pkg) {
    if (pkg.module) pkg.main = pkg.module;
    return pkg;
  },
});

type Mappings = Data<string, { always: string[]; optional: string[]; unstable: string[] }>;
const mappingsFile = normalizePath(path.dirname(vue3ui), "mappings.json");
const mappings = require(mappingsFile) as Mappings; // eslint-disable-line @typescript-eslint/no-var-requires

type Unstables = Data<string, Record<string, string[]>>;
const unstablesFile = normalizePath(path.dirname(vue3ui), "classes.json");
const unstables = require(unstablesFile) as Unstables; // eslint-disable-line @typescript-eslint/no-var-requires

export function analyze(
  input: string | string[] | Record<string, string>,
  debug: boolean,
  filter: (id: string) => boolean,
  alias: Record<string, string>,
): string[] {
  const extensions = [".ts", ".tsx", ".mjs", ".js", ".jsx", ".vue"];

  const isSupported = (id: string) => {
    const lowerId = normalizePath(id.toLowerCase());
    if (!filter(lowerId)) return false;
    return extensions.some(ext => lowerId.endsWith(ext));
  };

  const traversed = new Set<string>();
  const whitelist = new Set<string>(["*", "html", "head", "body", "div", "app"]);
  let currentTag = "";

  const idList = (
    Array.isArray(input) ? input : typeof input === "object" ? Object.values(input) : [input]
  ).map(id => normalizePath(path.resolve(id)));

  const parser = new htmlparser.Parser(
    {
      // all tags will be whitelisted
      // additionally, if it happens to be a vue3-ui component, all classes that have no dependencies must be whitelisted as well
      onopentagname(name) {
        whitelist.add(name);
        currentTag = pascalCase(name);
        if (kebabCase(currentTag).startsWith("v-")) {
          const props = unstables[currentTag] ?? {};
          const classes = Object.keys(props);
          for (const cl of classes) props[cl].length === 0 && whitelist.add(cl);
        }
      },

      onattribute(p, data) {
        for (const cl of data.split(" ")) whitelist.add(cl);

        const prop = p.replace(":", ""); // remove : from props like :loading -> loading

        if (kebabCase(currentTag).startsWith("v-")) {
          // optional
          if (mappings[currentTag]?.optional.includes(`is-${prop}`)) {
            console.log(`${currentTag} optional prop:`, `is-${prop}`);
            whitelist.add(`is-${prop}`);
            return;
          }

          // unstable
          const p = camelCase(prop);
          const props = unstables[currentTag] ?? {};
          const classes = Object.keys(props);
          for (const cl of classes) {
            const valid = props[cl].includes(p);
            valid && console.log(`${currentTag} unstable prop:`, p);
            valid && whitelist.add(cl);
          }
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: false, lowerCaseAttributeNames: true },
  );

  function extract(code: string, id: string): string | undefined {
    debug && console.log(`ANALYZER - TRAVERSAL (${humanlizePath(id)})`);
    if (!isVueSFC(id)) return code;
    debug && console.log(`ANALYZER - INCLUDED (${humanlizePath(id)})`);
    const { template, script } = parseSFC(code, id);
    if (template?.content) parser.parseComplete(template.content);
    if (script?.content) return script.content;
    return;
  }

  function resolveSource(id: string, value: string): string | undefined {
    // Remove query
    value = value.split("?", 2)[0];

    // Resolve aliases
    for (const [from, to] of Object.entries(alias)) {
      if (value !== from && !value.startsWith(`${from}/`)) continue;
      value = to + value.slice(from.length);
    }

    const depId = normalizePath(
      resolveSync(value, {
        basedir: path.dirname(id),
        extensions,
        packageFilter(pkg) {
          if (pkg.module) pkg.main = pkg.module;
          return pkg;
        },
      }),
    );

    if (traversed.has(depId) || !isSupported(depId)) return;
    else traversed.add(depId);
    return depId;
  }

  function traverseSource(id: string, rawCode: string) {
    const code = extract(rawCode, id);
    if (!code) return;

    const ast = jsparser.parse(code, parserOpts);
    traverse(ast, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      StringLiteral({ node }) {
        if (!isVueSFC(id)) return;
        for (const cl of node.value.split(" ")) whitelist.add(cl);
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExportNamedDeclaration({ node }) {
        if (!node.source) return;
        const depId = resolveSource(id, node.source.value);
        if (depId) idList.push(depId);
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      ImportDeclaration({ node }) {
        const depId = resolveSource(id, node.source.value);

        if (depId) {
          idList.push(depId);
          if (!depId.includes("@pathscale/vue3-ui")) return;
        }

        for (const spec of node.specifiers) {
          if (spec.type !== "ImportSpecifier") continue;
          if (!("name" in spec.imported)) continue;
          const wl = mappings[spec.imported.name]?.always;
          if (!wl) continue;
          for (const i of wl) whitelist.add(i);
          debug && console.log(`ANALYZER - VUE3-UI COMPONENT (${spec.imported.name}):\n`, wl);
        }
      },
    });
  }

  while (idList.length > 0) {
    const id = idList.pop();
    if (!id) continue;
    const code = fs.readFileSync(id, "utf8");
    try {
      traverseSource(id, code);
    } catch (error) {
      debug && console.log(`ANALYZER - PROCESSING ERROR (${humanlizePath(id)}):\n`, error);
    }
  }

  const wl = [...whitelist]
    // Delete some garbage
    .filter(_v => {
      const v = _v.trim();
      const garbage = ["vue", "slot"];
      if (!v) return false;
      if (/[A-Z]/.test(v)) return false;
      if (/[./:\\]/.test(v)) return false;
      if (garbage.includes(v)) return false;
      return true;
    })
    .sort();

  return wl;
}
