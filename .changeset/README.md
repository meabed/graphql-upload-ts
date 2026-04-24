# Changesets

Run `yarn changeset` whenever you make a release-relevant change to the published package.

- Releases are only allowed from `develop` and `master`.
- `develop` versions and publishes directly to the `beta` dist-tag.
- `master` versions and publishes directly to the `latest` dist-tag.
- npm's `latest` dist-tag is used as the stable base version before release increments are calculated.
- The release workflow does not open release PRs; it commits release version updates back to the triggering branch.
