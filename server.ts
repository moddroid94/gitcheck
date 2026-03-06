import express from 'express';
import { createServer as createViteServer } from 'vite';
import { getRepos, addRepo, removeRepo, updateLastTag, updateRepo, addRelease, getReleases as getDbReleases, getRepo, touchRepo } from './src/db';
import { getLatestRelease, getRepoDetails, getReleases as getGithubReleases } from './src/services/github';
import cron from 'node-cron';
import { config } from './src/config';

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
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
  const { owner, repo, check_interval, include_prereleases, installed_version } = req.body;
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    // Fetch repo details
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
    const release = await getLatestRelease(owner, repo, !!include_prereleases); // Use the user's preference
    const last_tag = release ? release.tag_name : null;

    const result = addRepo(owner, repo, {
      description: details.description,
      language: details.language,
      stargazers_count: details.stargazers_count,
      avatar_url: details.owner.avatar_url,
      last_tag,
      include_prereleases: include_prereleases ? 1 : 0,
      check_interval: check_interval || 60,
      installed_version: installed_version || null,
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
      return res.status(409).json({ error: 'Repository already monitored' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to add repo' });
  }
});

app.put('/api/repos/:id', (req, res) => {
  const { id } = req.params;
  const { check_interval, include_prereleases, installed_version } = req.body;

  try {
    const updates: any = {};
    if (check_interval !== undefined) updates.check_interval = check_interval;
    if (include_prereleases !== undefined) updates.include_prereleases = include_prereleases;
    if (installed_version !== undefined) updates.installed_version = installed_version;

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
    // First try to get from DB
    let releases = getDbReleases(parseInt(id));
    
    // If no releases in DB, fetch from GitHub and populate
    if (releases.length === 0) {
      const repo = getRepo(parseInt(id));
      if (repo) {
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
    
    res.json(releases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// Helper to update a single repo
const updateRepoReleases = async (repo: any, forceRefresh = false) => {
  try {
    // Check for releases
    const release = await getLatestRelease(repo.owner, repo.repo, !!repo.include_prereleases, forceRefresh);
    if (release) {
      // Always try to add the release to DB (IGNORE if exists)
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
    
    // Update repo details (stars, description, etc.)
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
      // Don't throw here, as we might have successfully updated the release info
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
