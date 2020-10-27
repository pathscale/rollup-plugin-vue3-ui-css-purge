import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import { analyze } from "./analyzer";
import { Options } from "./types";
import { inspect } from "util";
import * as jsparser from "@babel/parser";

const generator = (options: Options = {}): Plugin => {
  const filter = createFilter(options.include, options.exclude ?? ["**/node_modules/**"]);
  const isVue3UICSS = createFilter([
    "**/node_modules/@pathscale/vue3-ui/**/*.css",
    "**/node_modules/@pathscale/bulma-css-var-only/**/*.css",
    "**/node_modules/@pathscale/bulma-extensions-css-var/**/*.css",
    "**/node_modules/@pathscale/bulma-pull-2981-css-var-only/**/*.css",
  ]);

  const whitelist = new Set<RegExp>();

  const parserDefaults: jsparser.ParserOptions = {
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

  const plugin: Plugin = {
    name: "vue3-ui-css-purge",

    buildStart(inputOpts) {
      const base = [
        "*",
        "html",
        "head",
        "body",
        "app",
        "div",
        ...analyze(inputOpts.input, options.debug ?? false, filter, {
          ...parserDefaults,
          ...options.parserOpts,
        }),
      ].map(b => b.replace(/[$()*+.?[\\\]^{|}-]/g, "\\$&"));

      for (const b of base) {
        whitelist.add(new RegExp(`^${b}$`));
        whitelist.add(new RegExp(`${b}\\[.+?\\]`));
      }

      options.debug &&
        console.log(
          `CSS PURGER - WHITELIST (${whitelist.size} entries):\n`,
          inspect([...whitelist], { showHidden: false, depth: null, maxArrayLength: null }),
        );
    },

    async transform(code, id) {
      if (!isVue3UICSS(id)) return null;

      const purger = postcss(
        purgecss({
          content: [],
          whitelistPatterns: [...whitelist],
          whitelistPatternsChildren: [...whitelist],
          variables: true,
          keyframes: true
        }),
      );

      const { css } = await purger.process(code, { from: id });

      return { code: css };
    },
  };

  return plugin;
};

export default generator;
