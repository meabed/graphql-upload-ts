import { defineConfig } from 'rolldown';

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

// Create configs for both CJS and ESM
const configs = [];

// CommonJS configuration - single build with multiple entries
configs.push(
  defineConfig({
    input: entries.reduce((acc, name) => {
      acc[name] = `src/${name}.ts`;
      return acc;
    }, {}),
    output: {
      dir: 'dist',
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      exports: 'named',
    },
    external,
    resolve: {
      extensions: ['.ts', '.js', '.json'],
    },
    platform: 'node',
    treeshake: {
      moduleSideEffects: false,
    },
  })
);

// ESM configuration - single build with multiple entries
configs.push(
  defineConfig({
    input: entries.reduce((acc, name) => {
      acc[name] = `src/${name}.ts`;
      return acc;
    }, {}),
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
    },
    external,
    resolve: {
      extensions: ['.ts', '.js', '.json'],
    },
    platform: 'node',
    treeshake: {
      moduleSideEffects: false,
    },
  })
);

export default configs;
