/* eslint node/no-unsupported-features/es-syntax: ["error", { ignores: ["modules"] }] */
// eslint-disable-next-line import/no-named-as-default
export default [
  {
    input: "src/index.ts",
    output: {
      format: "esm",
      dir: "dist",
    },
    plugins: [
      {
        name: "patch-path-imports",
        transform(code) {
          return code.replace(
            /import\s*{([^}]*)(win32|posix)([^}]*)}\s*from\s*["']path["']/g,
            'import { $1 } from "path"',
          );
        },
      },
    ],
    platform: "node",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  },
];
