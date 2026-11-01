import express from 'express';
import { createServer as createViteServer } from 'vite';
import { getRepos, addRepo, removeRepo, updateLastTag, updateRepo, addRelease, getReleases as getDbReleases, getRepo, touchRepo, getGroups, addGroup, updateGroup, deleteGroup } from './src/db';
import { getLatestRelease, getRepoDetails, getReleases as getGithubReleases } from './src/services/github';
import { getAurPackageInfo } from './src/services/aur';
import cron from 'node-cron';
import { config } from './src/config';

const app = express();
const PORT = 3000;

app.use(express.json());

export interface ParsedInput {
  sourceType: 'github' | 'aur';
  owner: string;
  repo: string;
}

// Helper to parse repo/package string or URL into sourceType, owner, and repo
const parseRepoString = (input: string): ParsedInput | null => {
  if (!input) return null;
  let clean = input.trim();
  if (!clean) return null;

  // 1. Explicit gh: prefix
  if (clean.toLowerCase().startsWith('gh:')) {
    clean = clean.substring(3).trim();
    if (clean.includes('github.com')) {
      try {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return { sourceType: 'github', owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
        }
      } catch (e) {}
    }
    const parts = clean.split('/').filter(Boolean);
    if (parts.length === 2) {
      return { sourceType: 'github', owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    }
    return null;
  }

  // 2. Explicit aur: prefix
  if (clean.toLowerCase().startsWith('aur:')) {
    clean = clean.substring(4).trim();
    if (clean.includes('aur.archlinux.org')) {
      try {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        const parts = url.pathname.split('/').filter(Boolean);
        const pkgIdx = parts.indexOf('packages');
        if (pkgIdx !== -1 && parts.length > pkgIdx + 1) {
          return { sourceType: 'aur', owner: 'aur', repo: parts[pkgIdx + 1] };
        }
      } catch (e) {}
    }
    const cleanPkg = clean.replace(/^\/+|\/+$/g, '');
    if (cleanPkg) {
      return { sourceType: 'aur', owner: 'aur', repo: cleanPkg };
    }
    return null;
  }

  // 3. AUR URL without prefix
  if (clean.includes('aur.archlinux.org')) {
    try {
      const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
      const parts = url.pathname.split('/').filter(Boolean);
      const pkgIdx = parts.indexOf('packages');
      if (pkgIdx !== -1 && parts.length > pkgIdx + 1) {
        return { sourceType: 'aur', owner: 'aur', repo: parts[pkgIdx + 1] };
      }
    } catch (e) {}
  }

  // 4. GitHub URL without prefix
  if (clean.includes('github.com')) {
    try {
      const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { sourceType: 'github', owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
      }
    } catch (e) {}
  }

  // 5. Standard owner/repo format (GitHub)
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 2) {
    return { sourceType: 'github', owner: parts[0].trim(), repo: parts[1].trim().replace(/\.git$/, '') };
  }

  // 6. Single word without slash (AUR package name)
  if (parts.length === 1 && /^[a-zA-Z0-9_\-+.@]+$/.test(clean)) {
    return { sourceType: 'aur', owner: 'aur', repo: clean };
  }

  return null;
};

