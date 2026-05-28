let ws;
let term;
// chipState: name → { status, url }
const chipState = new Map();
let recipes = [];

function setConnected(yes) {
    $('#conn-dot').toggleClass('connected', yes);
    $('#conn-label').text(yes ? 'connected' : 'offline');
}

function sendMsg(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function termEcho(text, prefix) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
        if (i === lines.length - 1 && line === '') return;
        term.echo(`[[;#6b7a8d;][${prefix}]] ${line}`);
    });
}

function getChip(name) {
    return $(`#chip-${CSS.escape(name)}`);
}

function updateChip(name, status, url) {
    const prev = chipState.get(name) || {};
    chipState.set(name, {
        status: status ?? prev.status,
        url: url ?? prev.url,
    });
    const st = chipState.get(name);
    const chip = getChip(name);
    if (!chip.length) return;

    chip.attr('class', 'chip ' + (st.status || ''));
    chip.find('.chip-dot').attr('title', st.status || '');

    const startBtn = chip.find('.chip-start');
    const stopBtn  = chip.find('.chip-stop');
    startBtn.prop('disabled', st.status === 'running');
    stopBtn.prop('disabled', st.status !== 'running');

    const existing = chip.find('.chip-open');
    if (st.url) {
        if (existing.length) {
            existing.attr('href', st.url).attr('title', st.url);
        } else {
            chip.append(
                $('<a>').addClass('chip-open').attr({ href: st.url, target: '_blank', rel: 'noopener', title: st.url }).text('↗')
            );
        }
    }
}

function buildChip(recipe) {
    const chip = $('<div>').addClass('chip').attr('id', 'chip-' + recipe.name);
    chip.append($('<div>').addClass('chip-dot'));
    chip.append($('<span>').css('font-size','12px').text(recipe.name));
    const start = $('<button>').addClass('chip-btn chip-start').text('▶').attr('title', 'Start').click(() => {
        sendMsg({ type: 'start', recipe: recipe.name });
    });
    const stop = $('<button>').addClass('chip-btn chip-stop').text('■').attr('title', 'Stop').prop('disabled', true).click(() => {
        sendMsg({ type: 'stop', recipe: recipe.name });
    });
    chip.append(start, stop);
    return chip;
}

function renderChips() {
    const container = $('#chips').empty();
    recipes.forEach(r => {
        container.append(buildChip(r));
        chipState.set(r.name, { status: 'stopped', url: null });
    });
}

function applySnapshot(snapshotApps) {
    snapshotApps.forEach(({ name, status, url, log }) => {
        if (!chipState.has(name)) return;
        updateChip(name, status, url);
        if (log && log.length) {
            log.forEach(chunk => termEcho(chunk, name));
        }
    });
}

function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);

    ws.onopen = () => {
        setConnected(true);
        term.echo('[[;#3dd68c;]connected]');
    };

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'snapshot') {
            applySnapshot(msg.apps);
        } else if (msg.type === 'status') {
            updateChip(msg.recipe, msg.status);
            term.echo(`[[;#6b7a8d;][${msg.recipe}]] [[;#e5a430;]→ ${msg.status}${msg.code != null ? ' (exit '+msg.code+')' : ''}]`);
        } else if (msg.type === 'output') {
            termEcho(msg.data, msg.recipe);
        } else if (msg.type === 'url') {
            updateChip(msg.recipe, null, msg.url);
            term.echo(`[[;#6b7a8d;][${msg.recipe}]] [[;#5fa8d3;]URL: ${msg.url}]`);
        }
    };

    ws.onclose = () => {
        setConnected(false);
        term.echo('[[;#ef6461;]disconnected — retrying...]');
        setTimeout(connect, 2000);
    };
}

$(function() {
    term = $('#terminal').terminal(
        function() {},
        {
            greetings: false,
            name: 'just_runner',
            prompt: '',
            scrollback: 1000,
            enabled: false,
        }
    );

    fetch('/api/recipes')
        .then(r => r.json())
        .then(({ recipes: r }) => {
            recipes = r;
            renderChips();
            connect();
        });
});
