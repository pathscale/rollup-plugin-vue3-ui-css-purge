import { defineConfig } from 'rolldown';

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: 'bundle.js',
  },
});

