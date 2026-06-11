import { writeFileSync, mkdirSync } from 'node:fs';

const REPO = 'tnsaruniitr-lab/qisto';
// qisto is private — prefer a PAT with read access to it (QISTO_READ_TOKEN);
// fall back to GITHUB_TOKEN for local runs / if the repo is public again.
const TOKEN = process.env.QISTO_READ_TOKEN || process.env.GITHUB_TOKEN || '';
const HOUR = 3600e3;
const now = Date.now();

const NAME_MAP = { 'tnsaruniitr-lab': 'Arun Sharma', 'Manasvi Sharma': 'Manasvi', Manasvi26: 'Manasvi' };
const norm = n => NAME_MAP[n] || n;

const AREA_RULES = [
  ['backend/tests', 'tests'],
  ['backend/migrations', 'migrations'],
  ['backend', 'backend core'],
  ['apps/customer', 'customer app'],
  ['apps/admin', 'admin console'],
  ['apps/merchant', 'merchant portal'],
  ['packages', 'shared packages'],
  ['docs', 'docs'],
  ['infrastructure', 'infrastructure']
];
const areaOf = path => (AREA_RULES.find(([p]) => path.startsWith(p)) || [, 'repo config'])[1];

async function gh(path) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'qisto-tracking-bake',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    }
  });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

// Fetch a file's raw text via the contents API (works for private repos with the token,
// unlike raw.githubusercontent which 404s without auth).
async function ghRaw(filePath) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    headers: {
      Accept: 'application/vnd.github.raw',
      'User-Agent': 'qisto-tracking-bake',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    }
  });
  if (!r.ok) throw new Error(`raw ${filePath} -> ${r.status}`);
  return r.text();
}

async function allCommitsSince(sinceISO) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`/repos/${REPO}/commits?since=${sinceISO}&per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const since30 = new Date(now - 30 * 24 * HOUR).toISOString();
const commits = await allCommitsSince(since30);
console.log(`fetched ${commits.length} commits since ${since30}`);

const velocity = [];
for (let i = 29; i >= 0; i--) {
  const date = new Date(now - i * 24 * HOUR).toISOString().slice(0, 10);
  velocity.push({ date, commits: 0 });
}
const vmap = Object.fromEntries(velocity.map(v => [v.date, v]));
for (const c of commits) {
  const d = c.commit.author.date.slice(0, 10);
  if (vmap[d]) vmap[d].commits++;
}

const contributors = {};
for (const c of commits) {
  if (now - new Date(c.commit.author.date) > 7 * 24 * HOUR) continue;
  const name = norm(c.commit.author.name);
  contributors[name] = (contributors[name] || 0) + 1;
}
const contributors7d = Object.entries(contributors)
  .map(([name, n]) => ({ name, commits: n }))
  .sort((a, b) => b.commits - a.commits);

const last24 = commits.filter(c => now - new Date(c.commit.author.date) < 24 * HOUR);
const areas = {};
let additions = 0, deletions = 0, files = 0;
for (const c of last24.slice(0, 60)) {
  const detail = await gh(`/repos/${REPO}/commits/${c.sha}`);
  for (const f of detail.files || []) {
    const a = areaOf(f.filename);
    areas[a] = (areas[a] || 0) + 1;
    additions += f.additions;
    deletions += f.deletions;
    files++;
  }
}
const areas24h = Object.entries(areas)
  .map(([label, n]) => ({ label, files: n }))
  .sort((a, b) => b.files - a.files);

let roadmap = null;
try {
  const md = await ghRaw('productroadmap.md');
  {
    const rows = md.split('\n').filter(l => l.trim().startsWith('|'));
    const items = [];
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length < 6 || cells[0] === 'item' || /^-+$/.test(cells[0].replace(/[: ]/g, '-'))) continue;
      const [item, component, effort, status, lane, added] = cells;
      if (!item) continue;
      items.push({
        item,
        component: component.toLowerCase(),
        effort: effort.toUpperCase(),
        status: status.toLowerCase(),
        lane: ['now', 'next', 'later'].includes(lane.toLowerCase()) ? lane.toLowerCase() : 'later',
        added
      });
    }
    roadmap = { fetchedAt: new Date(now).toISOString(), items };
    console.log(`roadmap: ${items.length} items parsed`);
  }
} catch (e) {
  console.log('roadmap: fetch failed', e.message);
}

let bugs = null;
try {
  const md = await ghRaw('docs/BUGS.md');
  const rows = md.split('\n').filter(l => l.trim().startsWith('|'));
  const items = [];
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 6 || cells[0] === 'id' || /^-+$/.test(cells[0].replace(/[: ]/g, '-'))) continue;
    const [id, title, severity, area, status, note] = cells;
    if (!id) continue;
    items.push({ id, title, severity: severity.toLowerCase(), area: area.toLowerCase(), status: status.toLowerCase(), note });
  }
  bugs = { fetchedAt: new Date(now).toISOString(), items };
  console.log(`bugs: ${items.length} parsed`);
} catch (e) {
  console.log('bugs: fetch failed', e.message);
}

const recentCommits = commits.slice(0, 30).map(c => ({
  sha: c.sha,
  message: c.commit.message.split('\n')[0],
  author: norm(c.commit.author.name),
  date: c.commit.author.date
}));

const stats = {
  generatedAt: new Date(now).toISOString(),
  totals24h: { commits: last24.length, files, additions, deletions },
  areas24h,
  velocity,
  contributors7d,
  recentCommits,
  roadmap,
  bugs
};

mkdirSync('data', { recursive: true });
writeFileSync('data/stats.json', JSON.stringify(stats, null, 2) + '\n');
console.log(`baked: ${last24.length} commits / ${files} file changes in 24h, ${contributors7d.length} contributors`);
