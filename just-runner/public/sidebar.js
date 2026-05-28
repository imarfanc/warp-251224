function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

let ws;
let recipes = [];
let selectedRecipe = null;
// appState: name → { status, url, log[] }
const appState = new Map();

function setConnected(yes) {
    document.getElementById('conn-dot').classList.toggle('connected', yes);
    document.getElementById('conn-label').textContent = yes ? 'connected' : 'offline';
}

function sendMsg(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

// ── Sidebar list ──

function filterValue() {
    return document.getElementById('sb-filter').value.trim().toLowerCase();
}

function renderList() {
    const q = filterValue();
    const list = document.getElementById('sb-list');
    list.innerHTML = '';
    recipes
        .filter(r => !q || r.name.includes(q) || (r.doc || '').toLowerCase().includes(q))
        .forEach(r => {
            const st = appState.get(r.name) || {};
            const item = document.createElement('div');
            item.className = 'sb-item' +
                (r.name === selectedRecipe ? ' active' : '') +
                (st.status === 'running' ? ' running' : '');
            item.dataset.name = r.name;

            const dot = document.createElement('div');
            dot.className = 'status-dot';
            dot.title = st.status || '';
            if (st.status === 'running') dot.style.background = 'var(--green)';
            else if (st.status === 'exited') dot.style.background = 'var(--red)';

            const label = document.createElement('span');
            label.textContent = r.name;

            item.appendChild(dot);
            item.appendChild(label);
            item.addEventListener('click', () => selectRecipe(r.name));
            list.appendChild(item);
        });
}

// ── Detail pane ──

function showDetail(name) {
    const recipe = recipes.find(r => r.name === name);
    const st = appState.get(name) || {};

    document.getElementById('sb-empty').classList.add('hidden');
    document.getElementById('sb-detail-head').classList.remove('hidden');
    document.getElementById('sb-log').classList.remove('hidden');

    document.getElementById('sb-recipe-name').textContent = name;
    document.getElementById('sb-recipe-doc').textContent = recipe?.doc || '';

    const startBtn = document.getElementById('sb-start-btn');
    const stopBtn  = document.getElementById('sb-stop-btn');
    const dot      = document.getElementById('sb-status-dot');
    const openLink = document.getElementById('sb-open-link');
    const logEl    = document.getElementById('sb-log');

    startBtn.disabled = st.status === 'running';
    stopBtn.disabled  = st.status !== 'running';

    dot.style.background = st.status === 'running' ? 'var(--green)'
        : st.status === 'exited' ? 'var(--red)' : 'var(--border)';
    dot.title = st.status || '';

    if (st.url) {
        openLink.href = st.url;
        openLink.title = st.url;
        openLink.classList.remove('hidden');
    } else {
        openLink.classList.add('hidden');
    }

    // Render buffered log
    logEl.textContent = (st.log || []).map(stripAnsi).join('');
    logEl.scrollTop = logEl.scrollHeight;
}

function selectRecipe(name) {
    selectedRecipe = name;
    renderList();
    showDetail(name);
}

function updateDetail() {
    if (selectedRecipe) showDetail(selectedRecipe);
}

function appendDetailLog(name, data) {
    if (name !== selectedRecipe) return;
    const logEl = document.getElementById('sb-log');
    logEl.textContent += stripAnsi(data);
    if (logEl.scrollHeight - logEl.scrollTop < logEl.clientHeight + 80) {
        logEl.scrollTop = logEl.scrollHeight;
    }
}

// ── Controls ──

document.getElementById('sb-start-btn').addEventListener('click', () => {
    if (selectedRecipe) sendMsg({ type: 'start', recipe: selectedRecipe });
});
document.getElementById('sb-stop-btn').addEventListener('click', () => {
    if (selectedRecipe) sendMsg({ type: 'stop', recipe: selectedRecipe });
});
document.getElementById('sb-filter').addEventListener('input', renderList);

// ── WS ──

function applySnapshot(snapshotApps) {
    snapshotApps.forEach(({ name, status, url, log }) => {
        const prev = appState.get(name) || { log: [] };
        appState.set(name, { status, url, log: log || prev.log });
    });
    renderList();
    updateDetail();
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
            const prev = appState.get(msg.recipe) || { log: [] };
            appState.set(msg.recipe, { ...prev, status: msg.status, code: msg.code });
            renderList();
            updateDetail();
        } else if (msg.type === 'output') {
            const prev = appState.get(msg.recipe) || { log: [] };
            prev.log.push(msg.data);
            if (prev.log.length > 500) prev.log.shift();
            appState.set(msg.recipe, prev);
            appendDetailLog(msg.recipe, msg.data);
            // Refresh dot in list if this recipe is visible
            renderList();
        } else if (msg.type === 'url') {
            const prev = appState.get(msg.recipe) || { log: [] };
            appState.set(msg.recipe, { ...prev, url: msg.url });
            updateDetail();
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
        recipes.forEach(rec => appState.set(rec.name, { status: 'stopped', url: null, log: [] }));
        renderList();
        connect();
    });
