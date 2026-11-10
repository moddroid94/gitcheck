import React, { useState } from 'react';
import {
  Star,
  Trash2,
  Settings,
  ArrowUpCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  ThumbsUp,
  Flame,
  Bell,
  BellOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { Repo } from '../types';
import { ReleaseModal } from './ReleaseModal';

interface RepoRowProps {
  repo: Repo;
  onDelete: (id: number) => void;
  onSelect: (repo: Repo) => void;
  onUpdate: () => void;
}

export const RepoRow: React.FC<RepoRowProps> = ({ repo, onDelete, onSelect, onUpdate }) => {
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasUpdate = repo.installed_version && repo.last_tag && repo.installed_version !== repo.last_tag;
  const isUpToDate = repo.installed_version && repo.last_tag && repo.installed_version === repo.last_tag;
  const isAur = repo.source_type === 'aur';

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
    if (!repo.updated_at) return '—';
    try {
      const dateStr = repo.updated_at.replace(' ', 'T') + (repo.updated_at.includes('Z') ? '' : 'Z');
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <>
      <tr className={`border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors ${hasUpdate ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''}`}>
        {/* Repo & Info Column */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {repo.avatar_url ? (
              <img
                src={repo.avatar_url}
                alt={repo.owner}
                className="w-8 h-8 border border-zinc-300 dark:border-zinc-700 object-contain p-0.5 bg-white dark:bg-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold font-syne text-xs shrink-0">
                {repo.owner[0]?.toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider font-mono ${
                    isAur
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isAur ? 'AUR' : 'GITHUB'}
                </span>
                <a
                  href={isAur ? `https://aur.archlinux.org/packages/${repo.repo}` : `https://github.com/${repo.owner}/${repo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-syne font-extrabold text-sm uppercase text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[200px] sm:max-w-[280px]"
                >
                  {repo.repo}
                </a>
                {repo.group_name && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.6rem] font-medium border uppercase"
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
              <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5 truncate">
                {isAur ? `MAINTAINER: ${repo.owner || 'ORPHANED'}` : repo.owner}
              </p>
            </div>
          </div>
        </td>

        {/* Installed Version Column */}
        <td className="py-3 px-4 font-mono">
          <div className="flex items-center gap-1.5">
            {repo.installed_version ? (
              <>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{repo.installed_version}</span>
                {isUpToDate && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 italic">NOT SET</span>
            )}
          </div>
        </td>

        {/* Latest Version Column */}
        <td className="py-3 px-4 font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold ${
                hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {repo.last_tag || 'UNKNOWN'}
            </span>
            {hasUpdate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(repo);
                }}
                className="px-1.5 py-0.5 text-[0.6rem] font-mono font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors shrink-0"
                title="Click to update installed version"
              >
                <ArrowUpCircle className="w-3 h-3 inline mr-0.5" />
                UPDATE
              </button>
            )}
          </div>
        </td>

        {/* Stats Column */}
        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 uppercase">
          {isAur ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold" title="Votes">
                <ThumbsUp className="w-3 h-3" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </span>
              {repo.popularity !== undefined && repo.popularity !== null && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold" title="Popularity">
                  <Flame className="w-3 h-3" />
                  {repo.popularity.toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {repo.language && (
                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                  {repo.language}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </span>
            </div>
          )}
        </td>

        {/* Last Checked */}
        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[0.65rem] uppercase">
          {getLastChecked()}
        </td>

        {/* Actions Column */}
        <td className="py-3 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            {repo.latest_release_body && (
              <button
                onClick={() => setShowReleaseModal(true)}
                className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[0.65rem] font-mono uppercase"
                title="View Release Changelog"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
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
              className={`px-2 py-1 border text-[0.65rem] font-mono uppercase ${
                repo.notifications_enabled !== 0
                  ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
              title={repo.notifications_enabled !== 0 ? 'Notifications Enabled (Click to Mute)' : 'Notifications Muted (Click to Enable)'}
            >
              {repo.notifications_enabled !== 0 ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[0.65rem] font-mono uppercase ${
                refreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''
              }`}
              title="Check for updates"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(repo);
              }}
              className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[0.65rem] font-mono uppercase"
              title="Settings & Details"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(repo.id);
              }}
              className="px-2 py-1 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-[0.65rem] font-mono uppercase"
              title="Delete Repository"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

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
