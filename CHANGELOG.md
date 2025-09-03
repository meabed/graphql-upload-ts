# Changelog

## [2.2.0](https://github.com/meabed/graphql-upload-ts/compare/v2.1.2...v2.2.0) (2025-01-03)

### Features
- Add comprehensive error handling with custom error classes and error codes
- Add file validation utilities (MIME type, file extension, filename sanitization)
- Add dual module support (CommonJS and ESM)
- Improve TypeScript support with strict mode enabled
- Add extensive test coverage (91%+ coverage with 119 tests)

### Improvements
- Migrate from ESLint/Prettier to Biome for unified tooling
- Update TypeScript target from ES5 to ES2020
- Replace all `any` types with proper type inference
- Use optional chaining (`?.`) instead of non-null assertions (`!`)
- Improve Express middleware to properly wait for request completion
- Update all dependencies to latest versions

### Documentation
- Complete README rewrite with comprehensive examples
- Add manual schema construction examples with GraphQL.js
- Add complete examples for Apollo Server v4, Koa, GraphQL Yoga, and NestJS
- Add detailed image upload example with validation and S3 integration
- Add security and validation documentation
- Add migration guide from graphql-upload

### Developer Experience
- Remove Mocha, use Jest exclusively for testing
- Add separate tsconfig files for different build targets
- Improve build process for better performance
- Add comprehensive type definitions

### [2.1.2](https://github.com/meabed/graphql-upload-ts/compare/v2.1.1...v2.1.2) (2024-02-23)
- Update package export to export fs-capacitor

### [2.1.1](https://github.com/meabed/graphql-upload-ts/compare/v2.1.0...v2.1.1) (2024-02-23)
- rework file upload stream handling to fix multiple file upload and filesize issues 
- Improve readme and add more information about using `overrideSendResponse`
- Make overrideSendResponse default to `false` if processRequest is not provided
- Added more examples in /examples folder
- Update types and tests
- Update packages

### [2.1.0](https://github.com/meabed/graphql-upload-ts/compare/v2.0.9...v2.1.0) (2023-08-08)

- Feat: add overrideSendResponse to optionally disable override send response in express - thank you ([@Gherciu](https://github.com/Gherciu) for the [PR](https://github.com/meabed/graphql-upload-ts/pull/173))
- Update packages


### [2.0.9](https://github.com/meabed/graphql-upload-ts/compare/v2.0.5...v2.0.9) (2023-07-19)

- Update packages

### [2.0.5](https://github.com/meabed/graphql-upload-ts/compare/v2.0.2...v2.0.5) (2022-12-25)

- Fix release script
- Update packages
- Update package.json exports

### [2.0.2](https://github.com/meabed/graphql-upload-ts/compare/v2.0.0...v2.0.2) (2022-07-24)

- Fix release content

### [2.0.1](https://github.com/meabed/graphql-upload-ts/compare/v1.5.1...v2.0.1) (2022-07-24)

- Rewrite the codebase to typescript.
- Initial release of the new version.