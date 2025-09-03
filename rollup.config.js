const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

// External dependencies that shouldn't be bundled
const external = [
  'busboy',
  'http-errors',
  'object-path',
  'graphql',
  'node:fs',
  'node:path',
  'node:stream',
  'node:util',
  'node:events',
  'node:http',
  'node:https',
  'node:crypto',
  'node:buffer',
  'node:assert',
  'node:url',
  'node:querystring',
  'node:zlib',
  'node:child_process',
  'node:os',
  'node:process',
  'fs',
  'path',
  'stream',
  'util',
  'events',
  'http',
  'https',
  'crypto',
  'buffer',
  'assert',
  'url',
  'querystring',
  'zlib',
  'child_process',
  'os',
  'process',
];

// List of all entry points
const entries = [
  'index',
  'fs-capacitor',
  'graphql-upload',
  'graphql-upload-express',
  'graphql-upload-koa',
  'ignore-stream',
  'process-request',
  'upload',
  'upload-errors',
  'validation',
];

// Create configurations for all modules
const configs = [];

// Generate both CommonJS and ESM builds for each entry
entries.forEach((name) => {
  // CommonJS build
  configs.push({
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.js`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        extensions: ['.ts', '.js'],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        sourceMap: true,
      }),
    ],
  });

  // ESM build
  configs.push({
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.mjs`,
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        extensions: ['.ts', '.js'],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        sourceMap: true,
      }),
    ],
  });
});

module.exports = configs;
