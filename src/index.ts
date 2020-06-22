// import { sync as resolveSync } from "resolve";
// import path from "path";
// import fs from "fs-extra";
import { createFilter } from "@rollup/pluginutils";
import { Plugin, rollup, NormalizedInputOptions, OutputAsset } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import { simple as walk } from "acorn-walk";
// import { inspect } from "util";
import { parseQuery } from "./utils";
import { Options } from "./types";

// TODO: Mappings should probably be managed inside vue3-ui to not require plugin re-release on every change
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mappings = require("../helper/mappings.json") as Record<string, string[]>;
// const debug = (...data: unknown[]) => console.log(inspect(data, false, null));

async function analyzeCode(opts: NormalizedInputOptions) {
  console.log(opts.plugins.map(p => p.name));
  const bundle = await rollup(opts);
  const { output } = await bundle.generate({});
  const whitelistFile = output.find(f => f.fileName === "whitelist") as OutputAsset;
  const whitelist = JSON.parse(Buffer.from(whitelistFile.source).toString()) as string[];
  console.log("whitelist", whitelist);
  return whitelist;
}

// TODO: Split into internal and extenal plugins
const generator = (options: Options = { analyzing: false }): Plugin => {
  const whitelist: string[] = [];

  const isIncluded = createFilter(
    options.include ?? /\.vue$/,
    options.exclude ?? ["**/node_modules/**"],
  );

  const isVue3UICSS = createFilter([
    "**/node_modules/@pathscale/vue3-ui/**/*.css",
    "**/node_modules/@pathscale/bulma-css-var-only/**/*.css",
    "**/node_modules/@pathscale/bulma-pull-2981-css-var-only/**/*.css",
  ]);

  const name = "vue3-ui-css-purge";

  const plugin: Plugin = {
    name,

    async buildStart(opts) {
      // TODO: Very ugly and roundabout way, traverse Vue files directly for analysis
      const vuePluginIndex = opts.plugins.findIndex(p => p.name === "vue");
      if (vuePluginIndex === -1) this.error("vue plugin not found");
      if (options.analyzing) return;
      const newOpts = { ...opts, plugins: opts.plugins.filter(p => p.name !== name) };
      newOpts.plugins.splice(vuePluginIndex - 1, 0, generator({ ...options, analyzing: true }));
      whitelist.push(...(await analyzeCode(newOpts)));
    },

    async transform(code, id) {
      const query = parseQuery(id);

      if (!query.vue) {
        if (options.analyzing) return null;
        if (!isVue3UICSS(id)) return null;
        // debug(path.parse(id).name, whitelist);
        const purger = postcss(purgecss({ content: [], whitelist }));
        const { css } = await purger.process(code, { from: id });
        // debug("purged", code.replace(/\s/g, ""), css.replace(/\s/g, ""));
        return { code: css };
      }

      if (!query.src && !isIncluded(query.filename)) return null;
      if (query.type !== "script") return null;

      type ImportNode = acorn.Node & {
        specifiers: { imported: { name: string } }[];
        source: { value: string };
      };

      if (options.analyzing) {
        const ast = this.parse(code, {});
        walk(ast, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ImportDeclaration(node) {
            const value = (node as ImportNode).source.value;
            if (!value.startsWith("@pathscale/vue3-ui")) return;
            for (const spec of (node as ImportNode).specifiers) {
              // TODO: Do it properly
              const wl = mappings[spec.imported.name.slice(1)];
              console.log(spec.imported.name, wl);
              if (wl) for (const i of wl) whitelist.push(i);
            }
          },
        });
      }

      return null;
    },

    generateBundle() {
      if (!options.analyzing) return;
      this.emitFile({
        type: "asset",
        fileName: "whitelist",
        source: JSON.stringify(whitelist),
      });
    },
  };

  return plugin;
};

export default generator;
