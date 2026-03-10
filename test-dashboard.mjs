#!/usr/bin/env node
/**
 * Test Dashboard — A lightweight web UI to run tests and view reports.
 *
 * Usage:  node test-dashboard.mjs
 * Opens:  http://localhost:4400
 */

import { createServer } from 'http';
import { spawn } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const PORT = 4400;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Track running processes
const runningJobs = new Map(); // id -> { process, output, status, startTime }
let jobCounter = 0;

// MIME types for serving report files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.zip': 'application/zip',
};

// Test suite definitions
const TEST_SUITES = [
  {
    id: 'unit',
    name: 'Unit Tests',
    description: 'Vitest — validation schemas & storage cleanup',
    command: 'npx',
    args: ['vitest', 'run', '--reporter=verbose'],
    reportDir: null,
    env: 'local',
    icon: '🧪',
    testCount: 18,
  },
  {
    id: 'e2e-local',
    name: 'Local E2E',
    description: 'Playwright — full app against localhost dev server',
    command: 'npx',
    args: ['playwright', 'test', '--config', 'playwright.local.config.ts'],
    reportDir: 'playwright-report/local',
    env: 'local',
    icon: '🖥️',
    testCount: 91,
  },
  {
    id: 'e2e-rfs',
    name: 'RFS E2E',
    description: 'Playwright — all tests against RFS staging site',
    command: 'npx',
    args: ['playwright', 'test', '--config', 'playwright.config.ts'],
    reportDir: 'playwright-report/rfs',
    env: 'rfs',
    envVars: { E2E_TARGET: 'rfs' },
    icon: '🚀',
    testCount: 59,
  },
  {
    id: 'e2e-prod',
    name: 'Production E2E',
    description: 'Playwright — read-only smoke tests against production',
    command: 'npx',
    args: ['playwright', 'test', '--config', 'playwright.config.ts', '--grep-invert', 'rfs-crud'],
    reportDir: 'playwright-report/prod',
    env: 'prod',
    envVars: { E2E_TARGET: 'prod' },
    icon: '🌐',
    testCount: 52,
  },
];

