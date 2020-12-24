import { analyze } from "./analyzer";
import { createFilter } from "@rollup/pluginutils";
import { isMain, makeVue3UiBundle, injectFakeBundle } from "./utils";
import { inspect } from "util";
import { Options } from "./types";
import { Plugin } from "rollup";
import * as jsparser from "@babel/parser";
import fs from "fs-extra";
import path from "path";
import postCleaner from "./post-cleaner";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";

const generator = (options: Options = {}): Plugin => {
  const filter = createFilter(options.include, options.exclude ?? ["**/node_modules/**"]);
  const isVue3UICSS = createFilter([
    "**/node_modules/@pathscale/vue3-ui/**/*.css",
    "**/node_modules/@pathscale/bulma-css-var-only/**/*.css",
    "**/node_modules/@pathscale/bulma-extensions-css-var/**/*.css",
    "**/node_modules/@pathscale/bulma-pull-2981-css-var-only/**/*.css",
  ]);
  let foundMain = false;
  let fakeBundlePath = "";
  let base: string[] = [];
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
      base = [
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
          `CSS PURGER - WHITELIST:\n`,
          inspect(new Set([...base]), { showHidden: false, depth: null, maxArrayLength: null }),
        );
    },

    async transform(code, id) {
      if (isVue3UICSS(id)) return "";

      if (isMain(code) && !foundMain) {
        const newJs = injectFakeBundle(code);
        const fakeBundle = makeVue3UiBundle(id);
        fs.writeFileSync(`${path.dirname(id)}/vue3-ui-bundle.css`, fakeBundle);
        foundMain = true;
        fakeBundlePath = `${path.dirname(id)}/vue3-ui-bundle.css`;
        return newJs;
      }

      if (!id.includes("vue3-ui-bundle.css")) return null;

      /**
       * having as whitelist = ["switch", "input", "check"] will purge the following code anyway
       * .switch input[type=checkbox]+.check { ... }
       *
       * whitelisting all children for switch works, TODO: find the proper way to not nuke this
       * */
      const deepClasses = ["switch"];

      // eslint-disable-next-line unicorn/no-reduce
      const deep = deepClasses.reduce(
        (acc: RegExp[], cl: string) => (base.includes(cl) ? [...acc, new RegExp(cl)] : [...acc]),
        [],
      );

      const purger = postcss(
        purgecss({
          content: [],
          safelist: { standard: [...whitelist], deep },
          keyframes: true,
        }),
      );

      const { css } = await purger.process(code, { from: id });
      return { code: postCleaner(css) };
    },

    buildEnd() {
      try {
        fs.unlinkSync(fakeBundlePath);
      } catch {
        this.warn(
          "vue3-ui-bundle.css was not found, please use recomended style packages for vue3-ui",
        );
      }
    },
  };

  return plugin;
};

export default generator;
