import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import { Options } from "./types";
import analyzeCode from "./analyzer";

// TODO: Split into internal and extenal plugins
const generator = (options: Options = {}): Plugin => {
  const isVue3UICSS = createFilter([
    "**/node_modules/@pathscale/vue3-ui/**/*.css",
    "**/node_modules/@pathscale/bulma-css-var-only/**/*.css",
    "**/node_modules/@pathscale/bulma-pull-2981-css-var-only/**/*.css",
  ]);

  const whitelistPatterns: RegExp[] = [];
  const name = "vue3-ui-css-purge";
  const plugin: Plugin = {
    name,

    async buildStart(inputOpts) {
      // TODO: Very ugly and roundabout way, traverse Vue files directly for analysis
      const vue = inputOpts.plugins.find(p => p.name === "vue");
      if (!vue) this.error("vue plugin not found");

      const newInputOpts = {
        ...inputOpts,
        // TODO: Proper plugins list
        plugins: inputOpts.plugins.filter(p => p.name !== name && p.name !== "closure-compiler"),
      };

      const analyzed = await analyzeCode(options, newInputOpts);
      const escaped = analyzed.map(a =>
        // TODO: Proper regex escaping
        a
          .replace(".", "\\.")
          .replace("?", "\\?")
          .replace("+", "\\+")
          .replace("*", "\\*")
          .replace("^", "\\^")
          .replace("$", "\\$"),
      );

      whitelistPatterns.push(...escaped.map(e => new RegExp(`^${e}$`)));
      whitelistPatterns.push(...escaped.map(e => new RegExp(`${e}\\[.+?\\]`)));
      console.log(whitelistPatterns);
    },

    async transform(code, id) {
      if (!isVue3UICSS(id)) return null;

      const purger = postcss(
        purgecss({
          content: [],
          whitelistPatterns,
          whitelistPatternsChildren: whitelistPatterns,
        }),
      );

      const { css } = await purger.process(code, { from: id });

      return { code: css };
    },
  };

  return plugin;
};

export default generator;
