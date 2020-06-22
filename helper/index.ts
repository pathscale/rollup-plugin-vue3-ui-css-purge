import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";
import download from "download-git-repo";
import { parse } from "@vue/compiler-sfc";

import * as acorn from "acorn";
import { simple as walk } from "acorn-walk";
import * as htmlparser2 from "htmlparser2";

import getDynamicClasses from "./get-dynamic-classes";

const repoDir = path.join(__dirname, "ui");
const srcDir = path.join(repoDir, "src");

const downloadAsync = async (url: string, dir: string) =>
  new Promise(resolve => void download(url, dir, {}, resolve));

// TODO: Move back to plugin approach, maybe write import traverser later

async function main(): Promise<void> {
  const mappings: Record<string, string[]> = {};

  fs.removeSync(repoDir);
  await downloadAsync("pathscale/vue3-ui", repoDir);

  // Avoid conflicting configs
  for (const file of fs.readdirSync(repoDir))
    if (file !== "src") fs.removeSync(path.join(repoDir, file));

  const pattern = path.join(srcDir, "**", "*.vue").replace(/\\/g, "/");
  const vueFiles = (await fg(pattern)).sort();
  // const vueComponents = vueFiles.map(f => path.parse(f).name);

  // const nested: Record<string, string[]> = {};

  function getWhitelist(file: string): string[] {
    const { name, dir } = path.parse(file);
    name;

    const source = fs.readFileSync(file, "utf-8");

    const { descriptor } = parse(source, {
      sourceMap: false,
      filename: file,
      sourceRoot: process.cwd(),
      pad: "line",
    });

    if (descriptor.script) {
      const ast = acorn.parse(descriptor.script.content, {
        sourceType: "module",
        ecmaVersion: 2020,
      });

      type ImportNode = acorn.Node & {
        specifiers: (
          | { type: "ImportDefaultSpecifier"; local: { name: string } }
          | { type: "ImportSpecifier"; imported: { name: string } }
        )[];
        source: { value: string };
      };

      walk(ast, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ImportDeclaration(node) {
          // if (name !== "App") return;

          let hasDefaultSpec = false;
          for (const spec of (node as ImportNode).specifiers) {
            if (spec.type === "ImportDefaultSpecifier") {
              hasDefaultSpec = true;
              continue;
            }

            console.log(spec.imported.name);

            // const wl = mappings[spec.imported.name];
            // if (wl) for (const i of wl) whitelist.add(i);
          }

          if (hasDefaultSpec) {
            const fullpath = path.resolve(dir, (node as ImportNode).source.value);
            console.log(fullpath);
          }
        },
      });
    }

    if (!descriptor.template) return [];

    const whitelist = new Set<string>();
    const parser = new htmlparser2.Parser(
      {
        onattribute(name, data) {
          if (name === "class") {
            for (const c of data.split(" ")) whitelist.add(c);
            return;
          }

          if (name === ":class") {
            const classes = getDynamicClasses(data);
            for (const c of classes) whitelist.add(c);
            return;
          }
        },
      },
      { decodeEntities: true, lowerCaseTags: false, lowerCaseAttributeNames: true },
    );

    // console.log(descriptor.template.content);
    parser.parseComplete(descriptor.template.content);
    return [...whitelist].sort();
  }

  for await (const file of vueFiles) {
    const whitelist = getWhitelist(file);
    mappings[path.parse(file).name] = whitelist;
  }

  // console.log(nested);
  fs.writeFileSync(path.join(__dirname, "mappings.json"), JSON.stringify(mappings, null, "  "));
}

void main();
