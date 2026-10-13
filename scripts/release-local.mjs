#!/usr/bin/env bun
/**
 * Local release helper: stamp version → build → publish to npm.
 * For when CI is unavailable or you want to ship a one-off (e.g. an
 * `alpha` / `beta` not yet wired into `release.yml`, or a hotfix
 * while GitHub Actions is down).
 *
 * Usage:
 *   bun run release:local <version> [--dry-run] [--tag <dist-tag>]
 *
 * Examples:
 *   bun run release:local 2.3.0 --dry-run
 *   bun run release:local 2.3.0
 *   bun run release:local 2.4.0-beta.1 --tag beta
 *
 * Prerequisites (one-time):
 *   1. `npm whoami`  — must show your npm user.
 *   2. `npm login`   — if (1) failed.
 *
 * Provenance:
 *   `publishConfig.provenance: true` in package.json keeps sigstore
 *   provenance enabled for CI (which has the OIDC `id-token` permission).
 *   This script overrides it with `--provenance=false` because npm rejects
 *   provenance outside supported CI environments. CI keeps publishing
 *   with provenance unchanged.
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const version = args.find((a) => !a.startsWith("--") && a !== process.argv[1]);
const dryRun = args.includes("--dry-run");
const tagIdx = args.indexOf("--tag");
const distTag = tagIdx >= 0 ? args[tagIdx + 1] : null;

if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error("usage: bun run release:local <semver> [--dry-run] [--tag <dist-tag>]");
  console.error(`got: ${process.argv.slice(2).join(" ")}`);
  process.exit(1);
}

function run(cmd, runArgs, opts = {}) {
  console.log(`\n→ ${cmd} ${runArgs.join(" ")}`);
  const result = spawnSync(cmd, runArgs, { stdio: "inherit", cwd: opts.cwd ?? ROOT });
  if (result.status !== 0) {
    console.error(`\n✗ ${cmd} ${runArgs.join(" ")} exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

// Sanity-check npm auth before doing real work.
if (!dryRun) {
  const who = spawnSync("npm", ["whoami"], { stdio: "pipe" });
  if (who.status !== 0) {
    console.error("✗ `npm whoami` failed — run `npm login` first.");
    process.exit(1);
  }
  console.log(`✓ npm user: ${who.stdout.toString().trim()}`);
}

console.log(`\n=== Local release: v${version}${dryRun ? " (dry run)" : ""}${distTag ? ` [tag=${distTag}]` : ""} ===`);

// 1. Stamp version into package.json so the build + publish carry it.
run("bun", ["run", "scripts/stamp-version.mjs", version]);

// 2. Build (rollup → dist/).
run("bun", ["run", "build"]);

// 3. Publish from the repo root. Provenance must be disabled here — it
//    only works in supported CI environments with an OIDC id-token.
const publishArgs = ["publish", "--access", "public", "--provenance=false"];
if (dryRun) publishArgs.push("--dry-run");
if (distTag) publishArgs.push("--tag", distTag);
run("npm", publishArgs);

if (dryRun) {
  console.log(`\n✓ Dry-run complete. Re-run without --dry-run to publish.`);
} else {
  console.log(`\n✓ Released v${version}.`);
  console.log(`  Don't forget to:`);
  console.log(`    git add package.json && git commit -m "chore(release): v${version}"`);
  console.log(`    git tag v${version} && git push --follow-tags`);
}
