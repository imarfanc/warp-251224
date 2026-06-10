const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn, execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEB_APPS_DIR = process.env.WEB_APPS_DIR || path.join(process.env.HOME, 'Developer/gh/web-apps');
const REPO_ROOT = process.env.REPO_ROOT || path.join(__dirname, '../..');
const LOCAL_CARDS_PATH = path.join(__dirname, 'public/local-cards.json');
const PORT = process.env.PORT || 2000;
const LOG_LIMIT = 500;

// ---------- pretty console logging ----------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = (s) => c(2, s);
const bold = (s) => c(1, s);
const green = (s) => c(32, s);
const yellow = (s) => c(33, s);
const red = (s) => c(31, s);
const cyan = (s) => c(36, s);

const ts = () => dim(new Date().toLocaleTimeString('en-GB'));

const hasGum = (() => {
    try {
        return spawnSync('gum', ['--version'], { stdio: 'ignore' }).status === 0;
    } catch {
        return false;
    }
})();

function gum(args) {
    const r = spawnSync('gum', args, {
        encoding: 'utf8',
        env: { ...process.env, CLICOLOR_FORCE: '1' },
    });
    return r.status === 0 ? r.stdout.replace(/\n$/, '') : null;
}

function gumLog(level, msg, kv = {}) {
    const args = ['log', '--time', 'kitchen', '--level', level, '--structured', msg];
    for (const [k, v] of Object.entries(kv)) args.push(k, String(v));
    const r = spawnSync('gum', args, {
        stdio: ['ignore', 'inherit', 'inherit'],
        env: { ...process.env, CLICOLOR_FORCE: '1' },
    });
    return r.status === 0;
}

function logEvent(level, msg, kv = {}) {
    if (hasGum && gumLog(level, msg, kv)) return;
    const colorFor = { info: cyan, warn: yellow, error: red, debug: dim };
    const pairs = Object.entries(kv).map(([k, v]) => dim(`${k}=`) + v).join(' ');
    console.log(`${ts()} ${(colorFor[level] || ((s) => s))(level.toUpperCase().padEnd(5))} ${msg}${pairs ? ' ' + pairs : ''}`);
}

