import React, { useState } from 'react';
import {
  Star,
  Trash2,
  Settings,
  ArrowUpCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  User,
  ThumbsUp,
  Flame,
  Bell,
  BellOff,
  ExternalLink,
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
      <tr className={`border-b border-gray-200 dark:border-gray-700/80 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition-colors ${hasUpdate ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
        {/* Repo & Info Column */}
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            {repo.avatar_url ? (
              <img
                src={repo.avatar_url}
                alt={repo.owner}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-contain p-0.5 bg-white dark:bg-gray-800 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs shrink-0">
                {repo.owner[0]?.toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isAur
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isAur ? 'AUR' : 'GitHub'}
                </span>
                <a
                  href={isAur ? `https://aur.archlinux.org/packages/${repo.repo}` : `https://github.com/${repo.owner}/${repo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm truncate max-w-[200px] sm:max-w-[280px]"
                >
                  {repo.repo}
                </a>
                {repo.group_name && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                    style={{
                      borderColor: (repo.group_color || '#3B82F6') + '50',
                      backgroundColor: (repo.group_color || '#3B82F6') + '15',
                      color: repo.group_color || '#3B82F6',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: repo.group_color || '#3B82F6' }}
                    />
                    {repo.group_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {isAur ? `Maintainer: ${repo.owner || 'Orphaned'}` : repo.owner}
              </p>
            </div>
          </div>
        </td>

        {/* Installed Version Column */}
        <td className="py-3.5 px-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            {repo.installed_version ? (
              <>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{repo.installed_version}</span>
                {isUpToDate && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
            )}
          </div>
        </td>

        {/* Latest Version Column */}
        <td className="py-3.5 px-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {repo.last_tag || 'Unknown'}
            </span>
            {hasUpdate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(repo);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 uppercase tracking-wide hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors cursor-pointer shrink-0"
                title="Click to update installed version"
              >
                <ArrowUpCircle className="w-3 h-3" />
                Update
              </button>
            )}
          </div>
        </td>

        {/* Stats Column */}
        <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400">
          {isAur ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium" title="Votes">
                <ThumbsUp className="w-3 h-3" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </span>
              {repo.popularity !== undefined && repo.popularity !== null && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium" title="Popularity">
                  <Flame className="w-3 h-3" />
                  {repo.popularity.toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {repo.language && (
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {repo.language}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </span>
            </div>
          )}
        </td>

        {/* Last Checked */}
        <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {getLastChecked()}
        </td>

        {/* Actions Column */}
        <td className="py-3.5 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            {repo.latest_release_body && (
              <button
                onClick={() => setShowReleaseModal(true)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="View Release Changelog"
              >
                <FileText className="w-4 h-4" />
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
              className={`p-1.5 rounded-lg transition-colors ${
                repo.notifications_enabled !== 0
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-60 hover:opacity-100'
              }`}
              title={repo.notifications_enabled !== 0 ? 'Notifications Enabled (Click to Mute)' : 'Notifications Muted (Click to Enable)'}
            >
              {repo.notifications_enabled !== 0 ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors ${
                refreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''
              }`}
              title="Check for updates"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(repo);
              }}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings & Details"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(repo.id);
              }}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete Repository"
            >
              <Trash2 className="w-4 h-4" />
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
