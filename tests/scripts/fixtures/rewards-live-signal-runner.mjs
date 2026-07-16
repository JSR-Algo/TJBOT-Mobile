import { appendFile } from 'fs/promises';
import { createProcessLifecycle } from '../../../scripts/_lib/rewards-live-process-lifecycle.mjs';

const evidencePath = process.argv[2];
const lifecycle = createProcessLifecycle({
  cleanupTimeoutMs: 200,
  cleanupContainer: async () => {
    await appendFile(evidencePath, 'container-cleanup\n');
  },
});
lifecycle.installSignalHandlers();

const child = lifecycle.spawnTracked(process.execPath, [
  '-e',
  "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)",
]);
process.stdout.write(`${JSON.stringify({ childPid: child.pid })}\n`);
await new Promise(() => undefined);