function printStartupBanner() {
    const base = `http://localhost:${PORT}`;
    const locals = loadLocalCards().map(c => c.name);
    const cols = process.stdout.columns || 80;
    const boxWidth = Math.max(40, Math.min(cols - 2, 120));
    const lines = [
        `just-runner  ${base}/`,
        '',
        `Web-apps dir:  ${WEB_APPS_DIR}`,
        `Repo root:     ${REPO_ROOT}`,
        `Local cards:   ${locals.join(', ') || '(none)'}`,
        '',
        'press Ctrl+D (or Ctrl+C) to stop',
    ];

    if (hasGum && boxWidth >= 40) {
        const banner = gum([
            'style',
            '--border', 'rounded',
            '--border-foreground', '212',
            '--padding', '0 2',
            '--margin', '1 0',
            '--width', String(boxWidth),
            ...lines,
        ]);
        if (banner) {
            console.log(banner);
            return;
        }
    }

    console.log(`${bold('just-runner')} ${green(`${base}/`)}`);
    console.log(`  ${dim('Web-apps dir:')}  ${WEB_APPS_DIR}`);
    console.log(`  ${dim('Repo root:')}     ${REPO_ROOT}`);
    console.log(`  ${dim('Local cards:')}   ${locals.join(', ') || '(none)'}`);
    console.log(dim('  press Ctrl+D (or Ctrl+C) to stop'));
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Process registry: recipe name → { status, code, url, child, log[] }
const apps = new Map();
const runningChildren = new Set();

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

function loadLocalCards() {
    try {
        const data = JSON.parse(fs.readFileSync(LOCAL_CARDS_PATH, 'utf8'));
        return data.cards || [];
    } catch (err) {
        logEvent('error', 'failed to load local cards', { error: err.message });
        return [];
    }
}

function getLocalCard(name) {
    return loadLocalCards().find(c => c.name === name);
}

function shellQuote(s) {
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function resolveTargetPath(inputPath) {
    const trimmed = String(inputPath || '').trim();
    if (!trimmed) return null;
    if (path.isAbsolute(trimmed)) return path.resolve(trimmed);
    return path.resolve(REPO_ROOT, trimmed);
}

function buildLocalCommand(local, opts = {}) {
    let command = local.command;
    const extras = [];

    if (local.pathInput) {
        const pathArg = opts.path !== undefined && opts.path !== null
            ? opts.path
            : (local.pathInput.default || '');
        const resolved = resolveTargetPath(pathArg);
        if (!resolved) {
            throw new Error('Path is required');
        }
        extras.push(shellQuote(resolved));
    }

    if (local.portsInput) {
        const portsArg = opts.ports !== undefined && opts.ports !== null
            ? opts.ports
            : (local.portsInput.default || '');
        if (String(portsArg).trim()) {
            extras.push(shellQuote(String(portsArg).trim()));
        }
    }

    if (extras.length) {
        command += ` ${extras.join(' ')}`;
    }
    return command;
}

function spawnCommand(name, command, cwd) {
    const entry = apps.get(name);
    if (entry && entry.status === 'running') return;

    const appEntry = { status: 'running', code: null, url: null, child: null, log: [] };
    apps.set(name, appEntry);
    broadcast({ type: 'status', recipe: name, status: 'running' });
    broadcast({ type: 'output', recipe: name, data: `$ ${command}\n` });

    const child = spawn('bash', ['-lc', command], {
        cwd: cwd || REPO_ROOT,
        env: { ...process.env, FORCE_COLOR: '1' },
    });
    appEntry.child = child;
    runningChildren.add(child);
    logEvent('info', 'start', { recipe: name, cmd: command });

    function onData(data) {
        const text = data.toString();
        appendLog(name, text);
        broadcast({ type: 'output', recipe: name, data: text });
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
        const msg = `\nError: ${err.message}\n`;
        appendLog(name, msg);
        broadcast({ type: 'output', recipe: name, data: msg });
    });

    child.on('close', (code) => {
        runningChildren.delete(child);
        appEntry.status = 'exited';
        appEntry.code = code;
        appEntry.child = null;
        logEvent(code === 0 ? 'info' : 'error', code === 0 ? 'exited' : 'failed', { recipe: name, code });
        broadcast({ type: 'status', recipe: name, status: 'exited', code });
    });
}

function startApp(name, opts = {}) {
    const local = getLocalCard(name);
    if (local) {
        let command;
        try {
            command = buildLocalCommand(local, opts);
        } catch (err) {
            const entry = apps.get(name) || { log: [] };
            apps.set(name, entry);
            const msg = `\nError: ${err.message}\n`;
            entry.log = entry.log || [];
            entry.log.push(msg);
            entry.status = 'exited';
            broadcast({ type: 'output', recipe: name, data: msg });
            broadcast({ type: 'status', recipe: name, status: 'exited', code: 1 });
            return;
        }
        spawnCommand(name, command, local.cwd);
        return;
    }

    const entry = apps.get(name);
    if (entry && entry.status === 'running') return;

    const child = spawn('just', [name], {
        cwd: WEB_APPS_DIR,
        detached: true,
        env: { ...process.env, FORCE_COLOR: '1' },
    });

    const appEntry = { status: 'running', code: null, url: null, child, log: [] };
    apps.set(name, appEntry);
    runningChildren.add(child);
    logEvent('info', 'start', { recipe: name, cmd: `just ${name}` });
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
        runningChildren.delete(child);
        appEntry.status = 'exited';
        appEntry.code = code;
        appEntry.child = null;
        logEvent(code === 0 ? 'info' : 'error', code === 0 ? 'exited' : 'failed', { recipe: name, code });
        broadcast({ type: 'status', recipe: name, status: 'exited', code });
    });
}