// API Routes - Groups
app.get('/api/groups', (req, res) => {
  try {
    const groups = getGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/api/groups', (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    const result = addGroup(name.trim(), color || '#3B82F6');
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#3B82F6' });
  } catch (error: any) {
    if (error.message === 'Group name already exists') {
      return res.status(409).json({ error: 'Group name already exists' });
    }
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.put('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    updateGroup(parseInt(id), updates);
    res.json({ message: 'Group updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  try {
    deleteGroup(parseInt(id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// API Routes - Repos
app.get('/api/repos', (req, res) => {
  try {
    const repos = getRepos();
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

app.get('/api/repos/:id', (req, res) => {
  try {
    const repo = getRepo(parseInt(req.params.id));
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    res.json(repo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repo' });
  }
});

app.post('/api/repos', async (req, res) => {
  let { owner, repo, source_type, input_string, check_interval, include_prereleases, installed_version, group_id } = req.body;

  if (input_string || (!source_type && owner && (owner.includes('/') || owner.startsWith('aur:') || owner.startsWith('gh:')))) {
    const raw = input_string || (owner.includes('/') || owner.startsWith('aur:') || owner.startsWith('gh:') ? owner : `${owner}/${repo}`);
    const parsed = parseRepoString(raw);
    if (parsed) {
      owner = parsed.owner;
      repo = parsed.repo;
      source_type = parsed.sourceType;
    }
  } else if (!source_type && owner && repo) {
    const parsed = parseRepoString(`${owner}/${repo}`);
    if (parsed) {
      source_type = parsed.sourceType;
    }
  }

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo or AUR package identifier are required' });
  }

  source_type = source_type || 'github';

  try {
    if (source_type === 'aur') {
      let aurInfo;
      try {
        aurInfo = await getAurPackageInfo(repo);
      } catch (error: any) {
        return res.status(404).json({ error: error.message || `AUR package '${repo}' not found` });
      }

      const versionTag = aurInfo.Version;
      const ownerName = aurInfo.Maintainer || 'aur';
      const avatarUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Archlinux-icon-crystal-64.svg';

      const result = addRepo(ownerName, aurInfo.Name, {
        source_type: 'aur',
        description: aurInfo.Description,
        language: 'PKGBUILD',
        stargazers_count: aurInfo.NumVotes,
        popularity: aurInfo.Popularity,
        avatar_url: avatarUrl,
        last_tag: versionTag,
        include_prereleases: 0,
        check_interval: check_interval || 60,
        installed_version: installed_version || null,
        group_id: group_id ? parseInt(group_id) : null,
      });

      if (result.lastInsertRowid) {
        const repoId = Number(result.lastInsertRowid);
        addRelease({
          repo_id: repoId,
          tag_name: versionTag,
          name: `AUR ${aurInfo.Name} ${versionTag}`,
          body: `**Maintainer:** ${aurInfo.Maintainer || 'Orphaned'} | **Votes:** ${aurInfo.NumVotes} | **Popularity:** ${aurInfo.Popularity.toFixed(2)}${aurInfo.OutOfDate ? ' | ⚠️ **Out of Date**' : ''}\n\n${aurInfo.Description}\n\n[AUR Package Page](https://aur.archlinux.org/packages/${aurInfo.Name})${aurInfo.URL ? ` • [Upstream Website](${aurInfo.URL})` : ''}`,
          published_at: aurInfo.LastModified ? new Date(aurInfo.LastModified * 1000).toISOString() : new Date().toISOString(),
          html_url: `https://aur.archlinux.org/packages/${aurInfo.Name}`,
        });
      }

      return res.status(201).json({ message: 'AUR Package added successfully' });
    }

    // GitHub Repo Logic
    let details;
    try {
      details = await getRepoDetails(owner, repo);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return res.status(404).json({ error: 'Repo not found on GitHub' });
      }
      throw error;
    }

    // Fetch latest release to set initial tag
    const release = await getLatestRelease(owner, repo, !!include_prereleases);
    const last_tag = release ? release.tag_name : null;

    const result = addRepo(owner, repo, {
      source_type: 'github',
      description: details.description,
      language: details.language,
      stargazers_count: details.stargazers_count,
      avatar_url: details.owner.avatar_url,
      last_tag,
      include_prereleases: include_prereleases ? 1 : 0,
      check_interval: check_interval || 60,
      installed_version: installed_version || null,
      group_id: group_id ? parseInt(group_id) : null,
    });

    // Fetch and store last 5 releases
    const releases = await getGithubReleases(owner, repo, 5);
    if (result.lastInsertRowid) {
      const repoId = Number(result.lastInsertRowid);
      for (const rel of releases) {
        addRelease({
          repo_id: repoId,
          tag_name: rel.tag_name,
          name: rel.name,
          body: rel.body,
          published_at: rel.published_at,
          html_url: rel.html_url,
          prerelease: rel.prerelease ? 1 : 0
        });
      }
    }

    res.status(201).json({ message: 'Repo added successfully' });
  } catch (error: any) {
    if (error.message === 'Repository already monitored') {
      return res.status(409).json({ error: 'Repository or package already monitored' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to add repository' });
  }
});

// Bulk add repositories / packages
app.post('/api/repos/bulk', async (req, res) => {
  const { repos: inputRepos, group_id, check_interval, include_prereleases } = req.body;
  if (!inputRepos) {
    return res.status(400).json({ error: 'Repository list is required' });
  }

  let rawList: string[] = [];
  if (typeof inputRepos === 'string') {
    rawList = inputRepos.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(inputRepos)) {
    rawList = inputRepos.map(item => typeof item === 'string' ? item : (item.input_string || `${item.owner}/${item.repo}`)).filter(Boolean);
  }

  // Parse and deduplicate
  const parsedMap = new Map<string, ParsedInput>();
  const invalidEntries: string[] = [];

  for (const item of rawList) {
    const parsed = parseRepoString(item);
    if (parsed) {
      const key = `${parsed.sourceType}:${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`;
      if (!parsedMap.has(key)) {
        parsedMap.set(key, parsed);
      }
    } else if (item.trim()) {
      invalidEntries.push(item);
    }
  }

  const itemsToProcess = Array.from(parsedMap.values());
  if (itemsToProcess.length === 0) {
    return res.status(400).json({ error: 'No valid repositories or AUR packages found in input list' });
  }

  const results: Array<{
    owner: string;
    repo: string;
    sourceType?: 'github' | 'aur';
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }> = [];

  for (const invalid of invalidEntries) {
    results.push({
      owner: invalid,
      repo: '',
      status: 'failed',
      error: 'Invalid format (use owner/repo, gh:owner/repo, or aur:package)'
    });
  }

  let successCount = 0;
  let failCount = invalidEntries.length;
  let skippedCount = 0;

  for (const item of itemsToProcess) {
    const { owner, repo, sourceType } = item;
    try {
      if (sourceType === 'aur') {
        let aurInfo;
        try {
          aurInfo = await getAurPackageInfo(repo);
        } catch (err: any) {
          results.push({ owner: 'aur', repo, sourceType: 'aur', status: 'failed', error: err.message || 'AUR Package not found' });
          failCount++;
          continue;
        }

        const versionTag = aurInfo.Version;
        const ownerName = aurInfo.Maintainer || 'aur';
        const avatarUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Archlinux-icon-crystal-64.svg';

        const result = addRepo(ownerName, aurInfo.Name, {
          source_type: 'aur',
          description: aurInfo.Description,
          language: 'PKGBUILD',
          stargazers_count: aurInfo.NumVotes,
          popularity: aurInfo.Popularity,
          avatar_url: avatarUrl,
          last_tag: versionTag,
          include_prereleases: 0,
          check_interval: check_interval || 60,
          group_id: group_id ? parseInt(group_id) : null,
        });

        if (result.lastInsertRowid) {
          const repoId = Number(result.lastInsertRowid);
          addRelease({
            repo_id: repoId,
            tag_name: versionTag,
            name: `AUR ${aurInfo.Name} ${versionTag}`,
            body: `**Maintainer:** ${aurInfo.Maintainer || 'Orphaned'} | **Votes:** ${aurInfo.NumVotes} | **Popularity:** ${aurInfo.Popularity.toFixed(2)}${aurInfo.OutOfDate ? ' | ⚠️ **Out of Date**' : ''}\n\n${aurInfo.Description}\n\n[AUR Package Page](https://aur.archlinux.org/packages/${aurInfo.Name})${aurInfo.URL ? ` • [Upstream Website](${aurInfo.URL})` : ''}`,
            published_at: aurInfo.LastModified ? new Date(aurInfo.LastModified * 1000).toISOString() : new Date().toISOString(),
            html_url: `https://aur.archlinux.org/packages/${aurInfo.Name}`,
          });
        }

        results.push({ owner: 'aur', repo: aurInfo.Name, sourceType: 'aur', status: 'success' });
        successCount++;
      } else {
        // GitHub
        let details;
        try {
          details = await getRepoDetails(owner, repo);
        } catch (err: any) {
          if (err.response && err.response.status === 404) {
            results.push({ owner, repo, sourceType: 'github', status: 'failed', error: 'Repository not found on GitHub' });
            failCount++;
            continue;
          }
          throw err;
        }

        const release = await getLatestRelease(owner, repo, !!include_prereleases);
        const last_tag = release ? release.tag_name : null;

        const result = addRepo(owner, repo, {
          source_type: 'github',
          description: details.description,
          language: details.language,
          stargazers_count: details.stargazers_count,
          avatar_url: details.owner.avatar_url,
          last_tag,
          include_prereleases: include_prereleases ? 1 : 0,
          check_interval: check_interval || 60,
          group_id: group_id ? parseInt(group_id) : null,
        });

        try {
          const releases = await getGithubReleases(owner, repo, 5);
          if (result.lastInsertRowid) {
            const repoId = Number(result.lastInsertRowid);
            for (const rel of releases) {
              addRelease({
                repo_id: repoId,
                tag_name: rel.tag_name,
                name: rel.name,
                body: rel.body,
                published_at: rel.published_at,
                html_url: rel.html_url,
                prerelease: rel.prerelease ? 1 : 0
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch releases history for ${owner}/${repo}`, e);
        }

        results.push({ owner, repo, sourceType: 'github', status: 'success' });
        successCount++;
      }
    } catch (error: any) {
      if (error.message === 'Repository already monitored') {
        results.push({ owner, repo, sourceType: item.sourceType, status: 'skipped', error: 'Already monitored' });
        skippedCount++;
      } else {
        const msg = error.response?.data?.message || error.message || 'Failed to add repo';
        results.push({ owner, repo, sourceType: item.sourceType, status: 'failed', error: msg });
        failCount++;
      }
    }

    await new Promise(r => setTimeout(r, 300));
  }

  res.status(200).json({
    summary: {
      total: itemsToProcess.length + invalidEntries.length,
      successCount,
      failCount,
      skippedCount,
    },
    results,
  });
});

app.put('/api/repos/:id', (req, res) => {
  const { id } = req.params;
  const { check_interval, include_prereleases, installed_version, group_id } = req.body;

  try {
    const updates: any = {};
    if (check_interval !== undefined) updates.check_interval = check_interval;
    if (include_prereleases !== undefined) updates.include_prereleases = include_prereleases;
    if (installed_version !== undefined) updates.installed_version = installed_version;
    if (group_id !== undefined) updates.group_id = group_id === null ? null : parseInt(group_id);

    updateRepo(parseInt(id), updates);
    res.json({ message: 'Repo updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update repo' });
  }
});

app.delete('/api/repos/:id', (req, res) => {
  const { id } = req.params;
  try {
    removeRepo(parseInt(id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove repo' });
  }
});

app.get('/api/repos/:id/releases', async (req, res) => {
  const { id } = req.params;
  try {
    let releases = getDbReleases(parseInt(id));
    
    if (releases.length === 0) {
      const repo = getRepo(parseInt(id));
      if (repo) {
        if (repo.source_type === 'aur') {
          const aurInfo = await getAurPackageInfo(repo.repo);
          if (aurInfo) {
            addRelease({
              repo_id: repo.id,
              tag_name: aurInfo.Version,
              name: `AUR ${aurInfo.Name} ${aurInfo.Version}`,
              body: `**Maintainer:** ${aurInfo.Maintainer || 'Orphaned'} | **Votes:** ${aurInfo.NumVotes} | **Popularity:** ${aurInfo.Popularity.toFixed(2)}${aurInfo.OutOfDate ? ' | ⚠️ **Out of Date**' : ''}\n\n${aurInfo.Description}\n\n[AUR Package Page](https://aur.archlinux.org/packages/${aurInfo.Name})${aurInfo.URL ? ` • [Upstream Website](${aurInfo.URL})` : ''}`,
              published_at: aurInfo.LastModified ? new Date(aurInfo.LastModified * 1000).toISOString() : new Date().toISOString(),
              html_url: `https://aur.archlinux.org/packages/${aurInfo.Name}`,
            });
            releases = getDbReleases(parseInt(id));
          }
        } else {
          const githubReleases = await getGithubReleases(repo.owner, repo.repo);
          for (const rel of githubReleases) {
            addRelease({
              repo_id: repo.id,
              tag_name: rel.tag_name,
              name: rel.name,
              body: rel.body,
              published_at: rel.published_at,
              html_url: rel.html_url,
            });
          }
          releases = getDbReleases(parseInt(id));
        }
      }
    }
    
    res.json(releases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// Helper to update a single repo or AUR package
const updateRepoReleases = async (repo: any, forceRefresh = false) => {
  try {
    if (repo.source_type === 'aur') {
      const aurInfo = await getAurPackageInfo(repo.repo);
      if (aurInfo) {
        const versionTag = aurInfo.Version;
        const ownerName = aurInfo.Maintainer || 'aur';
        
        addRelease({
          repo_id: repo.id,
          tag_name: versionTag,
          name: `AUR ${aurInfo.Name} ${versionTag}`,
          body: `**Maintainer:** ${aurInfo.Maintainer || 'Orphaned'} | **Votes:** ${aurInfo.NumVotes} | **Popularity:** ${aurInfo.Popularity.toFixed(2)}${aurInfo.OutOfDate ? ' | ⚠️ **Out of Date**' : ''}\n\n${aurInfo.Description}\n\n[AUR Package Page](https://aur.archlinux.org/packages/${aurInfo.Name})${aurInfo.URL ? ` • [Upstream Website](${aurInfo.URL})` : ''}`,
          published_at: aurInfo.LastModified ? new Date(aurInfo.LastModified * 1000).toISOString() : new Date().toISOString(),
          html_url: `https://aur.archlinux.org/packages/${aurInfo.Name}`,
        });

        if (versionTag !== repo.last_tag) {
          console.log(`New release found for AUR ${repo.repo}: ${versionTag}`);
          updateLastTag(repo.id, versionTag);
        } else {
          touchRepo(repo.id);
        }

        updateRepo(repo.id, {
          owner: ownerName,
          description: aurInfo.Description,
          language: 'PKGBUILD',
          stargazers_count: aurInfo.NumVotes,
          popularity: aurInfo.Popularity,
          avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Archlinux-icon-crystal-64.svg',
        });
      }
    } else {
      // GitHub
      const release = await getLatestRelease(repo.owner, repo.repo, !!repo.include_prereleases, forceRefresh);
      if (release) {
        addRelease({
          repo_id: repo.id,
          tag_name: release.tag_name,
          name: release.name,
          body: release.body,
          published_at: release.published_at,
          html_url: release.html_url,
        });

        if (release.tag_name !== repo.last_tag) {
          console.log(`New release found for ${repo.owner}/${repo.repo}: ${release.tag_name}`);
          updateLastTag(repo.id, release.tag_name);
        } else {
          touchRepo(repo.id);
        }
      }
      
      try {
        const details = await getRepoDetails(repo.owner, repo.repo, forceRefresh);
        updateRepo(repo.id, {
          description: details.description,
          language: details.language,
          stargazers_count: details.stargazers_count,
          avatar_url: details.owner.avatar_url,
        });
      } catch (error) {
        console.error(`Failed to update details for ${repo.owner}/${repo.repo}`, error);
      }
    }
  } catch (error) {
    console.error(`Error checking release for ${repo.owner}/${repo.repo}:`, error);
    throw error;
  }
};

// Background Job
const checkReleases = async () => {
  console.log('Checking for new releases...');
  const repos = getRepos();
  for (const repo of repos) {
    try {
      await updateRepoReleases(repo, false); // Use cache for background checks
      // Add a small delay between requests to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        console.error('Rate limit exceeded. Stopping update loop.');
        break;
      }
      // Continue with next repo if it's not a rate limit error
      console.error(`Failed to update ${repo.owner}/${repo.repo}, continuing...`);
    }
  }
};

app.post('/api/repos/:id/refresh', async (req, res) => {
  const { id } = req.params;
  try {
    const repo = getRepo(parseInt(id));
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    
    await updateRepoReleases(repo, true); // Force refresh for manual requests
    
    const updatedRepo = getRepo(parseInt(id));
    res.json(updatedRepo);
  } catch (error: any) {
    console.error(error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'GitHub API rate limit exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to refresh repo' });
  }
});

// Schedule check every hour (or configured interval)
cron.schedule(`*/${config.checkInterval} * * * *`, checkReleases);

// Initial check on startup - REMOVED to prevent rate limiting on restart
// checkReleases();

import path from 'path';

// ... (imports)

// Vite Middleware
if (process.env.NODE_ENV === 'production') {
  // Serve static files from dist
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // Handle SPA routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
