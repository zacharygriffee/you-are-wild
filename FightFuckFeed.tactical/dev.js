#!/usr/bin/env node
/**
 * Starts the build watcher and static server as one managed dev process.
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PORT = process.env.PORT || '3000';
const children = [];

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  children.push(child);
  child.on('exit', code => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`${command} exited with status ${code}`);
      shutdown(code);
    }
  });

  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start(process.execPath, ['build.js', '--watch']);
start('npx', ['--yes', 'serve', ROOT_DIR, '-p', PORT]);

console.log(`Dev server starting at http://localhost:${PORT}`);