function startTestRun(suiteId) {
  const suite = TEST_SUITES.find(s => s.id === suiteId);
  if (!suite) return { error: 'Unknown suite' };

  // Check if already running
  for (const [id, job] of runningJobs) {
    if (job.suiteId === suiteId && job.status === 'running') {
      return { error: 'Already running', jobId: id };
    }
  }

  const jobId = ++jobCounter;
  const env = { ...process.env, ...(suite.envVars || {}), FORCE_COLOR: '0' };

  const proc = spawn(suite.command, suite.args, {
    cwd: __dirname,
    env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const job = {
    id: jobId,
    suiteId,
    suiteName: suite.name,
    process: proc,
    output: '',
    status: 'running',
    startTime: Date.now(),
    endTime: null,
    exitCode: null,
  };

  proc.stdout.on('data', (data) => {
    job.output += data.toString();
  });
  proc.stderr.on('data', (data) => {
    job.output += data.toString();
  });
  proc.on('close', (code) => {
    job.status = code === 0 ? 'passed' : 'failed';
    job.exitCode = code;
    job.endTime = Date.now();
  });
  proc.on('error', (err) => {
    job.output += `\nProcess error: ${err.message}`;
    job.status = 'error';
    job.endTime = Date.now();
  });

  runningJobs.set(jobId, job);
  return { jobId, suiteId };
}

function stopJob(jobId) {
  const job = runningJobs.get(jobId);
  if (job && job.status === 'running') {
    job.process.kill('SIGTERM');
    job.status = 'cancelled';
    job.endTime = Date.now();
    return true;
  }
  return false;
}

function getReportInfo(reportDir) {
  if (!reportDir) return null;
  const fullPath = join(__dirname, reportDir);
  const indexPath = join(fullPath, 'index.html');
  if (!existsSync(indexPath)) return null;
  const stat = statSync(indexPath);
  return {
    exists: true,
    lastModified: stat.mtime.toISOString(),
    path: reportDir,
  };
}

function serveReportFile(reportDir, filePath, res) {
  const fullPath = join(__dirname, reportDir, filePath);
  if (!existsSync(fullPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const stat = statSync(fullPath);
  if (stat.isDirectory()) {
    // Try index.html in directory
    const indexPath = join(fullPath, 'index.html');
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(fullPath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(fullPath);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
}

// ─── Dashboard HTML ──────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YogaStudio Test Dashboard</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --border: #475569;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --primary: #3b82f6;
    --primary-hover: #2563eb;
    --green: #22c55e;
    --green-bg: #052e16;
    --red: #ef4444;
    --red-bg: #450a0a;
    --yellow: #eab308;
    --yellow-bg: #422006;
    --orange: #f97316;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header h1 {
    font-size: 20px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header h1 span { font-size: 24px; }
  .header-meta { color: var(--text-muted); font-size: 13px; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

  /* Suite Cards */
  .suites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .suite-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    position: relative;
    transition: border-color 0.2s;
  }
  .suite-card:hover { border-color: var(--primary); }
  .suite-card.running { border-color: var(--yellow); }
  .suite-card.passed { border-color: var(--green); }
  .suite-card.failed { border-color: var(--red); }

  .suite-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .suite-icon { font-size: 28px; }
  .suite-name { font-size: 16px; font-weight: 600; }
  .suite-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 12px; line-height: 1.4; }
  .suite-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .suite-meta .badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
  }
  .badge-local { background: #1e3a5f; color: #60a5fa; }
  .badge-rfs { background: #1e3a1e; color: #86efac; }
  .badge-prod { background: #3b1e1e; color: #fca5a5; }

  .suite-actions { display: flex; gap: 8px; }
  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
  .btn-danger { background: var(--red); color: white; }
  .btn-danger:hover:not(:disabled) { background: #dc2626; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover:not(:disabled) { background: var(--border); }
  .btn-sm { padding: 5px 10px; font-size: 12px; }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 12px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .status-dot.running { background: var(--yellow); animation: pulse 1s infinite; }
  .status-dot.passed { background: var(--green); }
  .status-dot.failed { background: var(--red); }
  .status-dot.idle { background: var(--text-muted); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Output Panel */
  .output-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 24px;
  }
  .output-header {
    padding: 12px 20px;
    background: var(--surface2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
  }
  .output-header h3 { font-size: 14px; font-weight: 600; }
  .output-body {
    padding: 16px;
    max-height: 500px;
    overflow-y: auto;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    color: #cbd5e1;
  }
  .output-body:empty::before {
    content: 'No output yet. Run a test suite to see results here.';
    color: var(--text-muted);
    font-style: italic;
  }

  /* Report Section */
  .reports-section h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
  }
  .report-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .report-card .name { font-weight: 500; font-size: 14px; }
  .report-card .date { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
  .report-card .no-report { color: var(--text-muted); font-size: 13px; font-style: italic; }

  /* Timer */
  .timer { font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: 12px; }

  /* Run All bar */
  .run-all-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .section-title { font-size: 16px; font-weight: 600; }
</style>
</head>
<body>

<div class="header">
  <h1><span>🧘</span> YogaStudio Test Dashboard</h1>
  <div class="header-meta">v1.7.0 &bull; <span id="clock"></span></div>
</div>

<div class="container">
  <!-- Suite Cards -->
  <div class="run-all-bar">
    <div class="section-title">Test Suites</div>
    <button class="btn btn-primary" onclick="runAll()" id="runAllBtn">▶ Run All Local</button>
  </div>
  <div class="suites-grid" id="suitesGrid"></div>

  <!-- Output Panel -->
  <div class="output-panel">
    <div class="output-header">
      <h3 id="outputTitle">Console Output</h3>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="clearOutput()">Clear</button>
        <button class="btn btn-secondary btn-sm" onclick="scrollToBottom()">↓ Bottom</button>
      </div>
    </div>
    <div class="output-body" id="outputBody"></div>
  </div>

  <!-- Reports -->
  <div class="reports-section">
    <h2>📊 Playwright Reports</h2>
    <div class="reports-grid" id="reportsGrid"></div>
  </div>
</div>

<script>
const suites = ${JSON.stringify(TEST_SUITES.map(s => ({ ...s, command: undefined, args: undefined, envVars: undefined })))};
let activeJobId = null;
let pollInterval = null;

// Clock
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// Render suite cards
function renderSuites(jobStates = {}) {
  const grid = document.getElementById('suitesGrid');
  grid.innerHTML = suites.map(suite => {
    const state = jobStates[suite.id] || { status: 'idle' };
    const isRunning = state.status === 'running';
    const statusClass = state.status !== 'idle' ? state.status : '';
    const elapsed = state.startTime ? formatDuration(Date.now() - state.startTime) : '';
    const duration = state.endTime && state.startTime ? formatDuration(state.endTime - state.startTime) : elapsed;

    return \`
      <div class="suite-card \${statusClass}" id="card-\${suite.id}">
        <div class="suite-header">
          <span class="suite-icon">\${suite.icon}</span>
          <span class="suite-name">\${suite.name}</span>
        </div>
        <div class="suite-desc">\${suite.description}</div>
        <div class="suite-meta">
          <span class="badge badge-\${suite.env}">\${suite.env}</span>
          <span>\${suite.testCount} tests</span>
          \${duration ? \`<span class="timer">\${duration}</span>\` : ''}
        </div>
        <div class="status-indicator">
          <span class="status-dot \${state.status || 'idle'}"></span>
          <span>\${capitalize(state.status || 'idle')}</span>
        </div>
        <div class="suite-actions">
          \${isRunning
            ? \`<button class="btn btn-danger btn-sm" onclick="stopSuite('\${suite.id}', \${state.jobId})">⏹ Stop</button>\`
            : \`<button class="btn btn-primary btn-sm" onclick="runSuite('\${suite.id}')">▶ Run</button>\`
          }
          \${suite.reportDir
            ? \`<button class="btn btn-secondary btn-sm" onclick="viewReport('\${suite.reportDir}')" \${!state.reportExists ? 'disabled title="No report yet"' : ''}>📊 Report</button>\`
            : ''
          }
          \${state.jobId ? \`<button class="btn btn-secondary btn-sm" onclick="viewOutput(\${state.jobId})">📋 Output</button>\` : ''}
        </div>
      </div>
    \`;
  }).join('');
}

async function runSuite(suiteId) {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suiteId }),
  });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  activeJobId = data.jobId;
  document.getElementById('outputTitle').textContent = \`Console Output — \${suites.find(s => s.id === suiteId)?.name || suiteId}\`;
  startPolling();
}

async function stopSuite(suiteId, jobId) {
  await fetch('/api/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }),
  });
  refreshState();
}

async function runAll() {
  // Run unit + local E2E (skip remote by default)
  await runSuite('unit');
}

async function viewOutput(jobId) {
  activeJobId = jobId;
  const res = await fetch(\`/api/job/\${jobId}\`);
  const data = await res.json();
  document.getElementById('outputBody').textContent = data.output || '(no output)';
  document.getElementById('outputTitle').textContent = \`Console Output — \${data.suiteName || 'Unknown'}\`;
  scrollToBottom();
}

function viewReport(reportDir) {
  window.open(\`/report/\${reportDir}/index.html\`, '_blank');
}

function clearOutput() {
  document.getElementById('outputBody').textContent = '';
  document.getElementById('outputTitle').textContent = 'Console Output';
}

function scrollToBottom() {
  const el = document.getElementById('outputBody');
  el.scrollTop = el.scrollHeight;
}

function formatDuration(ms) {
  if (ms < 1000) return \`\${ms}ms\`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return \`\${secs}s\`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return \`\${mins}m \${remainSecs}s\`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function refreshState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    renderSuites(data.suites);
    renderReports(data.reports);

    // Update output if we're tracking a job
    if (activeJobId && data.jobs[activeJobId]) {
      document.getElementById('outputBody').textContent = data.jobs[activeJobId].output || '';
      scrollToBottom();

      if (data.jobs[activeJobId].status !== 'running') {
        stopPolling();
      }
    }
  } catch (e) {
    // Server might be down
  }
}

function renderReports(reports) {
  const grid = document.getElementById('reportsGrid');
  const reportEntries = [
    { name: 'Local E2E', dir: 'playwright-report/local' },
    { name: 'RFS E2E', dir: 'playwright-report/rfs' },
    { name: 'Production E2E', dir: 'playwright-report/prod' },
  ];
  grid.innerHTML = reportEntries.map(entry => {
    const info = reports[entry.dir];
    if (info) {
      const date = new Date(info.lastModified);
      return \`
        <div class="report-card">
          <div>
            <div class="name">\${entry.name}</div>
            <div class="date">\${date.toLocaleDateString()} \${date.toLocaleTimeString()}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="viewReport('\${entry.dir}')">Open</button>
        </div>
      \`;
    } else {
      return \`
        <div class="report-card">
          <div>
            <div class="name">\${entry.name}</div>
            <div class="no-report">No report generated yet</div>
          </div>
          <button class="btn btn-secondary btn-sm" disabled>Open</button>
        </div>
      \`;
    }
  }).join('');
}

function startPolling() {
  stopPolling();
  refreshState();
  pollInterval = setInterval(refreshState, 1500);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Initial load
renderSuites();
refreshState();
// Slow poll for idle state
setInterval(refreshState, 10000);
</script>
</body>
</html>`;

// ─── HTTP Server ─────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Dashboard
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(DASHBOARD_HTML);
    return;
  }

  // API: Get full state
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const suiteStates = {};
    const jobsOut = {};

    for (const [id, job] of runningJobs) {
      jobsOut[id] = { output: job.output, status: job.status, suiteName: job.suiteName };

      // Latest job per suite
      if (!suiteStates[job.suiteId] || job.id > (suiteStates[job.suiteId].jobId || 0)) {
        const suite = TEST_SUITES.find(s => s.id === job.suiteId);
        suiteStates[job.suiteId] = {
          status: job.status,
          jobId: job.id,
          startTime: job.startTime,
          endTime: job.endTime,
          reportExists: suite?.reportDir ? !!getReportInfo(suite.reportDir) : false,
        };
      }
    }

    // Add report info for idle suites
    for (const suite of TEST_SUITES) {
      if (!suiteStates[suite.id]) {
        suiteStates[suite.id] = {
          status: 'idle',
          reportExists: suite.reportDir ? !!getReportInfo(suite.reportDir) : false,
        };
      }
    }

    const reports = {};
    for (const dir of ['playwright-report/local', 'playwright-report/rfs', 'playwright-report/prod']) {
      const info = getReportInfo(dir);
      if (info) reports[dir] = info;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ suites: suiteStates, jobs: jobsOut, reports }));
    return;
  }

  // API: Run a suite
  if (url.pathname === '/api/run' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { suiteId } = JSON.parse(body);
    const result = startTestRun(suiteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API: Stop a job
  if (url.pathname === '/api/stop' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { jobId } = JSON.parse(body);
    const result = stopJob(jobId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stopped: result }));
    return;
  }

  // API: Get job output
  const jobMatch = url.pathname.match(/^\/api\/job\/(\d+)$/);
  if (jobMatch) {
    const job = runningJobs.get(parseInt(jobMatch[1]));
    if (job) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output: job.output, status: job.status, suiteName: job.suiteName }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Job not found' }));
    }
    return;
  }

  // Serve report files
  const reportMatch = url.pathname.match(/^\/report\/(.+)$/);
  if (reportMatch) {
    const reportPath = reportMatch[1];
    // Find report dir (first two segments)
    const segments = reportPath.split('/');
    if (segments.length >= 2) {
      const reportDir = segments.slice(0, 2).join('/');
      const filePath = segments.slice(2).join('/') || 'index.html';
      serveReportFile(reportDir, filePath, res);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  🧘 Test Dashboard running at http://localhost:${PORT}\n`);
  console.log(`  Available suites:`);
  for (const suite of TEST_SUITES) {
    console.log(`    ${suite.icon}  ${suite.name} (${suite.testCount} tests)`);
  }
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
