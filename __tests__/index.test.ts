import fs from "fs-extra";
import { fixture, validateMany } from "./helpers";

beforeAll(async () => fs.remove(fixture("dist")));

validateMany("basic", [
  {
    title: "simple",
    input: "simple/index.js",
  },
]);
