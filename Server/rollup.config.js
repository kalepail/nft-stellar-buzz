import { nodeResolve } from '@rollup/plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';

const config = defineConfig({
  input: 'src/index.js',
  output: {
    file: 'dist/index.mjs',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    builtins(),
    nodeResolve({
      browser: true,
      preferBuiltins: true
    }),
    globals(),
  ],
});

export default config;