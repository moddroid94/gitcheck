import React, { useState } from 'react';
import { Star, GitBranch, Calendar, ExternalLink, Trash2, Settings, ArrowUpCircle, CheckCircle, RefreshCw, ChevronRight, FileText, User, ThumbsUp, Flame, Bell, BellOff } from 'lucide-react';
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
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all flex flex-col h-full group ${hasUpdate ? 'border-amber-200 dark:border-amber-900/50 ring-1 ring-amber-100 dark:ring-amber-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md'}`}>
        
        {/* Header Section */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {repo.avatar_url ? (
                <img src={repo.avatar_url} alt={repo.owner} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-600 object-contain p-0.5 bg-white dark:bg-gray-800 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-lg shrink-0">
                  {repo.owner[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isAur ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                    {isAur ? 'AUR' : 'GitHub'}
                  </span>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight text-lg">
                    <a
                      href={isAur ? `https://aur.archlinux.org/packages/${repo.repo}` : `https://github.com/${repo.owner}/${repo.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {repo.repo}
                    </a>
                  </h3>
                  {repo.group_name && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  {isAur ? (
                    <>
                      <User className="w-3.5 h-3.5 text-purple-500" />
                      <span>Maintainer: <strong className="text-gray-700 dark:text-gray-300">{repo.owner || 'Orphaned'}</strong></span>
                    </>
                  ) : (
                    <span>{repo.owner}</span>
                  )}
                </p>
              </div>
            </div>
            
              {/* Actions */}
              <div className="flex gap-1 shrink-0">
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
                  className={`p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors ${refreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`}
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
          </div>
        </div>

        {/* Version Status Section */}
        <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/30 grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Installed</p>
            <div className="flex items-center gap-2">
              {repo.installed_version ? (
                <>
                  <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{repo.installed_version}</span>
                  {isUpToDate && <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />}
                </>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500 italic">Not set</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Latest</p>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-semibold ${hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`}>
                {repo.last_tag || 'Unknown'}
              </span>
              {hasUpdate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(repo);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 uppercase tracking-wide hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors cursor-pointer"
                  title="Click to update installed version"
                >
                  <ArrowUpCircle className="w-3 h-3" />
                  Update
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Changelog Preview Section */}
        <div className="p-5 flex-grow flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              What's New
            </h4>
            {repo.latest_release_published_at && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDistanceToNow(new Date(repo.latest_release_published_at), { addSuffix: true })}
              </span>
            )}
          </div>
          
          {repo.latest_release_body ? (
            <div 
              className="relative flex-grow cursor-pointer group/changelog"
              onClick={() => setShowReleaseModal(true)}
            >
              <div className="prose prose-xs max-w-none text-gray-600 dark:text-gray-300 line-clamp-4 group-hover/changelog:text-gray-900 dark:group-hover/changelog:text-white transition-colors dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {repo.latest_release_body}
                </ReactMarkdown>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div>
              <button className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover/changelog:opacity-100 transition-opacity">
                Read full changelog <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No changelog available.</p>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 rounded-b-xl">
          {isAur ? (
            <div className="flex items-center gap-3 overflow-x-auto">
              <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40" title="AUR Package Maintainer">
                <User className="w-3 h-3 text-purple-500" />
                <span className="font-medium truncate max-w-[100px]">{repo.owner || 'Orphaned'}</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40" title="AUR Package Votes">
                <ThumbsUp className="w-3 h-3 text-emerald-500" />
                <span className="font-semibold">{repo.stargazers_count?.toLocaleString() || 0}</span>
              </div>
              {repo.popularity !== undefined && repo.popularity !== null && (
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40" title="AUR Package Popularity">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold">{repo.popularity.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {repo.language && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {repo.language}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </div>
            </div>
          )}
          <div className="shrink-0 text-[11px]">
             {repo.updated_at && getLastChecked()}
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
            repo_id: repo.id
          }}
          installedVersion={repo.installed_version}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};
