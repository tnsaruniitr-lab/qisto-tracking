import { writeFileSync, mkdirSync } from 'node:fs';

const REPO = 'tnsaruniitr-lab/qisto';
const TOKEN = process.env.GITHUB_TOKEN || '';
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
  recentCommits
};

mkdirSync('data', { recursive: true });
writeFileSync('data/stats.json', JSON.stringify(stats, null, 2) + '\n');
console.log(`baked: ${last24.length} commits / ${files} file changes in 24h, ${contributors7d.length} contributors`);
