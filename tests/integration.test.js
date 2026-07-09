const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Building project...');
  const build = spawn('npm', ['run', 'build'], { cwd: __dirname, stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    build.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Build failed: ${code}`)));
  });

  console.log('Starting production server...');
  const projectRoot = path.join(__dirname, '..');
  const server = spawn(process.execPath, ['dist/server/src/index.js'], {
    cwd: path.join(projectRoot, 'server'),
    env: { ...process.env, CLIENT_DIST_PATH: '../client/dist', PORT: '3999' },
    stdio: 'pipe'
  });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const health = await request('http://localhost:3999/health');
    console.assert(health.status === 200, `Health check failed: ${health.status}`);
    console.assert(health.data.includes('ok'), 'Health check missing ok status');
    console.log('✓ Health check passed');

    const index = await request('http://localhost:3999/');
    console.assert(index.status === 200, `Index failed: ${index.status}`);
    console.assert(index.data.includes('<!doctype html>'), 'Index missing HTML doctype');
    console.log('✓ Static index passed');

    const asset = await request('http://localhost:3999/assets/index-jH53101e.css');
    console.assert(asset.status === 200, `Asset failed: ${asset.status}`);
    console.log('✓ Static asset passed');

    console.log('\nAll integration tests passed.');
  } finally {
    server.kill();
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