function stopApp(name) {
    const entry = apps.get(name);
    if (!entry || entry.status !== 'running' || !entry.child) return;
    const isLocal = Boolean(getLocalCard(name));
    try {
        if (isLocal) {
            entry.child.kill('SIGINT');
        } else {
            process.kill(-entry.child.pid, 'SIGINT');
        }
    } catch {
        try { entry.child.kill('SIGINT'); } catch {}
    }
    entry.status = 'stopped';
    entry.child = null;
    broadcast({ type: 'status', recipe: name, status: 'stopped' });
}

// REST
app.get('/api/pick-folder', (req, res) => {
    if (process.platform !== 'darwin') {
        res.status(501).json({ error: 'Folder picker is only available on macOS' });
        return;
    }
    try {
        const chosen = execFileSync('osascript', [
            '-e',
            'POSIX path of (choose folder with prompt "Select folder")',
        ], { encoding: 'utf8' }).trim();
        if (!chosen) {
            res.status(400).json({ error: 'No folder selected' });
            return;
        }
        res.json({ path: chosen });
    } catch (err) {
        const cancelled = /User canceled|User cancelled|-128/.test(String(err.message || err.stderr || ''));
        res.status(400).json({ error: cancelled ? 'Cancelled' : (err.message || 'Failed to pick folder') });
    }
});

app.get('/api/recipes', (req, res) => {
    try {
        res.json({ recipes: loadRecipes(), localCards: loadLocalCards() });
    } catch (err) {
        logEvent('error', 'failed to load recipes', { error: err.message });
        res.status(500).json({ error: 'Failed to load recipes' });
    }
});

app.post('/api/shutdown', (req, res) => {
    res.json({ ok: true });
    setImmediate(() => shutdown('UI'));
});

app.use(express.static(path.join(__dirname, 'public')));
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
            startApp(msg.recipe, { path: msg.path, ports: msg.ports });
        } else if (msg.type === 'stop' && msg.recipe) {
            stopApp(msg.recipe);
        } else if (msg.type === 'shutdown') {
            shutdown('UI');
        }
    });
});

server.listen(PORT, () => {
    printStartupBanner();
});

// ---------- graceful shutdown ----------

let shuttingDown = false;

function killAppChild(name, entry) {
    if (!entry.child) return;
    const isLocal = Boolean(getLocalCard(name));
    try {
        if (isLocal) {
            entry.child.kill('SIGTERM');
        } else {
            process.kill(-entry.child.pid, 'SIGTERM');
        }
    } catch {
        try { entry.child.kill('SIGTERM'); } catch {}
    }
    runningChildren.delete(entry.child);
}

function shutdown(reason) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('');
    logEvent('warn', 'shutting down', { reason });

    for (const [name, entry] of apps) {
        if (entry.status === 'running' && entry.child) {
            logEvent('warn', 'killing child', { recipe: name, pid: entry.child.pid });
            killAppChild(name, entry);
        }
    }
    for (const child of runningChildren) {
        logEvent('warn', 'killing child', { pid: child.pid });
        child.kill('SIGTERM');
    }

    let exited = false;
    const done = () => {
        if (exited) return;
        exited = true;
        logEvent('info', 'bye 👋');
        process.exit(0);
    };

    for (const client of wss.clients) {
        client.terminate();
    }

    const closeHttp = () => {
        server.closeAllConnections?.();
        server.closeIdleConnections?.();
        server.close(done);
    };

    wss.close(closeHttp);

    // User-initiated shutdown — exit 0 even if sockets linger briefly
    setTimeout(done, 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (process.stdin.isTTY) {
    process.stdin.resume();
    process.stdin.on('end', () => shutdown('Ctrl+D'));
}
