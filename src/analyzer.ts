import { createFilter } from "@rollup/pluginutils";
import { Plugin, rollup, NormalizedInputOptions, OutputAsset } from "rollup";
import { simple as walk } from "acorn-walk";
import { parseQuery } from "./utils";
import { Options } from "./types";
import * as htmlparser2 from "htmlparser2";

const testing = process.env.NODE_ENV === "test";

// TODO: Mappings should probably be managed inside vue3-ui to not require plugin re-release on every change
const mappings = testing
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("../helper/mappings.json") as Record<string, string[]>)
  : // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("./mappings.json") as Record<string, string[]>);

const decamelize = (s: string): string =>
  s.replace(/^(.)/, str => str.toLowerCase()).replace(/([A-Z])/g, str => `-${str.toLowerCase()}`);

const camelize = (s: string): string =>
  s
    .replace(/^(.)/, str => str.toUpperCase())
    .replace(/-([a-z])/g, str => str.toUpperCase().slice(1));

const analyzer = (options: Options): Plugin => {
  const isIncluded = createFilter(
    options.include ?? /\.vue$/,
    options.exclude ?? ["**/node_modules/**"],
  );

  const whitelist = new Set<string>(["*", "html", "head", "body", "div", "app"]);
  let currentTag = "";

  const parser = new htmlparser2.Parser(
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
          ...(mappings[currentTag.toLowerCase()] ?? []),
          ...(mappings[currentTag.slice(1).toLowerCase()] ?? []),
          ...(mappings[decamelize(currentTag)] ?? []),
          ...(mappings[decamelize(currentTag).slice(1)] ?? []),
          ...(mappings[camelize(currentTag)] ?? []),
          ...(mappings[camelize(currentTag).slice(1)] ?? []),
        ];

        for (const cl of m) whitelist.add(cl);
      },
    },
    { decodeEntities: true, lowerCaseTags: false, lowerCaseAttributeNames: true },
  );

  const name = "vue3-ui-css-whitelist-analyzer";
  const plugin: Plugin = {
    name,

    transform(code, id) {
      const query = parseQuery(id);
      if (!query.vue) return null;
      if (!query.src && !isIncluded(query.filename)) return null;
      if (query.type === "template") parser.parseComplete(code);
      if (query.type !== "script") return null;

      type ImportNode = acorn.Node & {
        specifiers: { imported: { name: string } }[];
        source: { value: string };
      };

      const ast = this.parse(code, {});
      walk(ast, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ImportDeclaration(node) {
          const value = (node as ImportNode).source.value;
          if (!value.startsWith("@pathscale/vue3-ui")) return;
          for (const spec of (node as ImportNode).specifiers) {
            const wl = mappings[spec.imported.name.slice(1)];
            if (wl) for (const i of wl) whitelist.add(i);
          }
        },
      });

      return null;
    },

    generateBundle() {
      const source = JSON.stringify([...whitelist].sort());
      this.emitFile({ type: "asset", fileName: "whitelist", source });
    },
  };

  return plugin;
};

export default async function (
  options: Options,
  inputOpts: NormalizedInputOptions,
): Promise<string[]> {
  const vueIndex = inputOpts.plugins.findIndex(p => p.name === "vue");
  inputOpts.plugins.splice(vueIndex - 1, 0, analyzer(options));

  const bundle = await rollup(inputOpts);
  const { output } = await bundle.generate({});
  const whitelistFile = output.find(f => f.fileName === "whitelist") as OutputAsset;

  const whitelist = JSON.parse(Buffer.from(whitelistFile.source).toString("utf8")) as string[];
  return whitelist;
}
