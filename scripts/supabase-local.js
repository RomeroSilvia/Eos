const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const supabaseBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'supabase.cmd' : 'supabase'
);

const result = spawnSync(supabaseBin, process.argv.slice(2), {
  cwd: rootDir,
  env: {
    ...process.env,
    HOME: rootDir,
    USERPROFILE: rootDir
  },
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
