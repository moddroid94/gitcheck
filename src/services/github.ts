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
      setCachedData(cacheKey, response.data[0]);
      return response.data[0];
    } else {
      const response = await githubApi.get(`/repos/${owner}/${repo}/releases/latest`);
      setCachedData(cacheKey, response.data);
      return response.data;
    }
  } catch (error: any) {
    // 404 means no releases found, which is valid. Other errors should be thrown.
    if (error.response && error.response.status === 404) {
      return null;
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
    return response.data;
  } catch (error) {
    return [];
  }
};
