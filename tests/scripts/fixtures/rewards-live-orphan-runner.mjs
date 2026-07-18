import { readFile } from 'fs/promises';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { createProcessLifecycle } from '../../../scripts/_lib/rewards-live-process-lifecycle.mjs';

const evidencePath = process.argv[2];
const lifecycle = createProcessLifecycle({
  cleanupTimeoutMs: 200,
  cleanupContainer: async () => undefined,
});
lifecycle.installSignalHandlers();

const leader = lifecycle.spawnTracked(process.execPath, [
  '-e',
  [
    "const {spawn}=require('child_process')",
    "spawn(process.execPath,['-e',\"const fs=require('fs'); process.on('SIGTERM',()=>{}); fs.writeFileSync(process.argv[1],String(process.pid)); setInterval(()=>{},1000)\",process.argv[1]],{stdio:'ignore'})",
    "process.on('SIGTERM',()=>process.exit(0))",
    "setInterval(()=>{},1000)",
  ].join(';'),
  evidencePath,
]);

let grandchildPid;
while (grandchildPid === undefined) {
  try {
    grandchildPid = Number(await readFile(evidencePath, 'utf8'));
  } catch {
    await sleep(10);
  }
}
process.stdout.write(`${JSON.stringify({ leaderPid: leader.pid, grandchildPid })}\n`);
await new Promise(() => undefined);
