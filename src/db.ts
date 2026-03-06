import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'github-monitor.db');
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS monitored_repos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    last_tag TEXT,
    description TEXT,
    language TEXT,
    stargazers_count INTEGER,
    avatar_url TEXT,
    check_interval INTEGER DEFAULT 60,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner, repo)
  );

  CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    name TEXT,
    body TEXT,
    published_at DATETIME,
    html_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_id, tag_name),
    FOREIGN KEY(repo_id) REFERENCES monitored_repos(id) ON DELETE CASCADE
  );
`);

// Attempt to add new columns to existing table if they don't exist
const addColumn = (table: string, column: string, type: string) => {
  try {
    const columns = db.pragma(`table_info(${table})`) as any[];
    const exists = columns.some((col) => col.name === column);
    if (!exists) {
      console.log(`Adding column ${column} to ${table}...`);
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch (e) {
    console.error(`Failed to add column ${column} to ${table}:`, e);
  }
};

addColumn('monitored_repos', 'description', 'TEXT');
addColumn('monitored_repos', 'language', 'TEXT');
addColumn('monitored_repos', 'stargazers_count', 'INTEGER');
addColumn('monitored_repos', 'avatar_url', 'TEXT');
addColumn('monitored_repos', 'check_interval', 'INTEGER DEFAULT 60');
addColumn('monitored_repos', 'updated_at', "DATETIME DEFAULT '1970-01-01 00:00:00'");
addColumn('monitored_repos', 'include_prereleases', 'BOOLEAN DEFAULT 0');
addColumn('monitored_repos', 'installed_version', 'TEXT');
addColumn('releases', 'prerelease', 'BOOLEAN DEFAULT 0');

export interface Repo {
  id: number;
  owner: string;
  repo: string;
  last_tag: string;
  installed_version?: string;
  description?: string;
  language?: string;
  stargazers_count?: number;
  avatar_url?: string;
  check_interval: number;
  include_prereleases: number; // 0 or 1
  created_at: string;
  updated_at: string;
  latest_release_body?: string;
  latest_release_html_url?: string;
  latest_release_published_at?: string;
  latest_release_name?: string;
}

export interface Release {
  id: number;
  repo_id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  created_at: string;
  prerelease: number; // 0 or 1
}

export const getRepos = (): Repo[] => {
  return db.prepare(`
    SELECT 
      r.*, 
      rel.body as latest_release_body,
      rel.html_url as latest_release_html_url,
      rel.published_at as latest_release_published_at,
      rel.name as latest_release_name
    FROM monitored_repos r
    LEFT JOIN releases rel ON rel.repo_id = r.id AND rel.tag_name = r.last_tag
    ORDER BY r.updated_at DESC
  `).all() as Repo[];
};

export const getRepo = (id: number): Repo | undefined => {
  return db.prepare('SELECT * FROM monitored_repos WHERE id = ?').get(id) as Repo | undefined;
};

export const addRepo = (owner: string, repo: string, details: Partial<Repo> = {}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO monitored_repos (owner, repo, description, language, stargazers_count, avatar_url, updated_at, include_prereleases, installed_version, last_tag, check_interval)
      VALUES (@owner, @repo, @description, @language, @stargazers_count, @avatar_url, CURRENT_TIMESTAMP, @include_prereleases, @installed_version, @last_tag, @check_interval)
    `);
    return stmt.run({ 
      owner, 
      repo, 
      description: null, 
      language: null, 
      stargazers_count: null, 
      avatar_url: null, 
      include_prereleases: 0,
      installed_version: null,
      last_tag: null,
      check_interval: 60,
      ...details 
    });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Repository already monitored');
    }
    throw error;
  }
};

export const updateRepo = (id: number, details: Partial<Repo>) => {
  const sets = Object.keys(details).map((key) => `${key} = @${key}`).join(', ');
  if (!sets) return; // Nothing to update
  const stmt = db.prepare(`UPDATE monitored_repos SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  return stmt.run({ ...details, id });
};

export const removeRepo = (id: number) => {
  db.prepare('DELETE FROM releases WHERE repo_id = ?').run(id);
  return db.prepare('DELETE FROM monitored_repos WHERE id = ?').run(id);
};

export const updateLastTag = (id: number, tag: string) => {
  return db.prepare('UPDATE monitored_repos SET last_tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(tag, id);
};

export const touchRepo = (id: number) => {
  return db.prepare('UPDATE monitored_repos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
};

export const addRelease = (release: Partial<Release>) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO releases (repo_id, tag_name, name, body, published_at, html_url, prerelease)
    VALUES (@repo_id, @tag_name, @name, @body, @published_at, @html_url, @prerelease)
  `);
  return stmt.run({ prerelease: 0, ...release });
};

export const getReleases = (repoId: number): Release[] => {
  return db.prepare('SELECT * FROM releases WHERE repo_id = ? ORDER BY published_at DESC').all(repoId) as Release[];
};

export default db;
