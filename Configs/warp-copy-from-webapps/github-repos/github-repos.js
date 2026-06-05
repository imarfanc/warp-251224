const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

const ICON = {
  githubDesktop: 'mdi:github',
  cursor: 'simple-icons:cursor',
  newWindow: 'ph:app-window-thin',
};

const SORT_STORAGE_KEY = 'githubReposSort';

/** @type {Record<string, unknown>[]} */
let reposOriginal = [];

function getSortMode() {
  const v = localStorage.getItem(SORT_STORAGE_KEY);
  if (v === 'name' || v === 'default') return v;
  return 'default';
}

function compareRepoName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function orderedRepos(sortMode) {
  if (sortMode === 'name') return [...reposOriginal].sort(compareRepoName);
  return [...reposOriginal];
}

function updateSortButtons(sortMode) {
  document.querySelectorAll('.sort-toggle-btn').forEach((btn) => {
    const active = btn.dataset.sort === sortMode;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applySortAndRender() {
  const sortMode = getSortMode();
  const repos = orderedRepos(sortMode);
  renderGrid(repos);
  renderList(repos);
  updateSortButtons(sortMode);
}

function initSortToggle() {
  document.querySelector('.sort-toggle')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-toggle-btn');
    if (!btn?.dataset.sort) return;
    localStorage.setItem(SORT_STORAGE_KEY, btn.dataset.sort);
    applySortAndRender();
  });
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function iconMarkup(icon) {
  return `<span class="iconify" data-icon="${icon}" data-width="22" data-height="22" aria-hidden="true"></span>`;
}

function scanIconify(root) {
  if (typeof Iconify !== 'undefined' && typeof Iconify.scan === 'function') {
    Iconify.scan(root);
  }
}

function cursorFileUrl(repo) {
  if (!repo.repo_local_path) return null;
  const path = repo.repo_local_path.replace('$HOME', CONFIG.homeDir);
  return `cursor://file/${path}`;
}

function kmNewWindowUrl(repo) {
  if (!repo.repo_local_path) return null;
  const value = `${CONFIG.cursorCli} --new-window ${repo.repo_local_path}`;
  return `kmtrigger://macro=${CONFIG.kmMacro}&value=${encodeURIComponent(value)}`;
}

function renderGrid(repos) {
  const grid = document.getElementById('repos-grid');
  grid.textContent = '';
  repos.forEach(repo => {
    const card = document.createElement('article');
    card.className = 'box repo-card';

    const langColor = LANG_COLORS[repo.language] || '#888';
    const langDot = repo.language
      ? `<span class="lang-dot" style="background:${langColor}"></span>${repo.language}`
      : '';

    const cursorUrl = cursorFileUrl(repo);
    const kmUrl = kmNewWindowUrl(repo);

    card.innerHTML = `
      <div class="repo-title">
        <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
        <span class="repo-badge ${repo.private ? 'warn' : 'ok'} bg color">${repo.private ? 'private' : 'public'}</span>
      </div>
      <p class="repo-desc">${repo.description ?? '—'}</p>
      <div class="repo-meta">
        ${langDot ? `<span>${langDot}</span>` : ''}
        <span>⭐ ${repo.stargazers_count}</span>
        <span>🍴 ${repo.forks_count}</span>
        <span>🐛 ${repo.open_issues_count}</span>
        <span>Updated ${relativeTime(repo.updated_at)}</span>
      </div>
      <div class="repo-actions">
        <small class="repo-actions-inner">
          <a href="${repo.github_desktop_url}">Open in GitHub Desktop →</a>
          ${cursorUrl ? `<a href="${cursorUrl}">Open in Cursor →</a>` : ''}
          ${kmUrl ? `<a href="${kmUrl}">New Cursor Window →</a>` : ''}
        </small>
      </div>
    `;

    grid.appendChild(card);
  });
}

function renderList(repos) {
  const list = document.getElementById('repos-list');
  list.textContent = '';
  repos.forEach(repo => {
    const li = document.createElement('li');
    li.className = 'repo-list-item';

    const cursorUrl = cursorFileUrl(repo);
    const kmUrl = kmNewWindowUrl(repo);

    const actions = [
      `<a class="repo-icon-link" href="${repo.github_desktop_url}" aria-label="Open in GitHub Desktop" title="GitHub Desktop">${iconMarkup(ICON.githubDesktop)}</a>`,
    ];
    if (cursorUrl) {
      actions.push(
        `<a class="repo-icon-link" href="${cursorUrl}" aria-label="Open in Cursor" title="Open in Cursor">${iconMarkup(ICON.cursor)}</a>`,
      );
    }
    if (kmUrl) {
      actions.push(
        `<a class="repo-icon-link" href="${kmUrl}" aria-label="New Cursor window" title="New Cursor window">${iconMarkup(ICON.newWindow)}</a>`,
      );
    }

    li.innerHTML = `
      <a class="repo-list-name" href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
      <div class="repo-list-actions">${actions.join('')}</div>
    `;
    list.appendChild(li);
  });
  scanIconify(list);
}

function setView(view) {
  const grid = document.getElementById('repos-grid');
  const listShell = document.getElementById('repos-list-shell');
  const isList = view === 'list';

  grid.hidden = isList;
  listShell.hidden = !isList;

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    const active = btn.dataset.view === view;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function initViewToggle() {
  document.querySelector('.view-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.view-toggle-btn');
    if (!btn || !btn.dataset.view) return;
    setView(btn.dataset.view);
  });
}

function kmStatusUrl(command) {
  return `kmtrigger://macro=${CONFIG.kmMacro}&value=${encodeURIComponent(command)}`;
}

function initStatusLinks() {
  const container = document.getElementById('warp-check-links');
  if (!container || !Array.isArray(CONFIG.statusChecks)) return;

  container.textContent = '';
  CONFIG.statusChecks.forEach((check) => {
    const row = document.createElement('span');
    row.className = 'warp-check-row';
    row.style.setProperty('--app-color', '#0969da');

    const warpLink = document.createElement('a');
    warpLink.className = 'warp-check-link';
    warpLink.href = `warp://launch/${check.warpLaunch}`;
    warpLink.innerHTML =
      '<span class="iconify warp-check-icon" data-icon="material-icon-theme:warp" data-width="20" data-height="20" aria-hidden="true"></span>' +
      `${check.label} (Warp)`;

    const kmLink = document.createElement('a');
    kmLink.className = 'app-link-cursor-only';
    kmLink.href = kmStatusUrl(check.command);
    kmLink.rel = 'noreferrer';
    kmLink.setAttribute('aria-label', check.kmAriaLabel);
    kmLink.innerHTML =
      '<span class="iconify app-link-cursor" data-icon="mynaui:terminal-solid" aria-hidden="true"></span>';

    row.append(warpLink, kmLink);
    container.appendChild(row);
  });

  scanIconify(container);
}

const reposControls = document.getElementById('repos-controls');
if (reposControls) scanIconify(reposControls);
initStatusLinks();

fetch('/THE-SIMPLE-APPS/developer/github-repos/repos-data.json')
  .then((r) => r.json())
  .then((repos) => {
    reposOriginal = repos;
    initSortToggle();
    applySortAndRender();
    initViewToggle();
    setView('list');
  });
