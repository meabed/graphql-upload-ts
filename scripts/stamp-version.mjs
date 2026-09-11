#!/usr/bin/env bun
/**
 * Stamp a version into root package.json before `bun run build` /
 * `npm publish` runs. Used by the local release helper so the published
 * tarball carries the exact version requested on the command line.
 *
 * Usage: bun run scripts/stamp-version.mjs <semver>
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`stamp-version: invalid version arg "${version}"`);
  process.exit(1);
}

const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
pkg.version = version;
await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`✓ stamped version ${version} into package.json`);
