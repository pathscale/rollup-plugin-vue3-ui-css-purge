import path from "path";
import fs from "fs-extra";
import { sync as resolveSync } from "resolve";
import * as jsparser from "@babel/parser";
import traverse from "@babel/traverse";
import * as htmlparser from "htmlparser2";
import { kebablize, pascalize, camelize, humanlizePath, normalizePath } from "./utils";
import { parseSFC, isVueSFC } from "./analyzer-utils";

const vue3ui = resolveSync("@pathscale/vue3-ui", {
  basedir: __dirname,
  packageFilter(pkg) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    if (pkg.module) pkg.main = pkg.module;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return pkg;
  },
});

const mappingsFile = path.join(path.dirname(vue3ui), "mappings.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mappings = require(mappingsFile) as Record<string, string[]>;

export function analyze(
  input: string | string[] | Record<string, string>,
  debug?: boolean,
): string[] {
  const extensions = [".ts", ".tsx", ".mjs", ".js", ".jsx", ".vue", ".json"];

  const isSupported = (id: string) => {
    const lowerId = normalizePath(id.toLowerCase());
    if (lowerId.includes("/node_modules/")) return false;
    return extensions.some(ext => lowerId.endsWith(ext));
  };

  const traversed = new Set<string>();
  const whitelist = new Set<string>(["*", "html", "head", "body", "div", "app"]);

  const idList = (Array.isArray(input)
    ? input
    : typeof input === "object"
    ? Object.values(input)
    : [input]
  ).map(id => normalizePath(path.resolve(id)));

  const parser = new htmlparser.Parser(
    {
      onopentagname(name) {
        whitelist.add(name);

        // TODO: Proper selector
        const m = [
          ...(mappings[name] ?? []),
          ...(mappings[kebablize(name)] ?? []),
          ...(mappings[camelize(name)] ?? []),
          ...(mappings[pascalize(name)] ?? []),
        ];

        for (const cl of m) whitelist.add(cl);
      },

      onattribute(_, data) {
        // TODO: Filter out the attributes
        for (const cl of data.split(" ")) whitelist.add(cl);
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
    const depId = normalizePath(
      resolveSync(value, {
        basedir: path.dirname(id),
        extensions,
        packageFilter(pkg) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
          if (pkg.module) pkg.main = pkg.module;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

    const ast = jsparser.parse(code, { sourceType: "unambiguous" });
    traverse(ast, {
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
          const wl = mappings[spec.imported.name];
          if (wl && debug) console.log(`ANALYZER - VUE3-UI COMPONENT (${spec.imported.name})`);
          if (wl) for (const i of wl) whitelist.add(i);
        }
      },
    });
  }

  while (idList.length > 0) {
    const id = idList.pop();
    if (!id) continue;
    const code = fs.readFileSync(id, "utf8");
    traverseSource(id, code);
  }

  return [...whitelist].sort();
}
