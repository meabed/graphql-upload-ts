/** @type {import("ts-jest/dist/types").InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testMatch: ['**/__tests__/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
