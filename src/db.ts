import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'github-monitor.db');
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
    group_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner, repo),
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
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

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

addColumn('monitored_repos', 'source_type', "TEXT DEFAULT 'github'");
addColumn('monitored_repos', 'description', 'TEXT');
addColumn('monitored_repos', 'language', 'TEXT');
addColumn('monitored_repos', 'stargazers_count', 'INTEGER');
addColumn('monitored_repos', 'popularity', 'REAL');
addColumn('monitored_repos', 'avatar_url', 'TEXT');
addColumn('monitored_repos', 'check_interval', 'INTEGER DEFAULT 60');
addColumn('monitored_repos', 'updated_at', "DATETIME DEFAULT '1970-01-01 00:00:00'");
addColumn('monitored_repos', 'include_prereleases', 'BOOLEAN DEFAULT 0');
addColumn('monitored_repos', 'installed_version', 'TEXT');
addColumn('monitored_repos', 'group_id', 'INTEGER');
addColumn('monitored_repos', 'notifications_enabled', 'BOOLEAN DEFAULT 1');
addColumn('releases', 'prerelease', 'BOOLEAN DEFAULT 0');

import { Group, Repo, Release, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from './types';
export type { Group, Repo, Release, SystemSettings };
export { DEFAULT_SYSTEM_SETTINGS };

// Group Queries
export const getGroups = (): Group[] => {
  return db.prepare(`
    SELECT 
      g.*, 
      (SELECT COUNT(*) FROM monitored_repos r WHERE r.group_id = g.id) as repo_count
    FROM groups g
    ORDER BY g.name ASC
  `).all() as Group[];
};

export const getGroup = (id: number): Group | undefined => {
  return db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as Group | undefined;
};

export const addGroup = (name: string, color: string = '#3B82F6'): { lastInsertRowid: number | bigint } => {
  try {
    const stmt = db.prepare('INSERT INTO groups (name, color) VALUES (?, ?)');
    return stmt.run(name, color);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Group name already exists');
    }
    throw error;
  }
};

export const updateGroup = (id: number, details: { name?: string; color?: string }) => {
  const sets = Object.keys(details).map((key) => `${key} = @${key}`).join(', ');
  if (!sets) return;
  const stmt = db.prepare(`UPDATE groups SET ${sets} WHERE id = @id`);
  return stmt.run({ ...details, id });
};

export const deleteGroup = (id: number) => {
  db.prepare('UPDATE monitored_repos SET group_id = NULL WHERE group_id = ?').run(id);
  return db.prepare('DELETE FROM groups WHERE id = ?').run(id);
};

// Repo Queries
export const getRepos = (): Repo[] => {
  return db.prepare(`
    SELECT 
      r.*, 
      g.name as group_name,
      g.color as group_color,
      rel.body as latest_release_body,
      rel.html_url as latest_release_html_url,
      rel.published_at as latest_release_published_at,
      rel.name as latest_release_name
    FROM monitored_repos r
    LEFT JOIN groups g ON g.id = r.group_id
    LEFT JOIN releases rel ON rel.repo_id = r.id AND rel.tag_name = r.last_tag
    ORDER BY r.updated_at DESC
  `).all() as Repo[];
};

export const getRepo = (id: number): Repo | undefined => {
  return db.prepare(`
    SELECT r.*, g.name as group_name, g.color as group_color
    FROM monitored_repos r
    LEFT JOIN groups g ON g.id = r.group_id
    WHERE r.id = ?
  `).get(id) as Repo | undefined;
};

export const addRepo = (owner: string, repo: string, details: Partial<Repo> = {}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO monitored_repos (owner, repo, source_type, description, language, stargazers_count, popularity, avatar_url, updated_at, include_prereleases, installed_version, last_tag, check_interval, group_id, notifications_enabled)
      VALUES (@owner, @repo, @source_type, @description, @language, @stargazers_count, @popularity, @avatar_url, CURRENT_TIMESTAMP, @include_prereleases, @installed_version, @last_tag, @check_interval, @group_id, @notifications_enabled)
    `);
    return stmt.run({ 
      owner, 
      repo, 
      source_type: 'github',
      description: null, 
      language: null, 
      stargazers_count: null, 
      popularity: null,
      avatar_url: null, 
      include_prereleases: 0,
      installed_version: null,
      last_tag: null,
      check_interval: 60,
      group_id: null,
      notifications_enabled: 1,
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



export const getSystemSettings = (): SystemSettings => {
  const rows = db.prepare('SELECT key, value FROM system_settings').all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    default_check_interval: map.default_check_interval ? parseInt(map.default_check_interval, 10) : DEFAULT_SYSTEM_SETTINGS.default_check_interval,
    default_include_prereleases: map.default_include_prereleases !== undefined ? map.default_include_prereleases === 'true' : DEFAULT_SYSTEM_SETTINGS.default_include_prereleases,
    default_notifications_enabled: map.default_notifications_enabled !== undefined ? map.default_notifications_enabled === 'true' : DEFAULT_SYSTEM_SETTINGS.default_notifications_enabled,
    default_group_id: map.default_group_id && map.default_group_id !== 'null' ? parseInt(map.default_group_id, 10) : null,
    telegram_enabled: map.telegram_enabled === 'true',
    telegram_bot_token: map.telegram_bot_token || '',
    telegram_chat_id: map.telegram_chat_id || '',
    telegram_template: map.telegram_template || DEFAULT_SYSTEM_SETTINGS.telegram_template,
    webhook_enabled: map.webhook_enabled === 'true',
    webhook_url: map.webhook_url || '',
    webhook_headers: map.webhook_headers || DEFAULT_SYSTEM_SETTINGS.webhook_headers,
    webhook_payload_type: (map.webhook_payload_type as 'json' | 'form') || 'json',
    webhook_template: map.webhook_template || DEFAULT_SYSTEM_SETTINGS.webhook_template,
  };
};

export const updateSystemSettings = (settings: Partial<SystemSettings>) => {
  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const runTx = db.transaction((entries: [string, any][]) => {
    for (const [key, val] of entries) {
      if (val !== undefined) {
        upsert.run(key, val === null ? 'null' : String(val));
      }
    }
  });

  runTx(Object.entries(settings));
};

export default db;
