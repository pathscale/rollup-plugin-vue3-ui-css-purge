/* eslint node/no-unsupported-features/es-syntax: ["error", { ignores: ["modules"] }] */
// eslint-disable-next-line import/no-named-as-default
// import json from '@rollup/plugin-json';
import terser from "@rollup/plugin-terser";

const isProduction = process.env.NODE_ENV === "production";

export default {
  input: "src/index.ts",
  output: {
    format: "esm",
    dir: "dist",
  },
  plugins: [
    // json({
    //   namedExports: false, 
    //   preferConst: true,
    // }),
    isProduction && terser(), // Minify only in production
  ].filter(Boolean),
};
