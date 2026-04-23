import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptDir, '..', '..');

export function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
}

export function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    ...options,
  }).trim();
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function readPreState() {
  const preStatePath = path.join(repoRoot, '.changeset', 'pre.json');

  if (!existsSync(preStatePath)) {
    return null;
  }

  return readJson(preStatePath);
}

export function getPackageInfo() {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJson = readJson(packageJsonPath);

  return {
    dir: repoRoot,
    name: packageJson.name,
    version: packageJson.version,
  };
}

export function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').toLowerCase());
}

export function logStep(message) {
  console.log(`\n==> ${message}`);
}

export function validateReleaseChannel(channel) {
  if (!channel || /\s/.test(channel)) {
    throw new Error(`Invalid release channel: ${channel}`);
  }

  return channel;
}

export function getReleaseChannel() {
  const explicitChannel = process.env.RELEASE_CHANNEL;

  if (explicitChannel) {
    return validateReleaseChannel(explicitChannel);
  }

  const branchName = process.env.GITHUB_REF_NAME || process.env.CI_REF_NAME || process.env.BRANCH || '';

  return branchName === 'develop' ? 'beta' : 'latest';
}

export function isVersionPublished(packageName, version) {
  const result = spawnSync('npm', ['view', `${packageName}@${version}`, 'version', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  if (result.status !== 0) {
    return false;
  }

  const output = result.stdout.trim();

  if (!output) {
    return false;
  }

  try {
    const parsed = JSON.parse(output);

    return parsed === version || (Array.isArray(parsed) && parsed.includes(version));
  } catch {
    return output.replaceAll('"', '') === version;
  }
}

export function publishPackage(packageInfo, channel) {
  const args = ['publish', '--access', 'public'];

  if (channel) {
    args.push('--tag', channel);
  }

  run('npm', args, { cwd: packageInfo.dir });
}

export function addDistTag(packageInfo, channel) {
  run('npm', ['dist-tag', 'add', `${packageInfo.name}@${packageInfo.version}`, channel]);
}

export function removeDistTag(packageInfo, channel) {
  const result = spawnSync('npm', ['dist-tag', 'rm', packageInfo.name, channel], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  if (result.status === 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return;
  }

  const stderr = result.stderr.trim();
  if (stderr.includes('is not a dist-tag')) {
    console.log(`No ${channel} dist-tag found for ${packageInfo.name}, skipping.`);
    return;
  }

  throw new Error(stderr || `Failed to remove ${channel} dist-tag from ${packageInfo.name}`);
}
