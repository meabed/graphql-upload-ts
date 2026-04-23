import { logStep, readPreState, run } from './lib.mjs';

const preState = readPreState();

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
