// Strip ANSI escape codes for plain log display
function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

let ws;
let recipes = [];
// appState: name → { status, url, logEl }
const appState = new Map();

function setConnected(yes) {
    document.getElementById('conn-dot').classList.toggle('connected', yes);
    document.getElementById('conn-label').textContent = yes ? 'connected' : 'offline';
}

function sendMsg(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function getCard(name) {
    return document.getElementById('card-' + name);
}

function updateCard(name, status, url) {
    const card = getCard(name);
    if (!card) return;
    const prev = appState.get(name) || {};
    appState.set(name, { ...prev, status: status ?? prev.status, url: url ?? prev.url });

    const st = appState.get(name);
    card.className = 'card ' + (st.status || '');

    const dot = card.querySelector('.status-dot');
    dot.title = st.status || '';

    const startBtn = card.querySelector('.btn.start');
    const stopBtn = card.querySelector('.btn.stop');
    startBtn.disabled = st.status === 'running';
    stopBtn.disabled  = st.status !== 'running';

    let openLink = card.querySelector('.open-link');
    if (st.url) {
        if (!openLink) {
            openLink = document.createElement('a');
            openLink.className = 'open-link';
            openLink.target = '_blank';
            openLink.rel = 'noopener';
            openLink.textContent = 'Open';
            card.querySelector('.card-controls').appendChild(openLink);
        }
        openLink.href = st.url;
        openLink.title = st.url;
    }
}

function appendOutput(name, data) {
    const card = getCard(name);
    if (!card) return;
    const log = card.querySelector('.card-log');
    const clean = stripAnsi(data);
    log.textContent += clean;
    // Auto-scroll if near bottom
    if (log.scrollHeight - log.scrollTop < log.clientHeight + 80) {
        log.scrollTop = log.scrollHeight;
    }
}

function buildCard(recipe) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'card-' + recipe.name;

    card.innerHTML = `
        <div class="card-head">
            <div class="status-dot"></div>
            <div class="card-name">${recipe.name}</div>
        </div>
        ${recipe.doc ? `<div class="card-doc">${recipe.doc}</div>` : ''}
        <div class="card-controls">
            <button class="btn start" title="Start ${recipe.name}">Start</button>
            <button class="btn stop" title="Stop ${recipe.name}" disabled>Stop</button>
        </div>
        <pre class="card-log"></pre>
    `;

    card.querySelector('.btn.start').addEventListener('click', () => sendMsg({ type: 'start', recipe: recipe.name }));
    card.querySelector('.btn.stop').addEventListener('click', () => sendMsg({ type: 'stop', recipe: recipe.name }));

    return card;
}

function renderCards() {
    const container = document.getElementById('cards');
    container.innerHTML = '';
    recipes.forEach(r => {
        container.appendChild(buildCard(r));
        appState.set(r.name, { status: 'stopped', url: null });
    });
}

function applySnapshot(snapshotApps) {
    snapshotApps.forEach(({ name, status, url, log }) => {
        if (!appState.has(name)) return;
        updateCard(name, status, url);
        if (log && log.length) {
            log.forEach(chunk => appendOutput(name, chunk));
        }
    });
}

function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'snapshot') {
            applySnapshot(msg.apps);
        } else if (msg.type === 'status') {
            updateCard(msg.recipe, msg.status);
        } else if (msg.type === 'output') {
            appendOutput(msg.recipe, msg.data);
        } else if (msg.type === 'url') {
            updateCard(msg.recipe, null, msg.url);
        }
    };

    ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2000);
    };
}

fetch('/api/recipes')
    .then(r => r.json())
    .then(({ recipes: r }) => {
        recipes = r;
        renderCards();
        connect();
    });
