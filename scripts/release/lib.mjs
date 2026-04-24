import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const npmRegistry = 'https://registry.npmjs.org/';
const releaseBranchChannels = new Map([
  ['develop', 'beta'],
  ['master', 'latest'],
]);

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

export function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

export function getPackageJsonPath() {
  return path.join(repoRoot, 'package.json');
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

export function getCurrentBranchName() {
  const envBranch = process.env.GITHUB_REF_NAME || process.env.CI_REF_NAME || process.env.BRANCH;

  if (envBranch) {
    return envBranch;
  }

  return capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export function getReleaseChannelForBranch(branchName) {
  const channel = releaseBranchChannels.get(branchName);

  if (!channel) {
    throw new Error(
      `Unsupported release branch "${branchName}". Releases are only allowed from develop -> beta and master -> latest.`
    );
  }

  return channel;
}

export function getReleaseChannel() {
  const explicitChannel = process.env.RELEASE_CHANNEL;

  if (explicitChannel) {
    return validateReleaseChannel(explicitChannel);
  }

  return getReleaseChannelForBranch(getCurrentBranchName());
}

export function assertReleaseBranch(expectedBranch) {
  const branchName = getCurrentBranchName();

  if (branchName !== expectedBranch) {
    throw new Error(
      `This release command must run on "${expectedBranch}", but the current branch is "${branchName}".`
    );
  }

  return branchName;
}

export function getPublishedDistTags(packageName) {
  const result = spawnSync(
    'npm',
    ['view', packageName, 'dist-tags', '--json', '--registry', npmRegistry],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

  if (result.status !== 0) {
    return null;
  }

  const output = result.stdout.trim();

  if (!output) {
    return null;
  }

  return JSON.parse(output);
}

export function getPublishedTagVersion(packageName, tag) {
  const distTags = getPublishedDistTags(packageName);
  const version = distTags?.[tag];

  return typeof version === 'string' ? version : null;
}

export function syncPackageVersionToPublishedLatest() {
  const packageInfo = getPackageInfo();
  const publishedLatestVersion = getPublishedTagVersion(packageInfo.name, 'latest');

  if (!publishedLatestVersion) {
    logStep('No npm latest dist-tag found, using repository package version as the base.');
    return null;
  }

  if (packageInfo.version === publishedLatestVersion) {
    logStep(`Using npm latest ${publishedLatestVersion} as the release base.`);
    return publishedLatestVersion;
  }

  logStep(
    `Syncing package.json version from ${packageInfo.version} to npm latest ${publishedLatestVersion}.`
  );

  const packageJsonPath = getPackageJsonPath();
  const packageJson = readJson(packageJsonPath);
  packageJson.version = publishedLatestVersion;
  writeJson(packageJsonPath, packageJson);

  return publishedLatestVersion;
}

export function prepareVersionForCurrentBranch() {
  const branchName = getCurrentBranchName();
  const channel = getReleaseChannelForBranch(branchName);
  const preState = readPreState();

  if (channel === 'beta') {
    if (!preState?.mode) {
      syncPackageVersionToPublishedLatest();
    }

    if (preState?.mode === 'pre' && preState.tag === 'beta') {
      logStep('Prerelease mode already enabled for beta');
    } else if (preState?.mode) {
      throw new Error(
        `Cannot enter beta prerelease mode from pre.json state "${preState.mode}". Finish or clear the existing prerelease state first.`
      );
    } else {
      logStep('Entering beta prerelease mode');
      run('yarn', ['changeset', 'pre', 'enter', 'beta']);
    }

    logStep('Versioning package for beta');
    run('yarn', ['changeset', 'version']);
    return;
  }

  syncPackageVersionToPublishedLatest();

  if (preState?.mode === 'pre') {
    logStep(`Exiting prerelease mode${preState.tag ? ` (${preState.tag})` : ''}`);
    run('yarn', ['changeset', 'pre', 'exit']);
  } else if (preState?.mode && preState.mode !== 'exit') {
    throw new Error(`Unsupported pre.json mode "${preState.mode}"`);
  }

  logStep('Versioning package for stable release');
  run('yarn', ['changeset', 'version']);
}

export function isVersionPublished(packageName, version) {
  const result = spawnSync(
    'npm',
    ['view', `${packageName}@${version}`, 'version', '--json', '--registry', npmRegistry],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

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
  const args = ['publish', '--access', 'public', '--registry', npmRegistry];

  if (channel) {
    args.push('--tag', channel);
  }

  run('npm', args, { cwd: packageInfo.dir });
}

export function addDistTag(packageInfo, channel) {
  run('npm', [
    'dist-tag',
    'add',
    `${packageInfo.name}@${packageInfo.version}`,
    channel,
    '--registry',
    npmRegistry,
  ]);
}

export function removeDistTag(packageInfo, channel) {
  const result = spawnSync(
    'npm',
    ['dist-tag', 'rm', packageInfo.name, channel, '--registry', npmRegistry],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

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
