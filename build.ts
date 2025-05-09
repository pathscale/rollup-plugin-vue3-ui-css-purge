import bunfig from "./bunfig.toml";
import pkg from "./package.json";
import { join } from "path";
import { mkdir, rename, cp, rm } from "fs/promises";

await rm(bunfig.build.outdir, { recursive: true, force: true });
await mkdir(bunfig.build.outdir, { recursive: true });

await Promise.all([esm(), cjs(), types()]);

function cjs() {
  return Bun.build({ ...bunfig.build, format: "cjs" });
}

async function esm() {
  await Bun.build({ ...bunfig.build, format: "esm" });
  const jsPath = join(bunfig.build.outdir, "index.js");
  const mjsPath = join(process.cwd(), pkg.module);
  return rename(jsPath, mjsPath);
}

function types() {
  const srcTypesPath = join(process.cwd(), "src/types.ts");
  const outTypesPath = join(process.cwd(), pkg.types);
  return cp(srcTypesPath, outTypesPath);
}
