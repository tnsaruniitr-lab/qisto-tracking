const REPO = 'tnsaruniitr-lab/qisto';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const HOUR = 3600e3;
function rel(d) {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 90e3) return 'just now';
  const m = Math.round(ms / 60e3);
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 36) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

function parseMsg(msg) {
  const head = msg.split('\n')[0];
  const m = head.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!m) return { type: 'other', scope: null, subject: head };
  const type = /security/i.test(head) ? 'sec' : (m[1] === 'feat' ? 'feat' : m[1] === 'fix' ? 'fix' : 'other');
  return { type, scope: m[2] || null, subject: m[4] };
}

const SCOPE_LABELS = {
  'customer-app': 'customer app', customer: 'customer app', billing: 'billing',
  agency: 'repayments', credit: 'credit engine', commerce: 'commerce',
  identity: 'identity', admin: 'admin console', merchant: 'merchant portal',
  backend: 'backend core', 'rate-limit': 'backend core', infra: 'infrastructure',
  docs: 'docs', types: 'shared packages'
};
const scopeLabel = s => s ? (SCOPE_LABELS[s] || s.replace(/-/g, ' ')) : 'general';

function bars(el, rows, color) {
  if (!rows.length) { el.innerHTML = '<p class="mut" style="font-size:12px;margin:4px 0">nothing yet</p>'; return; }
  const max = Math.max(...rows.map(r => r.value));
  el.innerHTML = rows.map((r, i) => `<div class="brow">
    <span class="bl" title="${esc(r.label)}">${esc(r.label)}</span>
    <div class="bt"><div class="bf" style="width:${Math.max(3, Math.round(r.value / max * 100))}%;background:${i === 0 ? 'var(--violet)' : (color || 'var(--ocean)')}"></div></div>
    <span class="bv">${esc(String(r.display ?? r.value))}</span></div>`).join('');
}

