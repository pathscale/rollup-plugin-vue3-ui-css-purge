import { rolldown } from 'rolldown'
import nodePolyfills from '@rolldown/plugin-node-polyfills'
// import vue from "rollup-plugin-vue";

export default {
    input: "src/index.ts",
    output: {
      // format: 'esm',
      // dir: 'dist'
      file: 'bundle.js'
    },
    plugins: [
      {
        name: 'patch-path-imports',
        transform(code) {
          return code.replace(
            /import\s*\{([^}]*)(win32|posix)([^}]*)\}\s*from\s*['"]path['"]/g,
            'import { $1 } from "path"'
          )
        }
      }
    ],
    platform: 'node',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
}

