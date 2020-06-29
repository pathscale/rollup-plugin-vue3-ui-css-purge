import path from "path";
import fs from "fs-extra";
import { sync as resolveSync } from "resolve";
import * as jsparser from "@babel/parser";
import traverse from "@babel/traverse";
import * as htmlparser from "htmlparser2";
import { kebablize, pascalize, camelize } from "./utils";
import { createFilter } from "@rollup/pluginutils";
import { parseSFC } from "./analyzer-utils";

const testing = process.env.NODE_ENV === "test";

// TODO: Mappings should be managed inside vue3-ui to not require plugin re-release on every change
const mappings = testing
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("../helper/mappings.json") as Record<string, string[]>)
  : // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("./mappings.json") as Record<string, string[]>);

export function analyze(input: string | string[] | Record<string, string>): string[] {
  const extensions = [".ts", ".tsx", ".mjs", ".js", ".jsx", ".vue", ".json"];
  const isSupported = createFilter(
    extensions.map(ext => `**/*${ext}`),
    ["**/node_modules/**"],
  );

  const whitelist = new Set<string>(["*", "html", "head", "body", "div", "app"]);
  let currentTag = "";

  const traversed = new Set<string>();
  const idList = (Array.isArray(input)
    ? input
    : typeof input === "object"
    ? Object.values(input)
    : [input]
  ).map(id => path.resolve(id));

  const parser = new htmlparser.Parser(
    {
      onopentagname(name) {
        whitelist.add(name);
        currentTag = name;
      },

      onattribute(_, data) {
        for (const cl of data.split(" ")) whitelist.add(cl);

        const m = [
          // TODO: Proper selector
          ...(mappings[currentTag] ?? []),
          ...(mappings[currentTag.slice(1)] ?? []),

          ...(mappings[kebablize(currentTag)] ?? []),
          ...(mappings[kebablize(currentTag).slice(1)] ?? []),

          ...(mappings[camelize(currentTag)] ?? []),
          ...(mappings[camelize(currentTag).slice(1)] ?? []),

          ...(mappings[pascalize(currentTag)] ?? []),
          ...(mappings[pascalize(currentTag).slice(1)] ?? []),
        ];

        for (const cl of m) whitelist.add(cl);
      },
    },
    { decodeEntities: true, lowerCaseTags: false, lowerCaseAttributeNames: true },
  );

  function extract(code: string, id: string): void {
    console.log(`ANALYZER - TRAVERSAL (${id})`);
    if (!/\.vue$/.test(id)) return;

    const { template, script } = parseSFC(code, id);

    if (template?.content) parser.parseComplete(template.content);

    if (script?.content) {
      const ast = jsparser.parse(script.content, { sourceType: "unambiguous" });
      traverse(ast, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ExportNamedDeclaration({ node }) {
          const { value } = node.source ?? {};
          if (!value) return;
          const depId = resolveSync(value, {
            basedir: path.dirname(id),
            extensions,
            packageFilter(pkg) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
              if (pkg.module) pkg.main = pkg.module;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return pkg;
            },
          });
          if (traversed.has(depId) || !isSupported(depId)) return;
          traversed.add(depId);
          idList.push(depId);
        },

        // eslint-disable-next-line @typescript-eslint/naming-convention
        ImportDeclaration({ node }) {
          const { value } = node.source;
          const depId = resolveSync(value, {
            basedir: path.dirname(id),
            extensions,
            packageFilter(pkg) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
              if (pkg.module) pkg.main = pkg.module;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return pkg;
            },
          });
          if (traversed.has(depId) || !isSupported(depId)) return;
          traversed.add(depId);
          idList.push(depId);

          if (!depId.includes("@pathscale/vue3-ui")) return;

          for (const spec of node.specifiers) {
            if (spec.type === "ImportSpecifier") {
              const name = spec.imported.name.slice(1);
              const wl = mappings[name];
              if (wl) console.log(`ANALYZER - VUE3-UI COMPONENT (${name})`);
              if (wl) for (const i of wl) whitelist.add(i);
            }
          }
        },
      });
    }
  }

  while (idList.length > 0) {
    const id = idList.pop();
    if (!id) continue;

    const code = fs.readFileSync(id, "utf8");
    extract(code, id);

    let ast: ReturnType<typeof jsparser.parse> | undefined;
    try {
      ast = jsparser.parse(code, { sourceType: "unambiguous" });
    } catch {
      continue;
    }

    traverse(ast, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExportNamedDeclaration({ node }) {
        const { value } = node.source ?? {};
        if (!value) return;
        const depId = resolveSync(value, {
          basedir: path.dirname(id),
          extensions,
          packageFilter(pkg) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            if (pkg.module) pkg.main = pkg.module;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return pkg;
          },
        });
        if (traversed.has(depId) || !isSupported(depId)) return;
        traversed.add(depId);
        idList.push(depId);
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      ImportDeclaration({ node }) {
        const { value } = node.source;
        const depId = resolveSync(value, {
          basedir: path.dirname(id),
          extensions,
          packageFilter(pkg) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            if (pkg.module) pkg.main = pkg.module;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return pkg;
          },
        });
        if (traversed.has(depId) || !isSupported(depId)) return;
        traversed.add(depId);
        idList.push(depId);
      },
    });
  }

  return [...whitelist].sort();
}
