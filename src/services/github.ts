import axios from 'axios';
import { config } from '../config';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: config.githubToken ? `token ${config.githubToken}` : undefined,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Release-Monitor',
  },
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const getCachedData = <T>(key: string): T | null => {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
};

const setCachedData = <T>(key: string, data: T) => {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
};

export const getRepoDetails = async (owner: string, repo: string, forceRefresh = false) => {
  const cacheKey = `details:${owner}/${repo}`;
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}`);
    setCachedData(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`GitHub API Error (getRepoDetails): ${error.message}`);
    if (error.response?.headers) {
      console.error('Rate Limit Remaining:', error.response.headers['x-ratelimit-remaining']);
      console.error('Rate Limit Reset:', new Date(error.response.headers['x-ratelimit-reset'] * 1000).toLocaleString());
    }
    throw error;
  }
};

const getLatestTagAsRelease = async (owner: string, repo: string) => {
  try {
    const tagsResponse = await githubApi.get(`/repos/${owner}/${repo}/tags?per_page=1`);
    const tag = tagsResponse.data?.[0];
    if (!tag) return null;
    return {
      tag_name: tag.name,
      name: tag.name,
      body: `Detected Git tag \`${tag.name}\` (this repository uses Git tags without formal GitHub Releases).`,
      published_at: new Date().toISOString(),
      html_url: `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag.name)}`,
      prerelease: false,
    };
  } catch {
    return null;
  }
};

export const getLatestRelease = async (owner: string, repo: string, includePrereleases = false, forceRefresh = false) => {
  const cacheKey = `release:${owner}/${repo}:${includePrereleases}`;
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  try {
    if (includePrereleases) {
      // If including prereleases, we need to fetch the list and take the first one
      const response = await githubApi.get(`/repos/${owner}/${repo}/releases?per_page=1`);
      if (response.data && response.data.length > 0) {
        setCachedData(cacheKey, response.data[0]);
        return response.data[0];
      }
      const tagFallback = await getLatestTagAsRelease(owner, repo);
      if (tagFallback) {
        setCachedData(cacheKey, tagFallback);
      }
      return tagFallback;
    } else {
      const response = await githubApi.get(`/repos/${owner}/${repo}/releases/latest`);
      setCachedData(cacheKey, response.data);
      return response.data;
    }
  } catch (error: any) {
    // 404 means no formal releases found; fallback to latest Git tag
    if (error.response && error.response.status === 404) {
      const tagFallback = await getLatestTagAsRelease(owner, repo);
      if (tagFallback) {
        setCachedData(cacheKey, tagFallback);
      }
      return tagFallback;
    }
    console.error(`GitHub API Error (getLatestRelease): ${error.message}`);
    if (error.response?.headers) {
      console.error('Rate Limit Remaining:', error.response.headers['x-ratelimit-remaining']);
      console.error('Rate Limit Reset:', new Date(error.response.headers['x-ratelimit-reset'] * 1000).toLocaleString());
    }
    throw error;
  }
};

export const getReleases = async (owner: string, repo: string, limit: number = 30) => {
  // We generally don't cache the list of releases as it's usually a user-initiated action to view them
  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}/releases?per_page=${limit}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    const tagsResponse = await githubApi.get(`/repos/${owner}/${repo}/tags?per_page=${limit}`);
    if (Array.isArray(tagsResponse.data)) {
      return tagsResponse.data.map((tag: any) => ({
        tag_name: tag.name,
        name: tag.name,
        body: `Git tag \`${tag.name}\``,
        published_at: new Date().toISOString(),
        html_url: `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag.name)}`,
        prerelease: false,
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
};
