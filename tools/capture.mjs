// Takes the game's screenshots: serves game/ on localhost, opens each scene from shots.json in headless
// Chrome (or Edge) through the DevTools protocol, waits for the frame, and saves it as a JPEG under the
// gate's 256 KiB cap. Any script error the page throws is printed and fails the run.
//
//   node tools/capture.mjs [outDir]      default outDir: screenshots/

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const gameDir = join(root, 'game');
const outDir = resolve(process.argv[2] ?? join(root, 'screenshots'));
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const MAX_BYTES = 256 * 1024;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

const browser = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((path) => path && existsSync(path));
if (!browser) throw new Error('no Chrome or Edge found; set CHROME_PATH');

const server = createServer((req, res) => {
  const path = normalize(join(gameDir, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  const file = path.endsWith(sep) ? join(path, 'index.html') : path;
  if (!file.startsWith(gameDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), 'capture-'));
const chrome = spawn(browser, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--mute-audio',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let port = null;
for (let i = 0; i < 100 && port === null; i += 1) {
  const file = join(profile, 'DevToolsActivePort');
  if (existsSync(file)) port = readFileSync(file, 'utf8').split('\n')[0].trim() || null;
  if (port === null) await sleep(100);
}
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const socket = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((ok) => socket.addEventListener('open', ok, { once: true }));

let nextId = 1;
const waiting = new Map();
const errors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message);
    waiting.delete(message.id);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const d = message.params.exceptionDetails;
    errors.push(`${d.exception?.description ?? d.text} (${d.url ?? ''}:${d.lineNumber})`);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});
const send = (method, params = {}) => new Promise((ok, fail) => {
  const id = nextId++;
  waiting.set(id, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
  socket.send(JSON.stringify({ id, method, params }));
});

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  mkdirSync(outDir, { recursive: true });
  for (const shot of shots) {
    await send('Page.navigate', { url: `${origin}index.html${shot.query}` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i += 1) {
      await sleep(100);
      const r = await send('Runtime.evaluate', { expression: 'window.shotReady === true', returnByValue: true });
      ready = r.result.value === true;
    }
    if (!ready) throw new Error(`${shot.name}: the scene never finished drawing\n${errors.join('\n')}`);
    let quality = 90;
    let bytes;
    do {
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality });
      bytes = Buffer.from(data, 'base64');
      quality -= 5;
    } while (bytes.length > MAX_BYTES && quality > 40);
    writeFileSync(join(outDir, shot.name), bytes);
    console.log(`${shot.name}: ${bytes.length} bytes (jpeg q${quality + 5})`);
  }
  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
} finally {
  socket.close();
  chrome.kill();
  server.close();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
