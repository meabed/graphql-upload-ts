import { logStep, readPreState, run } from './lib.mjs';

const preState = readPreState();

if (preState?.mode === 'pre') {
  logStep(`Exiting prerelease mode${preState.tag ? ` (${preState.tag})` : ''}`);
  run('yarn', ['changeset', 'pre', 'exit']);
} else if (preState?.mode && preState.mode !== 'exit') {
  throw new Error(`Unsupported pre.json mode "${preState.mode}"`);
}

logStep('Versioning package for stable release');
run('yarn', ['changeset', 'version']);
