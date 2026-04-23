import process from 'node:process';

import {
  addDistTag,
  getPackageInfo,
  getReleaseChannel,
  isTruthy,
  isVersionPublished,
  logStep,
  publishPackage,
  removeDistTag,
} from './lib.mjs';

const channel = getReleaseChannel();
const dryRun = isTruthy(process.env.RELEASE_DRY_RUN);
const repairTags = isTruthy(process.env.RELEASE_TAG_REPAIR);
const cleanupLegacyTags = isTruthy(process.env.RELEASE_CLEANUP_LEGACY_TAGS);
const packageInfo = getPackageInfo();

logStep(`Preparing npm publish for channel "${channel}"${dryRun ? ' (dry run)' : ''}`);

const published = isVersionPublished(packageInfo.name, packageInfo.version);

if (published) {
  console.log(`${packageInfo.name}@${packageInfo.version} is already published.`);
} else if (dryRun) {
  console.log(`[dry-run] Would publish ${packageInfo.name}@${packageInfo.version} to ${channel}.`);
} else {
  publishPackage(packageInfo, channel);
}

if (repairTags) {
  if (dryRun) {
    console.log(
      `[dry-run] Would ensure dist-tag "${channel}" points to ${packageInfo.name}@${packageInfo.version}.`
    );
  } else {
    addDistTag(packageInfo, channel);
  }
}

if (cleanupLegacyTags) {
  logStep('Cleaning up legacy dist-tags');

  if (dryRun) {
    console.log(`[dry-run] Would remove dist-tag "develop" from ${packageInfo.name}.`);
  } else {
    removeDistTag(packageInfo, 'develop');
  }
}
