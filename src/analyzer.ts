import { createFilter } from "@rollup/pluginutils";
import { Plugin, rollup, NormalizedInputOptions, OutputAsset } from "rollup";
import { simple as walk } from "acorn-walk";
import { parseQuery } from "./utils";
import { Options } from "./types";
import * as htmlparser2 from "htmlparser2";
import { context } from "../helper/data";

// TODO: Mappings should probably be managed inside vue3-ui to not require plugin re-release on every change
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mappings = require("../helper/mappings.json") as Record<string, string[]>;

const decamelize = (s: string): string =>
  s.replace(/^(.)/, str => str.toLowerCase()).replace(/([A-Z])/g, str => `-${str.toLowerCase()}`);

const analyzer = (options: Options): Plugin => {
  const isIncluded = createFilter(
    options.include ?? /\.vue$/,
    options.exclude ?? ["**/node_modules/**"],
  );

  const whitelist = new Set<string>();
  let currentTag = "";

  const parser = new htmlparser2.Parser(
    {
      onopentagname(name) {
        currentTag = name;
      },

      onattribute(name, data) {
        if (!mappings[currentTag.slice(1)]) return;
        for (const from of Object.keys(context)) {
          if (name !== from && name !== decamelize(from)) continue;
          for (const cl of data.split(" ")) whitelist.add(cl);
        }
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
            // TODO: Do it properly
            const wl = mappings[spec.imported.name.slice(1)];
            // console.log(spec.imported.name, wl);
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
