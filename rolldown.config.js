/* eslint node/no-unsupported-features/es-syntax: ["error", { ignores: ["modules"] }] */
// eslint-disable-next-line import/no-named-as-default
export default [
  {
    input: "src/index.ts",
    output: {
      format: "esm",
      dir: "dist",
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  },
];
