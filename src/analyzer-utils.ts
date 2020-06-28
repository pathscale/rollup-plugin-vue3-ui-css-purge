// import path from "path";
// import fs from "fs-extra";
// import { sync as resolveSync } from "resolve";
// import * as jsparser from "@babel/parser";
// import traverse from "@babel/traverse";
// import * as htmlparser from "htmlparser2";
import * as sfcparser from "@vue/compiler-sfc";
// import { kebablize, pascalize, camelize } from "./utils";
// import { createFilter } from "@rollup/pluginutils";

export interface ParsedSFC {
  template: sfcparser.SFCTemplateBlock | null;
  script: sfcparser.SFCScriptBlock | null;
}

export function parseSFC(code: string, id: string): ParsedSFC {
  const {
    descriptor: { template, script },
  } = sfcparser.parse(code, {
    sourceMap: false,
    sourceRoot: process.cwd(),
    filename: id,
    pad: "line",
  });

  return { template, script };
}
