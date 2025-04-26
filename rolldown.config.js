/* eslint node/no-unsupported-features/es-syntax: ["error", { ignores: ["modules"] }] */
// eslint-disable-next-line import/no-named-as-default
import terser from "@rollup/plugin-terser";

const isProduction = process.env.NODE_ENV === "production";

export default [
  {
    input: "src/index.ts",
    output: {
      format: "esm",
      dir: "dist",
    },
    plugins: [
      isProduction && terser(), // Minify only in production
    ].filter(Boolean),
    // define: {
    //   "process.env.NODE_ENV": JSON.stringify("production"),
    // },
  },
];
