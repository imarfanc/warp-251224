const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn, execFileSync } = require('child_process');
const path = require('path');

const WEB_APPS_DIR = process.env.WEB_APPS_DIR || '/Users/arfan2/Developer/gh/web-apps';
const PORT = process.env.PORT || 4500;
const LOG_LIMIT = 500;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Process registry: recipe name → { status, code, url, child, log[] }
const apps = new Map();

function loadRecipes() {
    const out = execFileSync('just', ['--dump-format', 'json', '--dump'], {
        cwd: WEB_APPS_DIR,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
    });
    const data = JSON.parse(out);
    return Object.values(data.recipes || {})
        .filter(r => !r.private)
        .map(r => ({
            name: r.name,
            doc: r.doc || null,
            body: (r.body || []).flat().join('\n'),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function broadcast(msg) {
    const text = JSON.stringify(msg);
    wss.clients.forEach(c => {
        if (c.readyState === c.OPEN) c.send(text);
    });
}

function appendLog(name, data) {
    const entry = apps.get(name);
    if (!entry) return;
    entry.log.push(data);
    if (entry.log.length > LOG_LIMIT) entry.log.shift();
}

// Extract first localhost URL from a chunk of output
const URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?[^\s]*/g;
const BARE_RE = /\b(?:localhost|0\.0\.0\.0)(:\d+)/g;
function detectUrl(text) {
    let m = URL_RE.exec(text);
    if (m) return m[0].replace(/0\.0\.0\.0/, 'localhost');
    m = BARE_RE.exec(text);
    if (m) return 'http://' + m[0].replace(/0\.0\.0\.0/, 'localhost');
    return null;
}

function startApp(name) {
    const entry = apps.get(name);
    if (entry && entry.status === 'running') return;

    const child = spawn('just', [name], {
        cwd: WEB_APPS_DIR,
        detached: true,
        env: { ...process.env, FORCE_COLOR: '1' },
    });

    const appEntry = { status: 'running', code: null, url: null, child, log: [] };
    apps.set(name, appEntry);
    broadcast({ type: 'status', recipe: name, status: 'running' });

    function onData(data) {
        const text = data.toString();
        appendLog(name, text);
        broadcast({ type: 'output', recipe: name, data: text });
        if (!appEntry.url) {
            const found = detectUrl(text);
            if (found) {
                appEntry.url = found;
                broadcast({ type: 'url', recipe: name, url: found });
            }
        }
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
        const msg = `\nError: ${err.message}\n`;
        appendLog(name, msg);
        broadcast({ type: 'output', recipe: name, data: msg });
    });

    child.on('close', (code) => {
        appEntry.status = 'exited';
        appEntry.code = code;
        appEntry.child = null;
        broadcast({ type: 'status', recipe: name, status: 'exited', code });
    });
}

function stopApp(name) {
    const entry = apps.get(name);
    if (!entry || entry.status !== 'running' || !entry.child) return;
    try {
        process.kill(-entry.child.pid, 'SIGINT');
    } catch {
        try { entry.child.kill('SIGINT'); } catch {}
    }
    entry.status = 'stopped';
    entry.child = null;
    broadcast({ type: 'status', recipe: name, status: 'stopped' });
}

// REST
app.get('/api/recipes', (req, res) => {
    try {
        res.json({ recipes: loadRecipes() });
    } catch (err) {
        console.error('Error loading recipes:', err.message);
        res.status(500).json({ error: 'Failed to load recipes' });
    }
});

// Explicit routes for extension-less views
app.use(express.static(path.join(__dirname, 'public')));
app.get('/terminal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terminal.html'));
});
app.get('/sidebar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sidebar.html'));
});

// WebSocket
wss.on('connection', (ws) => {
    // Send current state snapshot to newly connected client
    const snapshot = [];
    apps.forEach((entry, name) => {
        snapshot.push({
            name,
            status: entry.status,
            code: entry.code,
            url: entry.url,
            log: entry.log,
        });
    });
    ws.send(JSON.stringify({ type: 'snapshot', apps: snapshot }));

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.type === 'start' && msg.recipe) {
            startApp(msg.recipe);
        } else if (msg.type === 'stop' && msg.recipe) {
            stopApp(msg.recipe);
        } else if (msg.type === 'startMany' && Array.isArray(msg.recipes)) {
            msg.recipes.forEach(startApp);
        }
    });
});

server.listen(PORT, () => {
    console.log(`just-runner running at http://localhost:${PORT}`);
    console.log(`  Panels view:   http://localhost:${PORT}/`);
    console.log(`  Terminal view: http://localhost:${PORT}/terminal`);
    console.log(`  Web-apps dir:  ${WEB_APPS_DIR}`);
});
