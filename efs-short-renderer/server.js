'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 10000);
const root = process.env.JOB_ROOT || '/tmp/efs-short-jobs';
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://efs-short-factory.englishfocusstudio.chatgpt.site';
const queue = [];
const recent = new Map();
let working = false;

fs.mkdirSync(root, { recursive: true });
app.disable('x-powered-by');
app.use(cors({ origin(origin, cb) { cb(null, !origin || origin === allowedOrigin); }, methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json({ limit: '1mb' }));

function jobDir(id) { return path.join(root, id); }
function statePath(id) { return path.join(jobDir(id), 'state.json'); }
async function readState(id) { return JSON.parse(await fsp.readFile(statePath(id), 'utf8')); }
async function writeState(id, patch) {
  const old = await readState(id).catch(() => ({}));
  const next = { ...old, ...patch, updatedAt: new Date().toISOString() };
  await fsp.writeFile(statePath(id), JSON.stringify(next));
  return next;
}
function validId(id) { return /^[a-f0-9-]{36}$/.test(id); }
function rateAllowed(ip) {
  const now = Date.now(), list = (recent.get(ip) || []).filter(t => now - t < 3600000);
  if (list.length >= 10) return false;
  list.push(now); recent.set(ip, list); return true;
}
function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 12000) stderr = stderr.slice(-12000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-3000)}`)));
  });
}

const upload = multer({ dest: root, limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 5 } });

app.get('/health', (_req, res) => res.json({ ok: true, queue: queue.length, working }));

app.post('/v1/jobs', upload.single('mix'), async (req, res) => {
  if (!rateAllowed(req.ip)) return res.status(429).json({ error: 'RATE_LIMIT' });
  if (!req.file || !req.body.project || !req.body.spec || !req.body.rendererHtml) return res.status(400).json({ error: 'INVALID_RENDER_PACKAGE' });
  const id = crypto.randomUUID(), dir = jobDir(id);
  try {
    const project = JSON.parse(req.body.project), spec = JSON.parse(req.body.spec);
    if (!Number.isFinite(spec.total) || spec.total <= 0 || spec.total > 180 || spec.fps !== 30) throw new Error('Invalid render spec');
    if (!/^<!doctype html>/i.test(req.body.rendererHtml.trim())) throw new Error('Invalid renderer HTML');
    await fsp.mkdir(dir, { recursive: true });
    await fsp.rename(req.file.path, path.join(dir, 'mix.wav'));
    await Promise.all([
      fsp.writeFile(path.join(dir, 'project.json'), JSON.stringify(project)),
      fsp.writeFile(path.join(dir, 'spec.json'), JSON.stringify(spec)),
      fsp.writeFile(path.join(dir, 'app.html'), req.body.rendererHtml),
      fsp.writeFile(statePath(id), JSON.stringify({ id, status: 'queued', progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }))
    ]);
    queue.push(id); pump();
    res.status(202).json({ id, status: 'queued' });
  } catch (error) {
    if (req.file) await fsp.unlink(req.file.path).catch(() => {});
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    res.status(400).json({ error: error.message });
  }
});

app.get('/v1/jobs/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).end();
  try { res.json(await readState(req.params.id)); } catch { res.status(404).json({ error: 'NOT_FOUND' }); }
});

app.get('/v1/jobs/:id/file', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).end();
  try {
    const state = await readState(req.params.id);
    if (state.status !== 'completed') return res.status(409).json({ error: 'NOT_READY' });
    res.download(path.join(jobDir(req.params.id), 'output.mp4'), state.fileName || 'EFS_SHORT.mp4');
  } catch { res.status(404).json({ error: 'NOT_FOUND' }); }
});

app.get('/internal/jobs/:id/app', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).end();
  res.type('html').sendFile(path.join(jobDir(req.params.id), 'app.html'));
});

async function pump() {
  if (working || !queue.length) return;
  working = true;
  const id = queue.shift();
  try { await renderJob(id); } catch (error) { await writeState(id, { status: 'failed', error: error.message.slice(0, 1500) }).catch(() => {}); }
  working = false;
  setImmediate(pump);
}

async function renderJob(id) {
  const dir = jobDir(id), project = JSON.parse(await fsp.readFile(path.join(dir, 'project.json'), 'utf8')),
    spec = JSON.parse(await fsp.readFile(path.join(dir, 'spec.json'), 'utf8')),
    silent = path.join(dir, 'silent.mp4'), output = path.join(dir, 'output.mp4');
  await writeState(id, { status: 'rendering', progress: 1 });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  let ffmpeg;
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/internal/jobs/${id}/app?serverRender=1`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(async ({ project, spec }) => { if (!window.EFSRenderer) throw new Error('Renderer API missing'); await window.EFSRenderer.loadProject(project, spec); }, { project, spec });
    ffmpeg = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(spec.fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(spec.fps), '-movflags', '+faststart', silent], { stdio: ['pipe', 'ignore', 'pipe'] });
    let fferr = ''; ffmpeg.stderr.on('data', d => { fferr += d.toString(); if (fferr.length > 12000) fferr = fferr.slice(-12000); });
    const ffDone = new Promise((resolve, reject) => { ffmpeg.on('error', reject); ffmpeg.on('close', c => c === 0 ? resolve() : reject(new Error(`Video encode failed ${c}: ${fferr.slice(-2500)}`))); });
    const frames = Math.ceil(spec.total * spec.fps);
    for (let i = 0; i < frames; i++) {
      const base64 = await page.evaluate(t => { window.EFSRenderer.renderFrame(t); return window.EFSRenderer.frameJpeg(); }, i / spec.fps);
      if (!ffmpeg.stdin.write(Buffer.from(base64, 'base64'))) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
      if (i % 15 === 0) await writeState(id, { progress: Math.min(82, Math.round(i / frames * 82)) });
    }
    ffmpeg.stdin.end(); await ffDone;
  } finally { await browser.close(); }
  await writeState(id, { status: 'muxing', progress: 88 });
  await run('ffmpeg', ['-y', '-i', silent, '-i', path.join(dir, 'mix.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'alimiter=limit=0.95', '-shortest', '-movflags', '+faststart', output]);
  const base = String(spec.fileName || 'EFS_SHORT').replace(/[^A-Za-z0-9_-]+/g, '_');
  await fsp.unlink(silent).catch(() => {});
  await writeState(id, { status: 'completed', progress: 100, fileName: `${base}.mp4` });
}

setInterval(async () => {
  const cutoff = Date.now() - 24 * 3600000;
  for (const name of await fsp.readdir(root).catch(() => [])) {
    if (!validId(name)) continue;
    const st = await fsp.stat(jobDir(name)).catch(() => null);
    if (st && st.mtimeMs < cutoff) await fsp.rm(jobDir(name), { recursive: true, force: true });
  }
}, 3600000).unref();

const server = app.listen(port, '0.0.0.0', () => console.log(`EFS renderer listening on ${port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
