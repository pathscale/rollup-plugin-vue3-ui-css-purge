import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";
import download from "download-git-repo";

import { rollup, OutputAsset } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import vue from "rollup-plugin-vue";
import styles from "rollup-plugin-styles";
import gatherer from "./plugin";

const repoDir = path.join(__dirname, "ui");
const srcDir = path.join(repoDir, "src");

const downloadAsync = async (url: string, dir: string) =>
  new Promise(resolve => void download(url, dir, {}, resolve));

async function getWhitelist(file: string): Promise<string[]> {
  const bundle = await rollup({
    input: file,
    plugins: [json(), resolve({ preferBuiltins: true }), commonjs(), gatherer(), vue(), styles()],
  });
  const { output } = await bundle.generate({});
  const whitelistFile = output.find(f => f.fileName === "whitelist") as OutputAsset;
  const whitelist = JSON.parse(Buffer.from(whitelistFile.source).toString("utf8")) as string[];
  return whitelist;
}

async function main(): Promise<void> {
  const mappings: Record<string, string[]> = {};

  fs.removeSync(repoDir);
  await downloadAsync("pathscale/vue3-ui", repoDir);

  // Avoid conflicting configs
  for (const file of fs.readdirSync(repoDir))
    if (file !== "src") fs.removeSync(path.join(repoDir, file));

  const pattern = path.join(srcDir, "**", "*.vue").replace(/\\/g, "/");
  const vueFiles = (await fg(pattern)).sort();

  for await (const file of vueFiles) {
    if (path.parse(file).name === "App") continue;
    const whitelist = await getWhitelist(file);
    mappings[path.parse(file).name] = whitelist;
  }

  fs.writeFileSync(path.join(__dirname, "mappings.json"), JSON.stringify(mappings, null, "  "));
}

void main();
