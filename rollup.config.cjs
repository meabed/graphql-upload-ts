const { readFileSync } = require('fs');
const esbuild = require('rollup-plugin-esbuild').default;
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Public entry points — each gets a CJS (.js) and ESM (.mjs) bundle. Mirrors
// the `exports` map in package.json; keep the two in sync when adding/removing
// a public sub-path.
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

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
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

const codePlugins = () => [
  json({ compact: true, preferConst: true }),
  resolve({ preferBuiltins: true, extensions: ['.ts', '.js'] }),
  commonjs(),
  esbuild({
    target: 'es2020',
    tsconfig: './tsconfig.json',
    sourceMap: true,
  }),
];

// Single declaration pass for the whole src tree — emitted alongside the
// bundles so each public entry has its matching `.d.ts`.
const declarationConfig = {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
  external,
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      emitDeclarationOnly: true,
      rootDir: './src',
      exclude: ['**/*.test.ts', '**/*.spec.ts', '__tests__/**/*'],
      compilerOptions: {
        module: 'esnext',
      },
    }),
  ],
};

const bundles = entries.flatMap((name) => [
  {
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.js`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: codePlugins(),
  },
  {
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.mjs`,
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: codePlugins(),
  },
]);

module.exports = [...bundles, declarationConfig];
