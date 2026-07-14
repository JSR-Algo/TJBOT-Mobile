import { appendFile, readFile } from 'fs/promises';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
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
  "const fs=require('fs'); fs.writeFileSync(process.argv[1], 'ready'); process.on('SIGINT',()=>{}); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)",
  `${evidencePath}.child-ready`,
]);
while (true) {
  try {
    await readFile(`${evidencePath}.child-ready`);
    break;
  } catch {
    await sleep(10);
  }
}
process.stdout.write(`${JSON.stringify({ childPid: child.pid })}\n`);
await new Promise(() => undefined);
