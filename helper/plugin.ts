import vm from "vm";
import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { parseQuery } from "../src/utils";
import * as htmlparser2 from "htmlparser2";
import { context, falsy, truthy } from "./data";

// TODO: Seems like a very inefficient way to do this, hopefully redo using proper Vue AST in the future
export default function (): Plugin {
  const whitelist: string[] = [];
  const filter = createFilter(null, ["**/node_modules/**"]);

  const parser = new htmlparser2.Parser(
    {
      onattribute(name, data) {
        if (name === "class") whitelist.push(...data.split(" "));
        else if (name === ":class") {
          data = `[${data}]`;
          console.log(data);

          const classes: string[] = [];

          const res = [
            ...(vm.runInNewContext(data, { ...context, ...truthy }) as []),
            ...(vm.runInNewContext(data, { ...context, ...falsy }) as []),
          ] as (string | Record<string, string> | (string | Record<string, string>)[])[];

          for (const item of res) {
            const i = Array.isArray(item) ? item : [item];
            console.log(i);
            for (const v of i) {
              if (typeof v === "string") classes.push(...v.split(" "));
              else if (typeof v === "object") {
                for (const [v1, v2] of Object.entries(v)) {
                  if (typeof v1 === "string") classes.push(...v1.split(" "));
                  if (typeof v2 === "string") classes.push(...v2.split(" "));
                }
              }
            }
          }

          console.log(classes);

          whitelist.push(...classes);
        }
      },
    },
    { decodeEntities: true },
  );

  const plugin: Plugin = {
    name: "gatherer",

    transform(code, id) {
      const query = parseQuery(id);
      if (!query.vue) return null;
      if (!query.src && !filter(query.filename)) return null;

      // Gather user's classlist
      if (query.type === "template") parser.parseComplete(code);

      return null;
    },

    generateBundle() {
      this.emitFile({ type: "asset", fileName: "gathered", source: JSON.stringify(whitelist) });
    },
  };

  return plugin;
}
