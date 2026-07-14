import { createProcessLifecycle } from '../../../scripts/_lib/rewards-live-process-lifecycle.mjs';

const lifecycle = createProcessLifecycle({
  cleanupContainer: async () => undefined,
  cleanupTimeoutMs: 5_000,
});

lifecycle.spawnTracked(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
await lifecycle.cleanup();
process.stdout.write('cleanup-complete\n');
