import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Starting Studix Full-Stack Environment');
console.log('\x1b[36m%s\x1b[0m', '  - Backend:  http://localhost:4000');
console.log('\x1b[36m%s\x1b[0m', '  - Frontend: http://localhost:5173');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════\n');

// 1. Start Backend Server
const server = spawn(process.execPath, ['--watch', 'index.js'], {
  cwd: path.resolve(__dirname, 'server'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
});

// 2. Start Frontend Vite Client
const viteBin = path.resolve(__dirname, 'client/node_modules/vite/bin/vite.js');
const client = spawn(process.execPath, [viteBin], {
  cwd: path.resolve(__dirname, 'client'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Stopping Studix development servers...');
  try { server.kill(); } catch (_) {}
  try { client.kill(); } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
server.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`[Server exited with code ${code}]`);
});
client.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`[Client exited with code ${code}]`);
});