function renderStatus(s) {
  const ws = s.progress.workstreams;
  const totalW = ws.reduce((a, w) => a + w.weight, 0);
  const overall = Math.round(ws.reduce((a, w) => a + w.weight * w.pct, 0) / totalW);
  $('progress-pct').textContent = overall + '%';
  $('progress-note').textContent = s.progress.headline;
  $('progress-bar').style.width = overall + '%';
  $('workstreams').innerHTML = ws.map(w => `<div class="wrow" title="${esc(w.note)}">
    <span class="wl">${esc(w.label)} <span class="dim">· ${w.weight}%</span></span>
    <div class="bt"><div class="bf${w.pct ? '' : ' zero'}" style="width:${Math.max(2, w.pct)}%"></div></div>
    <span class="wv">${w.pct}%</span></div>`).join('');
  $('model-note').textContent = s.progress.modelNote;
  $('scope-note').textContent = s.progress.scopeNote;

  const active = s.milestones.find(m => m.state === 'active');
  $('progress-milestone').textContent = active ? `${active.id.toLowerCase()} · ${active.title} in progress` : '';
  $('stepper').innerHTML = s.milestones.map(m => `<li class="${m.state}">
    <span class="node">${m.state === 'done' ? '<i class="ti ti-check"></i>' : ''}</span>
    <span class="name">${esc(m.title)}</span><span class="tag">${m.id.toLowerCase()} · ${m.state}</span></li>`).join('');

  $('stat-tests').textContent = s.stats.tests;
  $('money-loop').innerHTML = s.moneyLoop.map((st, i) =>
    `${i ? '<span class="arr">→</span>' : ''}<span class="stage${st.warn ? ' warn' : (st.live ? '' : ' off')}" ${st.warn ? `title="${esc(st.warn)}"` : ''}>${esc(st.label)}${st.warn ? ' ⚠' : (st.live ? ' ✓' : '')}</span>`).join('');

  $('decisions').innerHTML = s.decisions.map(d => `<div class="card dcard">
    <p class="dt">${esc(d.title)}</p><p class="dd">${esc(d.detail)}</p></div>`).join('');

  $('shipped').innerHTML = s.shipped.map(it => `<div class="ship">
    <span class="area">${esc(it.area)}</span><span class="stext">${esc(it.text)}</span></div>`).join('');

  $('gallery').innerHTML = s.gallery.map(g => `<a class="gcard" href="${esc(g.url)}" target="_blank" rel="noopener">
    ${g.img ? `<img class="gshot" src="${esc(g.img)}" alt="${esc(g.title)}" loading="lazy">`
            : `<div class="gph"><i class="ti ${esc(g.icon || 'ti-device-mobile')}"></i></div>`}
    <div class="ginfo"><p class="gt">${esc(g.title)} <i class="ti ti-external-link" style="font-size:11px"></i></p><p class="gd">${esc(g.desc)}</p></div></a>`).join('');

  const lane = (key, title) => `<div class="lane lane-${key}"><p class="lh"><span class="ldot"></span>${title}</p>
    ${s.roadmap[key].map(it => `<div class="litem"><span class="lt">${esc(it.label)}</span><span class="tag">${esc(it.tag)}</span></div>`).join('')}</div>`;
  $('roadmap').innerHTML = lane('now', 'now') + lane('next', 'next') + lane('later', 'later');

  $('links').innerHTML = s.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <i class="ti ti-external-link"></i></a>`).join('');
  $('live-pill').innerHTML = `<span class="dot"></span>${esc(s.stats.services)} services live`;
}

function renderStats(st) {
  $('stat-files-24h').textContent = st.totals24h.files;
  $('summary-24h').textContent = `· ${st.totals24h.commits} commits · +${st.totals24h.additions.toLocaleString()} / −${st.totals24h.deletions.toLocaleString()} lines`;
  bars($('areas-24h'), st.areas24h.map(a => ({ label: a.label, value: a.files, display: a.files + ' files' })));

  const days = st.velocity.slice(-21);
  const vmax = Math.max(1, ...days.map(d => d.commits));
  const today = new Date().toISOString().slice(0, 10);
  $('velocity').innerHTML = `<div class="vchart">${days.map(d =>
    `<div class="vbar${d.commits ? '' : ' zero'}${d.date === today ? ' today' : ''}" style="height:${Math.max(3, Math.round(d.commits / vmax * 100))}%" title="${d.date}: ${d.commits} commits"></div>`).join('')}</div>
    <div class="vlabels"><span>${days[0]?.date.slice(5)}</span><span>commits per day</span><span>${days[days.length - 1]?.date.slice(5)}</span></div>`;
  const total = st.velocity.reduce((a, d) => a + d.commits, 0);
  $('velocity-note').textContent = `· ${total} commits in the last 30 days`;

  bars($('contributors'), st.contributors7d.map(c => ({ label: c.name, value: c.commits, display: c.commits + ' commits' })), 'var(--ocean)');
}

const SCORE_COLOR = s => s >= 7 ? 'var(--green)' : s >= 5.5 ? 'var(--ocean)' : s >= 4.5 ? 'var(--amber)' : 'var(--red)';

async function renderReviews() {
  const bust = '?t=' + Math.floor(Date.now() / 60e3);
  const dates = await fetch('data/reviews/index.json' + bust).then(r => r.json());
  const latestDate = dates[dates.length - 1];
  const all = await Promise.all(dates.map(d => fetch(`data/reviews/${d}.json` + bust).then(r => r.json())));
  const rv = all[all.length - 1];

  $('audit-date').textContent = `· independent multi-reviewer audit · ${rv.date}`;

  const trend = all.length > 1
    ? `<div class="strend" title="overall score by day">${all.map((r, i) =>
        `<div class="tb${i === all.length - 1 ? ' last' : ''}" style="height:${r.overall * 10}%" title="${r.date}: ${r.overall}/10"></div>`).join('')}</div>`
    : '<span class="dim" style="font-size:11px">first review — trend starts tomorrow</span>';

  $('scorecard').innerHTML = `<div class="score-head">
      <span class="score-big" style="color:${SCORE_COLOR(rv.overall)}">${rv.overall}<span class="of">/10</span></span>
      <span class="score-verdict">${esc(rv.overallVerdict)}</span>${trend}</div>
    <div class="sdims">${rv.dimensions.map(d => `<div class="sdim" title="${esc(d.verdict)}">
      <span class="dl">${esc(d.label)}</span>
      <div class="bt"><div class="bf" style="width:${d.score * 10}%;background:${SCORE_COLOR(d.score)}"></div></div>
      <span class="dv">${d.score}</span></div>`).join('')}</div>`;

  $('review-body').innerHTML = `
    <details><summary>what's genuinely great · ${rv.great.length}</summary><ul>${rv.great.map(g => `<li>${esc(g)}</li>`).join('')}</ul></details>
    <details open><summary>the honest verdict</summary><p class="vp">${esc(rv.verdict)}</p><p class="mth">method: ${esc(rv.method)}</p></details>
    <details open><summary>five things next</summary><ol>${rv.next.map(n => `<li>${esc(n)}</li>`).join('')}</ol></details>`;

  $('audit-findings').innerHTML = rv.issues.map(f => `<div class="finding">
    <span class="sev ${f.severity}">${f.severity}</span>
    <span class="fstatus ${f.status}">${f.status === 'fixed' ? '✓ fixed' : '◌ open'}</span>
    <span class="ftext">${esc(f.title)}<span class="fd">${esc(f.detail)}</span></span></div>`).join('');

  $('review-archive').innerHTML = '<span class="alb">review archive:</span>' + dates.map(d =>
    `<a href="data/reviews/${d}.json" target="_blank" rel="noopener" class="${d === latestDate ? 'cur' : ''}">${d}</a>`).join('');

  const openCrit = rv.issues.filter(i => i.status === 'open' && (i.severity === 'critical' || i.severity === 'high')).length;
  const el = $('stat-criticals');
  el.textContent = openCrit;
  if (openCrit === 0) { el.classList.remove('warn'); el.classList.add('ok'); }
}

function renderFeed(commits, liveOk, bakedAt) {
  const now = Date.now();
  let win = commits.filter(c => now - new Date(c.date) < 4 * HOUR);
  let title = 'last 4 hours';
  if (!win.length) { win = commits.slice(0, 6); title = 'latest activity'; }
  $('feed-title').textContent = title + (liveOk ? '' : ' (snapshot)');
  $('feed-4h').innerHTML = (liveOk ? '' : `<div class="banner">live feed unavailable right now — showing snapshot from ${rel(bakedAt)}</div>`) +
    win.slice(0, 8).map(c => {
      const p = parseMsg(c.message);
      return `<div class="commit"><span class="sha mono">${c.sha.slice(0, 7)}</span>
        <span class="type ${p.type}">${p.type === 'sec' ? 'security' : p.type}</span>
        <span class="msg" title="${esc(p.subject)}">${esc(p.subject)}</span>
        <span class="when">${rel(c.date)}</span></div>`;
    }).join('');
  const counts = {};
  win.forEach(c => { const l = scopeLabel(parseMsg(c.message).scope); counts[l] = (counts[l] || 0) + 1; });
  bars($('scopes-4h'), Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value]) => ({ label, value, display: value })), 'var(--violet)');

  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  $('stat-commits-today').textContent = commits.filter(c => new Date(c.date) >= midnight).length;
}

async function fetchLive() {
  const since = new Date(Date.now() - 24 * HOUR).toISOString();
  const r = await fetch(`https://api.github.com/repos/${REPO}/commits?since=${since}&per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) throw new Error('github api ' + r.status);
  const list = await r.json();
  return list.map(c => ({ sha: c.sha, message: c.commit.message, date: c.commit.author.date }));
}

(async () => {
  const bust = '?t=' + Math.floor(Date.now() / 60e3);
  const [status, stats] = await Promise.all([
    fetch('data/status.json' + bust).then(r => r.json()),
    fetch('data/stats.json' + bust).then(r => r.json())
  ]);
  renderStatus(status);
  renderStats(stats);
  renderReviews().catch(e => { $('scorecard').innerHTML = '<p class="mut">no review yet</p>'; console.error(e); });
  try {
    const live = await fetchLive();
    renderFeed(live, true, stats.generatedAt);
    $('updated').textContent = 'live · stats baked ' + rel(stats.generatedAt);
  } catch (e) {
    renderFeed(stats.recentCommits, false, stats.generatedAt);
    $('updated').textContent = 'as of ' + rel(stats.generatedAt);
  }
})().catch(e => {
  $('updated').textContent = 'failed to load data';
  console.error(e);
});
