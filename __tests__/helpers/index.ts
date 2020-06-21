/* eslint-disable jest/no-export */
import path from "path";
import fs from "fs-extra";
import { rollup, InputOptions, OutputOptions } from "rollup";
import dotenv from "dotenv";

import vue3ui from "../../src";
import { Options } from "../../src/types";

import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import vue from "rollup-plugin-vue";
import styles from "rollup-plugin-styles";

export interface WriteData {
  input: string | string[];
  title?: string;
  outDir?: string;
  options?: Options;
  inputOpts?: InputOptions;
  outputOpts?: OutputOptions;
}

export interface WriteResult {
  js: () => Promise<string[]>;
  css: () => Promise<string[]>;
  isCss: () => Promise<boolean>;
  map: () => Promise<string[]>;
  isMap: () => Promise<boolean>;
  isFile: (file: string) => Promise<boolean>;
}

async function pathExistsAll(files: string[]): Promise<boolean> {
  if (files.length === 0) return false;
  for await (const file of files) {
    const exists = await fs.pathExists(file);
    if (!exists) return false;
  }
  return true;
}

export const fixture = (...args: string[]): string =>
  path.normalize(path.join(__dirname, "..", "fixtures", ...args));

export async function write(data: WriteData): Promise<WriteResult> {
  const outDir = fixture("dist", data.outDir ?? data.title ?? "");
  const input = Array.isArray(data.input) ? data.input.map(i => fixture(i)) : fixture(data.input);
  const env = dotenv.config({ path: path.join(process.cwd(), ".env") });
  const bundle = await rollup({
    ...data.inputOpts,
    input,
    plugins: [
      json(),
      replace({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "process.env.VUE_APP_VERSION_NUMBER": JSON.stringify(env.parsed?.VUE_APP_VERSION_NUMBER),
      }),
      resolve({ preferBuiltins: true }),
      commonjs(),
      vue3ui(data.options),
      vue(),
      styles(),
    ],
  });

  const { output } = await bundle.write({
    ...data.outputOpts,
    dir: data.outputOpts?.file ? undefined : outDir,
    file: data.outputOpts?.file && path.join(outDir, data.outputOpts.file),
  });

  const js = output
    .filter(f => f.type === "chunk")
    .map(f => path.join(outDir, f.fileName))
    .sort();

  const css = output
    .filter(f => f.type === "asset" && f.fileName.endsWith(".css"))
    .map(f => path.join(outDir, f.fileName))
    .sort();

  const map = output
    .filter(f => f.type === "asset" && f.fileName.endsWith(".css.map"))
    .map(f => path.join(outDir, f.fileName))
    .sort();

  const res: WriteResult = {
    js: async () => Promise.all(js.map(async f => fs.readFile(f, "utf8"))),
    css: async () => Promise.all(css.map(async f => fs.readFile(f, "utf8"))),
    isCss: async () => pathExistsAll(css),
    map: async () => Promise.all(map.map(async f => fs.readFile(f, "utf8"))),
    isMap: async () => pathExistsAll(map),
    isFile: async file => fs.pathExists(path.join(outDir, file)),
  };

  return res;
}

export interface TestData extends WriteData {
  title: string;
  files?: string[];
  shouldFail?: boolean;
}

export function validate(data: TestData): void {
  test(data.title, async () => {
    if (data.shouldFail) {
      await expect(write(data)).rejects.toThrowErrorMatchingSnapshot();
      return;
    }

    const res = await write(data);

    for (const f of await res.js()) expect(f).toMatchSnapshot("js");

    await expect(res.isCss()).resolves.toBeFalsy();
    for (const f of await res.css()) expect(f).toMatchSnapshot("css");

    await expect(res.isMap()).resolves.toBeFalsy();
    for (const f of await res.map()) expect(f).toMatchSnapshot("map");

    for await (const f of data.files ?? []) await expect(res.isFile(f)).resolves.toBeTruthy();
  });
}

export function validateMany(groupName: string, testDatas: TestData[]): void {
  describe(groupName, () => {
    for (const testData of testDatas) {
      validate({ ...testData, outDir: path.join(groupName, testData.title) });
    }
  });
}
