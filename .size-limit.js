module.exports = [
  {
    name: 'ESM build',
    path: 'dist/index.mjs',
    limit: '20 KB',
    webpack: false,
    running: false,
    gzip: true,
  },
  {
    name: 'CJS build',
    path: 'dist/index.js',
    limit: '20 KB',
    webpack: false,
    running: false,
    gzip: true,
  },
];
