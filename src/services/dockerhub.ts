import axios from 'axios';

export interface DockerHubRepoInfo {
  name: string;
  namespace: string;
  description: string | null;
  star_count: number;
  pull_count: number;
  last_updated: string | null;
  repository_type?: string;
}

export interface DockerHubTagImage {
  architecture: string;
  os: string;
  size: number;
  digest?: string;
  status?: string;
}

export interface DockerHubTag {
  name: string;
  last_updated: string | null;
  tag_last_pushed?: string | null;
  full_size: number;
  digest?: string;
  images?: DockerHubTagImage[];
}

export interface NormalizedDockerRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
}

const dockerHubApi = axios.create({
  baseURL: 'https://hub.docker.com/v2',
  timeout: 12000,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'GitMonitor-Release-Monitor/1.0',
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

export const getDockerHubUrl = (namespace: string, repo: string): string => {
  const ns = namespace || 'library';
  if (ns === 'library') {
    return `https://hub.docker.com/_/${repo}`;
  }
  return `https://hub.docker.com/r/${ns}/${repo}`;
};

export const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export const formatCompactCount = (count?: number): string => {
  if (count === undefined || count === null) return '0';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

const isArtifactOrSignatureTag = (tagName: string): boolean => {
  return /^sha256-|\.(sig|att|sbom)$/i.test(tagName);
};

const isPrereleaseTag = (tagName: string): boolean => {
  return /(^|[-_.])(alpha|beta|rc\d*|dev|devel|nightly|canary|preview|snapshot|test|unstable)([-_.]|$)/i.test(tagName);
};

const isGenericRollingTag = (tagName: string): boolean => {
  return /^(latest|edge|nightly|canary|dev|devel|main|master|stable|mainline|alpine|bookworm|bullseye|trixie|jammy|noble|slim|full)(-(alpine|slim|bookworm|bullseye|trixie|jammy|noble|perl|otel))?$/i.test(
    tagName
  );
};

const isVersionedTag = (tagName: string): boolean => {
  return /^v?\d+(\.\d+)*/.test(tagName);
};

export const buildDockerReleaseBody = (
  namespace: string,
  repo: string,
  tag: DockerHubTag,
  repoInfo?: DockerHubRepoInfo | null
): string => {
  const hubUrl = getDockerHubUrl(namespace, repo);
  const tagUrl =
    namespace === 'library'
      ? `https://hub.docker.com/_/${repo}/tags?name=${encodeURIComponent(tag.name)}`
      : `https://hub.docker.com/r/${namespace}/${repo}/tags?name=${encodeURIComponent(tag.name)}`;

  const archList = Array.from(
    new Set(
      (tag.images || [])
        .filter((img) => img.architecture && img.architecture !== 'unknown')
        .map((img) => `${img.os || 'linux'}/${img.architecture}`)
    )
  );

  const lines: string[] = [
    `**Image:** \`${namespace}/${repo}:${tag.name}\` | **Size:** ${formatBytes(tag.full_size)}`,
  ];

  if (tag.digest) {
    lines.push(`**Digest:** \`${tag.digest}\``);
  }
  if (archList.length > 0) {
    lines.push(`**Platforms:** ${archList.join(', ')}`);
  }
  if (repoInfo) {
    lines.push(
      `**Stars:** ${repoInfo.star_count.toLocaleString()} | **Pulls:** ${formatCompactCount(repoInfo.pull_count)}`
    );
    if (repoInfo.description) {
      lines.push('', repoInfo.description);
    }
  }

  lines.push('', `[View Tag on Docker Hub](${tagUrl}) • [Docker Hub Repository](${hubUrl})`);
  return lines.join('\n');
};

export const normalizeDockerTag = (
  namespace: string,
  repo: string,
  tag: DockerHubTag,
  repoInfo?: DockerHubRepoInfo | null
): NormalizedDockerRelease => {
  const publishedAt = tag.tag_last_pushed || tag.last_updated || new Date().toISOString();
  const tagUrl =
    namespace === 'library'
      ? `https://hub.docker.com/_/${repo}/tags?name=${encodeURIComponent(tag.name)}`
      : `https://hub.docker.com/r/${namespace}/${repo}/tags?name=${encodeURIComponent(tag.name)}`;

  return {
    tag_name: tag.name,
    name: `${namespace}/${repo}:${tag.name}`,
    body: buildDockerReleaseBody(namespace, repo, tag, repoInfo),
    published_at: publishedAt,
    html_url: tagUrl,
    prerelease: isPrereleaseTag(tag.name),
  };
};

export const getDockerRepoDetails = async (
  namespace: string,
  repo: string,
  forceRefresh = false
): Promise<DockerHubRepoInfo> => {
  const ns = (namespace || 'library').trim();
  const name = repo.trim();
  const cacheKey = `docker:details:${ns}/${name}`;

  if (!forceRefresh) {
    const cached = getCachedData<DockerHubRepoInfo>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await dockerHubApi.get<DockerHubRepoInfo>(`/repositories/${ns}/${name}`);
    setCachedData(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Docker Hub image '${ns}/${name}' not found`);
    }
    throw new Error(`Docker Hub API error: ${error.message}`);
  }
};

export const getDockerRepoAvatar = async (
  namespace: string,
  repo: string,
  forceRefresh = false
): Promise<string | null> => {
  const ns = (namespace || 'library').trim();
  const name = repo.trim();
  const cacheKey = `docker:avatar:${ns}/${name}`;

  if (!forceRefresh) {
    const cached = getCachedData<string | null>(cacheKey);
    if (cached !== null) return cached;
  }

  let avatarUrl: string | null = null;

  try {
    const queryTerm = ns === 'library' ? name : `${ns}/${name}`;
    const catalogRes = await axios.get<{
      results?: Array<{
        id?: string;
        slug?: string;
        logo_url?: { large?: string; small?: string };
      }>;
    }>('https://hub.docker.com/api/search/v3/catalog/search', {
      params: { query: queryTerm, from: 0, size: 5 },
      timeout: 8000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GitMonitor-Release-Monitor/1.0',
      },
    });

    const expectedId = `${ns}/${name}`.toLowerCase();
    const expectedSlug = queryTerm.toLowerCase();
    const hit = (catalogRes.data?.results || []).find(
      (item) =>
        item.id?.toLowerCase() === expectedId ||
        item.slug?.toLowerCase() === expectedSlug
    );

    const logo = hit?.logo_url?.large || hit?.logo_url?.small;
    if (logo && logo.trim()) {
      avatarUrl = logo.trim();
    }
  } catch {
    // Non-blocking fallback to user gravatar lookup below
  }

  if (!avatarUrl && ns !== 'library') {
    try {
      const userRes = await dockerHubApi.get<{ gravatar_url?: string }>(`/users/${ns}`, {
        timeout: 8000,
      });
      if (userRes.data?.gravatar_url && userRes.data.gravatar_url.trim()) {
        avatarUrl = userRes.data.gravatar_url.trim();
      }
    } catch {
      // Ignore user profile lookup failures
    }
  }

  if (avatarUrl) {
    setCachedData(cacheKey, avatarUrl);
  }
  return avatarUrl;
};

export const getDockerTags = async (
  namespace: string,
  repo: string,
  limit = 25,
  forceRefresh = false
): Promise<DockerHubTag[]> => {
  const ns = (namespace || 'library').trim();
  const name = repo.trim();
  const cacheKey = `docker:tags:${ns}/${name}:${limit}`;

  if (!forceRefresh) {
    const cached = getCachedData<DockerHubTag[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await dockerHubApi.get<{ results?: DockerHubTag[] }>(
      `/repositories/${ns}/${name}/tags`,
      {
        params: {
          page_size: limit,
          ordering: 'last_updated',
        },
      }
    );
    const tags = (response.data?.results || []).filter((t) => t.name && !isArtifactOrSignatureTag(t.name));
    setCachedData(cacheKey, tags);
    return tags;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(`Docker Hub tags error: ${error.message}`);
  }
};

export const getLatestDockerRelease = async (
  namespace: string,
  repo: string,
  includePrereleases = false,
  forceRefresh = false,
  repoInfo?: DockerHubRepoInfo | null
): Promise<NormalizedDockerRelease | null> => {
  const ns = (namespace || 'library').trim();
  const name = repo.trim();
  const tags = await getDockerTags(ns, name, 25, forceRefresh);
  if (tags.length === 0) return null;

  const eligible = includePrereleases ? tags : tags.filter((t) => !isPrereleaseTag(t.name));
  const pool = eligible.length > 0 ? eligible : tags;

  // Prefer an explicit versioned tag (e.g., 1.31.8-alpine, v2.4.0) over rolling aliases like "latest" or "stable"
  const selectedTag =
    pool.find((t) => isVersionedTag(t.name) && !isGenericRollingTag(t.name)) ||
    pool.find((t) => !isGenericRollingTag(t.name)) ||
    pool[0];

  return normalizeDockerTag(ns, name, selectedTag, repoInfo);
};

export const getDockerReleases = async (
  namespace: string,
  repo: string,
  limit = 15,
  repoInfo?: DockerHubRepoInfo | null
): Promise<NormalizedDockerRelease[]> => {
  const ns = (namespace || 'library').trim();
  const name = repo.trim();
  const tags = await getDockerTags(ns, name, limit, true);
  return tags.map((tag) => normalizeDockerTag(ns, name, tag, repoInfo));
};
