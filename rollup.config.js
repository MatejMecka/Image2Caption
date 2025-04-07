import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/background.js',
  output: {
    file: 'dist/background.js',
    format: 'iife'
  },
  plugins: [resolve(), commonjs(), terser(), copy({
    targets: [
      { src: 'public/manifest.json', dest: 'dist' },
      { src: 'public/icons', dest: 'dist' }
    ]
  }),
]
};
