import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import { Options } from "./types";
import analyzeCode from "./analyzer";

// import path from "path";
// import { inspect } from "util";
// const debug = (...data: unknown[]) => console.log(inspect(data, false, null));

// TODO: Split into internal and extenal plugins
const generator = (options: Options = {}): Plugin => {
  const isVue3UICSS = createFilter([
    "**/node_modules/@pathscale/vue3-ui/**/*.css",
    "**/node_modules/@pathscale/bulma-css-var-only/**/*.css",
    "**/node_modules/@pathscale/bulma-pull-2981-css-var-only/**/*.css",
  ]);

  const whitelist: string[] = [];
  const name = "vue3-ui-css-purge";
  const plugin: Plugin = {
    name,

    async buildStart(inputOpts) {
      // TODO: Very ugly and roundabout way, traverse Vue files directly for analysis
      const vue = inputOpts.plugins.find(p => p.name === "vue");
      if (!vue) this.error("vue plugin not found");

      const newInputOpts = {
        ...inputOpts,
        plugins: inputOpts.plugins.filter(p => p.name !== name),
      };

      const analyzed = await analyzeCode(options, newInputOpts);
      whitelist.push(...analyzed);
    },

    async transform(code, id) {
      if (!isVue3UICSS(id)) return null;

      // debug(path.parse(id).name, whitelist);
      const purger = postcss(purgecss({ content: [], whitelist }));
      const { css } = await purger.process(code, { from: id });

      // eslint-disable-next-line node/no-unsupported-features/node-builtins
      // debug(id, new TextEncoder().encode(code).length, new TextEncoder().encode(css).length);

      return { code: css };
    },
  };

  return plugin;
};

export default generator;
