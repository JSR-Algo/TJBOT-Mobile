// Runs only in a native Node child: Jest replaces module.createRequire.
const { appendFileSync, readFileSync, realpathSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');

const backendRoot = resolve(process.argv[2]);
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');

try {
  const backendRequire = createRequire(join(backendRoot, 'package.json'));
  const backendPackage = backendRequire('./package.json');
  if (backendPackage.dependencies?.['@tbot/contracts'] !== 'file:./vendor/contracts') {
    throw new Error('Backend must declare @tbot/contracts from file:./vendor/contracts');
  }
  const root = join(backendRoot, 'vendor/contracts');
  const nativeRequire = createRequire(join(root, 'package.json'));
  const pkg = nativeRequire('./package.json');
  if (pkg.name !== '@tbot/contracts' || pkg.version !== '1.1.0') {
    throw new Error('Expected canonical @tbot/contracts 1.1.0');
  }
  const origins = ['package.json', 'robot-state.js', 'expression.js', 'motion.js', 'realtime-events.js'].map(name => {
    const file = realpathSync(join(root, name));
    const installed = realpathSync(backendRequire.resolve('@tbot/contracts/' + name));
    if (hash(file) !== hash(installed)) {
      throw new Error('Canonical vendor/installed package mismatch: ' + name);
    }
    return { file, installed, sha256: hash(file) };
  });
  const robotState = nativeRequire('./robot-state.js');
  const expression = nativeRequire('./expression.js');
  const motion = nativeRequire('./motion.js');
  const realtime = nativeRequire('./realtime-events.js');
  const zodPackagePath = nativeRequire.resolve('zod/package.json');
  const zodPackage = nativeRequire('zod/package.json');
  const request = JSON.parse(readFileSync(0, 'utf8'));
  let data;
  if (request.operation === 'snapshot') {
    const states = request.states;
    if (!Array.isArray(states) || !states.every(state => typeof state === 'string')) {
      throw new Error('Snapshot requires the parity test state domain');
    }
    data = {
      robotState: {
        RobotInteractionState: robotState.RobotInteractionState,
        ALL_STATES: robotState.ALL_STATES,
        FORWARD_EDGES: robotState.FORWARD_EDGES,
        UNIVERSAL_TARGETS: robotState.UNIVERSAL_TARGETS,
        transitions: Object.fromEntries(states.map(from => [
          from, Object.fromEntries(states.map(to => [to, robotState.isValidTransition(from, to)])),
        ])),
        targets: Object.fromEntries(states.map(from => [from, robotState.legalTargets(from)])),
      },
      expression, motion,
      realtime: { RealtimeEventType: realtime.RealtimeEventType, ALL_EVENT_TYPES: realtime.ALL_EVENT_TYPES },
    };
  } else if (request.operation === 'createExpression') {
    data = realtime.createExpression(request.args);
  } else {
    throw new Error('Unsupported canonical bridge operation');
  }
  const provenance = {
    backendRoot, package: { name: pkg.name, version: pkg.version }, origins,
    zod: { file: zodPackagePath, version: zodPackage.version, sha256: hash(zodPackagePath) },
    loadedFiles: Object.keys(require.cache).filter(file => file !== __filename).map(file => ({
      file: realpathSync(file), sha256: hash(file),
    })),
    node: { executable: process.execPath, version: process.version },
    operation: request.operation, statePairs: request.operation === 'snapshot' ? request.states.length ** 2 : 0,
  };
  if (process.env.TBOT_CANONICAL_ORIGINS_PATH) {
    appendFileSync(process.env.TBOT_CANONICAL_ORIGINS_PATH, JSON.stringify(provenance) + '\n');
  }
  process.stdout.write(JSON.stringify(data));
} catch (error) {
  console.error('Canonical parity failed for TBOT_BACKEND_DIR=' + backendRoot +
    '. Select the verified backend with vendor/contracts and its existing dependencies.');
  console.error(error);
  process.exitCode = 1;
}
