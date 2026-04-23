import process from 'node:process';

import { capture, logStep } from './lib.mjs';

const releaseBranchPrefix = 'changeset-release/';
const baseRef = process.env.GITHUB_BASE_REF || process.env.BASE_REF || 'master';
const headRef = process.env.GITHUB_HEAD_REF || process.env.HEAD_REF || '';

function isReleaseRelevantFile(filePath) {
  if (/^src\//.test(filePath)) {
    if (/(^|\/)__tests__\//.test(filePath)) {
      return false;
    }

    return !/\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath);
  }

  return ['package.json', 'rollup.config.js', 'tsconfig.json', '.npmignore'].includes(filePath);
}

function getChangedFiles() {
  const injectedFiles = process.env.CHANGED_FILES;

  if (injectedFiles) {
    return injectedFiles
      .split('\n')
      .map((file) => file.trim())
      .filter(Boolean);
  }

  const diff = capture('git', ['diff', '--name-only', '--diff-filter=ACMR', `origin/${baseRef}...HEAD`]);

  return diff
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

if (headRef.startsWith(releaseBranchPrefix)) {
  logStep(`Skipping changeset check for release branch ${headRef}`);
  process.exit(0);
}

const changedFiles = getChangedFiles();
const releaseRelevantFiles = changedFiles.filter(isReleaseRelevantFile);
const hasChangeset = changedFiles.some(
  (file) => /^\.changeset\/(?!README\.md$|config\.json$).+\.md$/.test(file)
);

if (releaseRelevantFiles.length === 0) {
  logStep('No release-relevant package changes detected');
  process.exit(0);
}

if (hasChangeset) {
  logStep('Changeset found for release-relevant package changes');
  process.exit(0);
}

console.error('A changeset is required for release-relevant package changes.');
console.error('Run `yarn changeset` and commit the generated .changeset/*.md file.');
console.error('Docs-only and test-only changes are already excluded from this check.');
process.exit(1);
