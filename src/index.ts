// import { sync as resolveSync } from "resolve";
import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import { simple as walk } from "acorn-walk";
import { inspect } from "util";
import { parseQuery } from "./utils";
import { Options } from "./types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const whitelistMap = require("../helper/mappings.json") as Record<string, string[]>;
const debug = (...data: unknown[]) => void console.log(inspect(data, false, null));

export default (options: Options = {}): Plugin => {
  const isIncluded = createFilter(
    options.include ?? /\.vue$/,
    options.exclude ?? ["**/node_modules/**"],
  );

  // TODO: Utilize loaded whitelist
  console.log(whitelistMap);

  const plugin: Plugin = {
    name: "vue3-ui-css-purge",

    async transform(code, id) {
      const query = parseQuery(id);
      if (!query.vue) return null;
      if (!query.src && !isIncluded(query.filename)) return null;

      if (query.type === "script") {
        // TODO: Find all imports and map them to whitelist
        const ast = this.parse(code, {});
        walk(ast, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Import(node) {
            debug(node);
          },
        });
      }

      if (query.type === "style") {
        const purger = postcss(purgecss({ content: [], whitelist: [] }));
        const { css } = await purger.process(code, { from: id });
        debug("purged", code.replace(/\s/g, ""), css.replace(/\s/g, ""));
        return { code: css };
      }

      return null;
    },
  };

  return plugin;
};
