// import { sync as resolveSync } from "resolve";
import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import postcss from "postcss";
import purgecss from "@fullhuman/postcss-purgecss";
// import * as htmlparser2 from "htmlparser2";
import { simple as walk } from "acorn-walk";
import { inspect } from "util";
import { parseQuery } from "./utils";
import { Options } from "./types";

const debug = (...data: unknown[]) => void console.log(inspect(data, false, null));

export default (options: Options = {}): Plugin => {
  const whitelist: string[] = ["name", "fob"];

  const isIncluded = createFilter(
    options.include ?? /\.vue$/,
    options.exclude ?? ["**/node_modules/**"],
  );

  // const parser = new htmlparser2.Parser(
  //   {
  //     onattribute(name, data) {
  //       if (name === "class") whitelist.push(data);
  //       if (name === "id") whitelist.push(data);
  //     },
  //   },
  //   { decodeEntities: true },
  // );

  const plugin: Plugin = {
    name: "vue3-ui-css-purge",

    buildStart() {
      // // TODO: Very hacky because resolve does not work for some reason
      // const vue3uiFile = path.join(
      //   process.cwd(),
      //   "node_modules",
      //   "@pathscale/vue3-ui",
      //   "dist/bundle.js",
      // );
      // const vue3ui = fs.readFileSync(vue3uiFile, "utf-8");
      // console.log(vue3ui);
    },

    async transform(code, id) {
      const query = parseQuery(id);
      if (!query.vue) return null;
      if (!query.src && !isIncluded(query.filename)) return null;

      if (query.type === "style") {
        const purger = postcss(purgecss({ content: [], whitelist }));
        const { css } = await purger.process(code, { from: id });
        debug("purged", code.replace(/\s/g, ""), css.replace(/\s/g, ""));
        return { code: css };
      }

      if (query.type === "script") {
        const ast = this.parse(code, {});
        walk(ast, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Import(node) {
            debug(node);
          },
        });
      }

      return null;
    },
  };

  return plugin;
};
