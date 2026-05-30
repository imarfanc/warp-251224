const ANSI_FG = {
    30: '#6b7280', 31: '#f87171', 32: '#4ade80', 33: '#facc15',
    34: '#60a5fa', 35: '#e879f9', 36: '#22d3ee', 37: '#d4d4d4',
    90: '#9ca3af', 91: '#fca5a5', 92: '#86efac', 93: '#fde047',
    94: '#93c5fd', 95: '#f0abfc', 96: '#67e8f9', 97: '#fafafa',
};

const LOG_DEFAULT_COLOR = '#b8f0b8';

function parseAnsiCodes(codes) {
    const state = { color: LOG_DEFAULT_COLOR, bold: false, dim: false };
    if (!codes || codes === '0') return state;

    const nums = codes.split(';').map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
    for (let i = 0; i < nums.length; i++) {
        const n = nums[i];
        if (n === 0) {
            state.color = LOG_DEFAULT_COLOR;
            state.bold = false;
            state.dim = false;
        } else if (n === 1) state.bold = true;
        else if (n === 2) state.dim = true;
        else if (n === 22) state.bold = false;
        else if (n === 39) state.color = LOG_DEFAULT_COLOR;
        else if (n >= 30 && n <= 37) state.color = ANSI_FG[n];
        else if (n >= 90 && n <= 97) state.color = ANSI_FG[n];
        else if (n === 38 && nums[i + 1] === 5 && nums[i + 2] !== undefined) {
            i += 2;
        } else if (n === 38 && nums[i + 1] === 2 && nums[i + 4] !== undefined) {
            const r = nums[i + 2], g = nums[i + 3], b = nums[i + 4];
            state.color = `rgb(${r},${g},${b})`;
            i += 4;
        }
    }
    return state;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** OSC hyperlinks and SGR → HTML spans (keeps box-drawing intact). */
function ansiToHtml(text) {
    text = text.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '');
    text = text.replace(/\r/g, '');

    let html = '';
    let state = { color: LOG_DEFAULT_COLOR, bold: false, dim: false };
    const styleAttr = () => {
        const parts = [`color:${state.color}`];
        if (state.bold) parts.push('font-weight:700');
        if (state.dim) parts.push('opacity:0.55');
        return parts.join(';');
    };

    const re = /\x1b\[([0-9;]*)m/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) {
            html += `<span style="${styleAttr()}">${escapeHtml(text.slice(last, m.index))}</span>`;
        }
        state = parseAnsiCodes(m[1]);
        last = re.lastIndex;
    }
    if (last < text.length) {
        html += `<span style="${styleAttr()}">${escapeHtml(text.slice(last))}</span>`;
    }
    return html;
}

function getLogInner(log) {
    let inner = log.querySelector('.card-log-inner');
    if (!inner) {
        inner = document.createElement('code');
        inner.className = 'card-log-inner';
        log.textContent = '';
        log.appendChild(inner);
    }
    return inner;
}

function clearLogEl(log) {
    log.innerHTML = '';
    const inner = document.createElement('code');
    inner.className = 'card-log-inner';
    log.appendChild(inner);
}

const OPEN_ON_START_KEY = 'just-runner.openOnStart';

let ws;
let recipes = [];
let localCards = [];
let cardGroups = { groups: [] };
// appState: name → { status, url, logEl }
const appState = new Map();
/** Recipes started this session that should auto-open when a URL is detected. */
const autoOpenPending = new Set();

function openOnStartEnabled() {
    const stored = localStorage.getItem(OPEN_ON_START_KEY);
    return stored === null ? true : stored === 'true';
}

function initTopbarOptions() {
    const cb = document.getElementById('open-on-start');
    if (!cb) return;
    cb.checked = openOnStartEnabled();
    cb.addEventListener('change', () => {
        localStorage.setItem(OPEN_ON_START_KEY, cb.checked ? 'true' : 'false');
    });
}

function maybeAutoOpenLink(name, url) {
    if (!url || !openOnStartEnabled() || !autoOpenPending.has(name)) return;
    autoOpenPending.delete(name);
    window.open(url, '_blank', 'noopener');
}

initTopbarOptions();

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
        maybeAutoOpenLink(name, st.url);
    }
}

function appendOutput(name, data) {
    const card = getCard(name);
    if (!card) return;
    const log = card.querySelector('.card-log');
    const inner = getLogInner(log);
    inner.insertAdjacentHTML('beforeend', ansiToHtml(data));
    if (log.scrollHeight - log.scrollTop < log.clientHeight + 80) {
        log.scrollTop = log.scrollHeight;
    }
}

function buildCard(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.id = 'card-' + card.name;

    el.innerHTML = `
        <div class="card-head">
            <div class="status-dot"></div>
            <div class="card-name">${card.name}</div>
        </div>
        ${card.doc ? `<div class="card-doc">${card.doc}</div>` : ''}
        <div class="card-controls">
            <button class="btn start" title="Start ${card.name}">Start</button>
            <button class="btn stop" title="Stop ${card.name}" disabled>Stop</button>
        </div>
        <pre class="card-log"></pre>
    `;

    el.querySelector('.btn.start').addEventListener('click', () => {
        if (card.local) clearLogEl(el.querySelector('.card-log'));
        autoOpenPending.add(card.name);
        sendMsg({ type: 'start', recipe: card.name });
    });
    el.querySelector('.btn.stop').addEventListener('click', () => sendMsg({ type: 'stop', recipe: card.name }));

    return el;
}

function resolveGroupMembers(group, hidden) {
    const recipeMembers = (group.recipes || [])
        .map(name => recipes.find(r => r.name === name))
        .filter(r => r && !hidden.has(r.name));
    const localMembers = (group.local || [])
        .map(name => localCards.find(c => c.name === name))
        .filter(c => c && !hidden.has(c.name))
        .map(c => ({ ...c, local: true }));
    return [...recipeMembers, ...localMembers];
}

function renderCards() {
    const container = document.getElementById('cards');
    container.innerHTML = '';

    const hidden = new Set(cardGroups.hidden || []);
    const grouped = new Set();
    for (const group of cardGroups.groups || []) {
        for (const name of group.recipes || []) grouped.add(name);
        for (const name of group.local || []) grouped.add(name);
    }

    for (const group of cardGroups.groups || []) {
        const members = resolveGroupMembers(group, hidden);
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
        for (const card of members) {
            inner.appendChild(buildCard(card));
            appState.set(card.name, { status: 'stopped', url: null });
        }
        wrapper.appendChild(inner);
        container.appendChild(wrapper);
    }

    for (const recipe of recipes) {
        if (grouped.has(recipe.name) || hidden.has(recipe.name)) continue;
        container.appendChild(buildCard(recipe));
        appState.set(recipe.name, { status: 'stopped', url: null });
    }

    for (const card of localCards) {
        if (grouped.has(card.name) || hidden.has(card.name)) continue;
        container.appendChild(buildCard({ ...card, local: true }));
        appState.set(card.name, { status: 'stopped', url: null });
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
]).then(([{ recipes: r, localCards: lc }, groups]) => {
    recipes = r;
    localCards = lc || [];
    cardGroups = groups;
    renderCards();
    connect();
});
