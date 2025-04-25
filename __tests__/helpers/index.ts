/* eslint-disable jest/no-export */
// eslint-disable @typescript-eslint/no-unsafe-call
import path from "path";
import fs from "fs-extra";
import { InputOptions, OutputOptions, rolldown } from "rolldown";

import { Options } from "../../src/types";

import nodePolyfills from "@rolldown/plugin-node-polyfills";
import type { OutputChunk, OutputAsset } from "rolldown";

export interface WriteData {
  input: string | string[];
  title?: string;
  outDir?: string;
  options?: Options;
  inputOpts?: InputOptions;
  outputOpts?: OutputOptions;
}

interface WriteResult {
  js: () => Promise<string[]>;
  css: () => Promise<string[]>;
  isCss: () => Promise<boolean[]>;
  map: () => Promise<string[]>;
  isMap: () => Promise<boolean[]>;
  isFile: (file: string) => Promise<boolean>;
}

async function pathExistsAll(paths: string[]): Promise<boolean[]> {
  return Promise.all(
    paths.map(async p =>
      fs
        .access(p)
        .then(() => true)
        .catch(() => false),
    ),
  );
}
// Process output files
function isChunk(f: OutputChunk | OutputAsset): f is OutputChunk {
  return f.type === "chunk";
}

function isCssAsset(f: OutputAsset): boolean {
  return f.fileName.endsWith(".css");
}

function isSourceMap(f: OutputAsset): boolean {
  return f.fileName.endsWith(".css.map");
}

export async function write(data: {
  input: string | string[];
  outDir?: string;
  title?: string;
  inputOpts?: Partial<InputOptions>;
  outputOpts?: Partial<OutputOptions>;
}): Promise<WriteResult> {
  const outDir = path.join("dist", data.outDir ?? data.title ?? "");
  const input = Array.isArray(data.input)
    ? data.input.map(i => path.join(i))
    : path.join(data.input);

  // Rolldown-specific configuration
  const bundle = await rolldown({
    input,
    platform: "node",
    // Merged configuration
    ...data.inputOpts,
    // Rolldown-native options
    resolve: {
      mainFields: ["module", "main"],
      extensions: [".mjs", ".js", ".ts", ".json", ".node"],
    },
    plugins: [
      {
        name: "json-handler",
        transform(code: string, id: string) {
          if (id.endsWith(".json")) {
            return `export default ${code}`;
          }
        },
      },
      {
        name: "node-resolve",
        resolveId(source: string) {
          if (source === "vue" || source.startsWith("@vue/")) {
            return { id: source, external: true };
          }
        },
      },
      {
        name: "css-extract",
        transform(code: string, id: string) {
          if (id.endsWith(".css")) {
            return `export default ${JSON.stringify(code)}`;
          }
        },
      },
      nodePolyfills(),
    ],

    treeshake: {
      moduleSideEffects: (id: string) =>
        id.includes(".css") || id.includes(".vue") || id.includes(".json"),
    },
  });

  // Output handling
  const outputConfig = {
    dir: outDir,
    format: "es" as const,
    ...(data.outputOpts ?? {}),
  };

  if (data.outputOpts?.file) {
    const { ...rest } = outputConfig;
    outputConfig.file = path.join(outDir, data.outputOpts.file);
    Object.assign(outputConfig, rest);
  }

  const { output } = await bundle.write(outputConfig);

  const jsFiles = output
    .filter((f): f is OutputChunk => isChunk(f))
    .map(f => path.join(outDir, f.fileName))
    .sort();

  const cssFiles = output
    .filter((f): f is OutputAsset => !isChunk(f) && isCssAsset(f))
    .map(f => path.join(outDir, f.fileName))
    .sort();

  const mapFiles = output
    .filter((f): f is OutputAsset => !isChunk(f) && isSourceMap(f))
    .map(f => path.join(outDir, f.fileName))
    .sort();

  return {
    js: async () => Promise.all(jsFiles.map(async f => fs.readFile(f, "utf8"))),
    css: async () => Promise.all(cssFiles.map(async f => fs.readFile(f, "utf8"))),
    isCss: async () => pathExistsAll(cssFiles),
    map: async () => Promise.all(mapFiles.map(async f => fs.readFile(f, "utf8"))),
    isMap: async () => pathExistsAll(mapFiles),
    isFile: async (file: string) =>
      fs
        .access(path.join(outDir, file))
        .then(() => true)
        .catch(() => false),
  };
}

/////
export interface TestData extends WriteData {
  title: string;
  files?: string[];
  shouldFail?: boolean;
}

export function validate(data: TestData): void {
  // eslint-disable-next-line jest/valid-title -- helper utility
  test(data.title, async () => {
    if (data.shouldFail) {
      // eslint-disable-next-line jest/no-conditional-expect -- helper utility
      await expect(
        write({
          input: data.input,
          outDir: data.outDir,
          title: data.title,
          inputOpts: data.inputOpts as Partial<InputOptions>,
          outputOpts: data.outputOpts as Partial<OutputOptions>,
        }),
      ).rejects.toThrowErrorMatchingSnapshot();
      return;
    }

    const res = await write({
      input: data.input,
      outDir: data.outDir,
      title: data.title,
      inputOpts: data.inputOpts as Partial<InputOptions>,
      outputOpts: data.outputOpts as Partial<OutputOptions>,
    });

    for (const f of await res.js()) expect(f).toMatchSnapshot("js");

    await expect(res.isCss()).resolves.toBeTruthy();
    for (const f of await res.css()) expect(f).toMatchSnapshot("css");

    await expect(res.isMap()).resolves.toBeFalsy();
    for (const f of await res.map()) expect(f).toMatchSnapshot("map");

    for await (const f of data.files ?? []) await expect(res.isFile(f)).resolves.toBeTruthy();
  });
}

export function validateMany(groupName: string, testDatas: TestData[]): void {
  // eslint-disable-next-line jest/valid-title -- helper utility
  describe(groupName, () => {
    for (const testData of testDatas) {
      validate({ ...testData, outDir: path.join(groupName, testData.title) });
    }
  });
}
