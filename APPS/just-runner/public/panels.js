// Strip ANSI escape codes for plain log display
function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

let ws;
let recipes = [];
let cardGroups = { groups: [] };
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

function portFromUrl(url) {
    try {
        const port = new URL(url).port;
        return port ? ':' + port : '';
    } catch {
        return '';
    }
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

    let openGroup = card.querySelector('.open-group');
    if (st.url) {
        if (!openGroup) {
            openGroup = document.createElement('span');
            openGroup.className = 'open-group';
            const openLink = document.createElement('a');
            openLink.className = 'open-link';
            openLink.target = '_blank';
            openLink.rel = 'noopener';
            openLink.textContent = 'Open';
            const portLabel = document.createElement('span');
            portLabel.className = 'open-port';
            openGroup.append(openLink, portLabel);
            card.querySelector('.card-controls').appendChild(openGroup);
        }
        const openLink = openGroup.querySelector('.open-link');
        const portLabel = openGroup.querySelector('.open-port');
        openLink.href = st.url;
        openLink.title = st.url;
        portLabel.textContent = portFromUrl(st.url);
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

    const hidden = new Set(cardGroups.hidden || []);
    const grouped = new Set();
    for (const group of cardGroups.groups || []) {
        for (const name of group.recipes || []) grouped.add(name);
    }

    for (const group of cardGroups.groups || []) {
        const members = (group.recipes || [])
            .map(name => recipes.find(r => r.name === name))
            .filter(r => r && !hidden.has(r.name));
        if (!members.length) continue;

        const wrapper = document.createElement('div');
        wrapper.className = 'card-group';
        if (group.color && /^[a-z]+$/.test(group.color)) {
            wrapper.classList.add('card-group--' + group.color);
        }
        if (group.label) {
            const label = document.createElement('div');
            label.className = 'card-group-label';
            label.textContent = group.label;
            wrapper.appendChild(label);
        }
        const inner = document.createElement('div');
        inner.className = 'card-group-cards';
        for (const recipe of members) {
            inner.appendChild(buildCard(recipe));
            appState.set(recipe.name, { status: 'stopped', url: null });
        }
        wrapper.appendChild(inner);
        container.appendChild(wrapper);
    }

    for (const recipe of recipes) {
        if (grouped.has(recipe.name) || hidden.has(recipe.name)) continue;
        container.appendChild(buildCard(recipe));
        appState.set(recipe.name, { status: 'stopped', url: null });
    }
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

Promise.all([
    fetch('/api/recipes').then(r => r.json()),
    fetch('/card-groups.json')
        .then(r => (r.ok ? r.json() : { groups: [] }))
        .catch(() => ({ groups: [] })),
]).then(([{ recipes: r }, groups]) => {
    recipes = r;
    cardGroups = groups;
    renderCards();
    connect();
});
