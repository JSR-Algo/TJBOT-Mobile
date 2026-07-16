import { spawn } from 'node:child_process';

const descendant = spawn(process.execPath, [
  '-e',
  "process.on('SIGTERM',()=>{}); process.stdout.write('ready\\n'); setInterval(()=>{},1000)",
], { stdio: ['ignore', 'pipe', 'ignore'] });

descendant.stdout.once('data', () => {
  process.stdout.write(`${JSON.stringify({ descendantPid: descendant.pid })}\n`);
});
process.on('SIGTERM', () => process.exit(0));
await new Promise(() => undefined);
