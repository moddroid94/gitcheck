import React, { useState } from 'react';
import { Star, ArrowUpCircle, CheckCircle, RefreshCw, ChevronRight, FileText, User, ThumbsUp, Flame, Bell, BellOff, Settings, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { Repo } from '../types';
import { ReleaseModal } from './ReleaseModal';

interface RepoCardProps {
  repo: Repo;
  onDelete: (id: number) => void;
  onSelect: (repo: Repo) => void;
  onUpdate: () => void;
}

const markdownComponents = {
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </a>
  ),
};

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onDelete, onSelect, onUpdate }) => {
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasUpdate = repo.installed_version && repo.last_tag && repo.installed_version !== repo.last_tag;
  const isUpToDate = repo.installed_version && repo.last_tag && repo.installed_version === repo.last_tag;

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      await axios.post(`/api/repos/${repo.id}/refresh`);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to refresh repo', error);
      const errorMessage = error.response?.data?.error || error.message;
      if (error.response?.status === 403) {
        alert(`Rate Limit Exceeded: ${errorMessage}`);
      } else {
        alert(`Failed to refresh: ${errorMessage}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const getLastChecked = () => {
    if (!repo.updated_at) return null;
    try {
      const dateStr = repo.updated_at.replace(' ', 'T') + (repo.updated_at.includes('Z') ? '' : 'Z');
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  };

  const isAur = repo.source_type === 'aur';

  return (
    <>
      <div
        className={`bg-white dark:bg-[#18181b] border font-mono transition-all flex flex-col h-full ${
          hasUpdate
            ? 'border-amber-400/60 dark:border-amber-500/50 ring-1 ring-amber-500/20'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500/80 dark:hover:border-blue-500/80'
        } p-5 gap-4 relative shadow-sm`}
      >
        {/* Repo ID & Title Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider font-mono ${
                  isAur
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {isAur ? 'AUR' : 'GITHUB'}
              </span>
              {repo.group_name && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.65rem] font-medium border uppercase"
                  style={{
                    borderColor: (repo.group_color || '#3B82F6') + '60',
                    backgroundColor: (repo.group_color || '#3B82F6') + '15',
                    color: repo.group_color || '#3B82F6',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5"
                    style={{ backgroundColor: repo.group_color || '#3B82F6' }}
                  />
                  {repo.group_name}
                </span>
              )}
            </div>

            <h3 className="font-syne font-extrabold text-gray-900 dark:text-white text-xl tracking-tight uppercase leading-tight truncate">
              <a
                href={
                  isAur
                    ? `https://aur.archlinux.org/packages/${repo.repo}`
                    : `https://github.com/${repo.owner}/${repo.repo}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {repo.repo}
              </a>
            </h3>

            <div className="text-[0.7rem] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2 flex-wrap uppercase tracking-wider font-mono">
              <span>{isAur ? `AUR / ${repo.owner || 'Orphaned'}` : `GITHUB / ${repo.owner}`}</span>
              {!isAur && repo.language && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{repo.language}</span>
                </>
              )}
              {!isAur && repo.stargazers_count !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 inline" /> {repo.stargazers_count} Stars
                  </span>
                </>
              )}
              {isAur && repo.stargazers_count !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ThumbsUp className="w-3 h-3 inline" /> {repo.stargazers_count} Votes
                  </span>
                </>
              )}
              {isAur && repo.popularity !== undefined && repo.popularity !== null && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Flame className="w-3 h-3 inline" /> {repo.popularity.toFixed(2)} Pop
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Repo Avatar */}
          {repo.avatar_url ? (
            <img
              src={repo.avatar_url}
              alt={repo.owner}
              className="w-10 h-10 border border-zinc-200 dark:border-zinc-700 object-contain p-0.5 bg-white dark:bg-zinc-800 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold font-syne text-lg shrink-0">
              {repo.owner[0]?.toUpperCase() || 'A'}
            </div>
          )}
        </div>

        {/* Stat Item Blocks (Technical Utility UI) */}
        <div className="grid grid-cols-2 gap-3 my-1">
          <div className="p-3 bg-zinc-50 dark:bg-black/40 border-l-2 border-blue-500">
            <div className="text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span className="truncate">{repo.installed_version || 'NOT SET'}</span>
              {isUpToDate && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 ml-1" />}
            </div>
            <div className="text-[0.6rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">
              INSTALLED
            </div>
          </div>

          <div
            className={`p-3 bg-zinc-50 dark:bg-black/40 border-l-2 ${
              hasUpdate ? 'border-amber-500' : 'border-zinc-400 dark:border-zinc-600'
            }`}
          >
            <div className="text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span className={`truncate ${hasUpdate ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {repo.last_tag || 'UNKNOWN'}
              </span>
              {hasUpdate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(repo);
                  }}
                  className="px-1.5 py-0.5 text-[0.6rem] font-mono font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors shrink-0 ml-1"
                  title="Click to update installed version"
                >
                  UPDATE
                </button>
              )}
            </div>
            <div className="text-[0.6rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">
              LATEST
            </div>
          </div>
        </div>

        {/* Changelog Section */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 flex-grow flex flex-col justify-between">
          <div>
            <div className="text-[0.65rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                LATEST CHANGELOG
              </span>
              {repo.latest_release_published_at && (
                <span className="text-[0.6rem] text-zinc-400 dark:text-zinc-500">
                  {formatDistanceToNow(new Date(repo.latest_release_published_at), { addSuffix: true })}
                </span>
              )}
            </div>

            {repo.latest_release_body ? (
              <div
                className="relative cursor-pointer group/changelog"
                onClick={() => setShowReleaseModal(true)}
              >
                <div className="prose prose-xs max-w-none text-zinc-600 dark:text-zinc-300 line-clamp-3 text-xs font-mono dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {repo.latest_release_body}
                  </ReactMarkdown>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-50 dark:from-zinc-950/80 to-transparent pointer-events-none" />
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic font-mono">
                No changelog available.
              </p>
            )}
          </div>

          {repo.latest_release_body && (
            <button
              onClick={() => setShowReleaseModal(true)}
              className="mt-2 text-[0.65rem] font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 uppercase tracking-wider flex items-center gap-1 w-fit"
            >
              READ FULL CHANGELOG <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Technical Footer Actions */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[0.65rem] font-mono text-zinc-500 dark:text-zinc-400 mt-auto">
          <span>{repo.updated_at ? `CHECKED: ${getLastChecked()}` : `ID: ${repo.id}`}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const nextVal = repo.notifications_enabled === 0 ? 1 : 0;
                try {
                  await axios.put(`/api/repos/${repo.id}`, { notifications_enabled: nextVal });
                  onUpdate();
                } catch (err) {
                  console.error('Failed to toggle notifications', err);
                }
              }}
              className={`px-2 py-1 border text-[0.65rem] uppercase font-mono transition-colors flex items-center gap-1 ${
                repo.notifications_enabled !== 0
                  ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
              title={repo.notifications_enabled !== 0 ? 'Notifications Enabled (Click to Mute)' : 'Notifications Muted (Click to Enable)'}
            >
              {repo.notifications_enabled !== 0 ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              <span>{repo.notifications_enabled !== 0 ? 'ON' : 'MUTED'}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[0.65rem] uppercase font-mono flex items-center gap-1 transition-colors ${
                refreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''
              }`}
              title="Check for updates"
            >
              <RefreshCw className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(repo);
              }}
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[0.65rem] uppercase font-mono flex items-center gap-1 transition-colors"
              title="Settings & Details"
            >
              <Settings className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(repo.id);
              }}
              className="px-2 py-1 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-[0.65rem] uppercase font-mono flex items-center gap-1 transition-colors"
              title="Delete Repository"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {showReleaseModal && (
        <ReleaseModal
          isOpen={showReleaseModal}
          onClose={() => setShowReleaseModal(false)}
          release={{
            id: repo.id,
            name: repo.latest_release_name,
            tag_name: repo.last_tag,
            body: repo.latest_release_body,
            published_at: repo.latest_release_published_at,
            html_url: repo.latest_release_html_url,
            owner: repo.owner,
            repo: repo.repo,
            repo_id: repo.id,
          }}
          installedVersion={repo.installed_version}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};
