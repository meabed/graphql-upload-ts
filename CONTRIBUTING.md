# Contributing

Pull requests are welcome. Please include tests with behavior changes whenever possible.

## Development Setup

### Requirements

- Node.js >= 16 or Bun >= 1.3.13
- npm 7+, Yarn 1.x, or Bun

### Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

## Local Checks

### Jest and Node.js

```bash
npm test
npm run build
npm run lint
npm run format
npm run typecheck
npm run validate
```

### Bun

```bash
bun run test:bun
bun run build
bun run lint
bun run format
bun run typecheck
bun run validate:bun
```

## Examples

The example apps have their own package manifests under `examples/apollo` and `examples/express`.

```bash
cd examples/apollo
bun install
bun run start
```

```bash
cd examples/express
bun install
bun run start:graphql-http
```

## Branching

- Open pull requests against `develop`.
- Avoid opening pull requests directly against `master`.
- Use a descriptive branch name such as `feature/file-upload-validation` or `42-fix-bun-tests`.

## Releases

- Run `yarn changeset` for release-relevant changes to `src/` or published package metadata.
- `develop` produces beta prerelease version PRs and publishes to the `beta` dist-tag.
- `master` produces stable version PRs and publishes to the `latest` dist-tag.
