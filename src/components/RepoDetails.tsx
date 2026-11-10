import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Loader2, Save, CheckCircle, User, ThumbsUp, Flame, ExternalLink, Bell, BellOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { Repo, Release, Group } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface RepoDetailsProps {
  repo: Repo;
  onClose: () => void;
  onUpdate: () => void;
  groups?: Group[];
}

const markdownComponents = {
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 font-mono"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </a>
  ),
};

export const RepoDetails: React.FC<RepoDetailsProps> = ({ repo, onClose, onUpdate, groups = [] }) => {
  const [activeTab, setActiveTab] = useState<'changelog' | 'settings'>('changelog');
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInterval, setCheckInterval] = useState(repo.check_interval || 60);
  const [includePrereleases, setIncludePrereleases] = useState(!!repo.include_prereleases);
  const [notificationsEnabled, setNotificationsEnabled] = useState(repo.notifications_enabled !== 0);
  const [installedVersion, setInstalledVersion] = useState(repo.installed_version || '');
  const [groupId, setGroupId] = useState<string>(repo.group_id ? String(repo.group_id) : '');
  const [updating, setUpdating] = useState(false);
  const [updatingVersion, setUpdatingVersion] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'changelog') {
      fetchReleases();
    }
  }, [activeTab]);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/repos/${repo.id}/releases`);
      setReleases(response.data);
    } catch (error) {
      console.error('Failed to fetch releases', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInstalled = async (release: Release) => {
    setUpdatingVersion(release.id);
    try {
      await axios.put(`/api/repos/${repo.id}`, {
        installed_version: release.tag_name,
      });
      setInstalledVersion(release.tag_name);
      onUpdate();
    } catch (error) {
      console.error('Failed to update installed version', error);
      alert('FAILED TO UPDATE INSTALLED VERSION');
    } finally {
      setUpdatingVersion(null);
    }
  };

  const handleSaveSettings = async () => {
    setUpdating(true);
    try {
      await axios.put(`/api/repos/${repo.id}`, {
        check_interval: checkInterval,
        include_prereleases: includePrereleases ? 1 : 0,
        notifications_enabled: notificationsEnabled ? 1 : 0,
        installed_version: installedVersion || null,
        group_id: groupId ? parseInt(groupId) : null,
      });
      onUpdate();
      alert('SETTINGS SAVED SUCCESSFULLY');
    } catch (error) {
      alert('FAILED TO SAVE SETTINGS');
    } finally {
      setUpdating(false);
    }
  };

  const isAur = repo.source_type === 'aur';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
      <div className="bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-4 min-w-0">
            {repo.avatar_url ? (
              <img
                src={repo.avatar_url}
                alt={repo.owner}
                className="w-10 h-10 border border-zinc-300 dark:border-zinc-700 object-contain p-0.5 bg-white dark:bg-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold font-syne text-sm shrink-0">
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
                  {isAur ? 'AUR PKG' : 'GITHUB REPO'}
                </span>
                <h2 className="font-syne font-extrabold text-lg sm:text-xl uppercase text-zinc-900 dark:text-white truncate">
                  {isAur ? repo.repo : `${repo.owner}/${repo.repo}`}
                </h2>
              </div>
              <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                {isAur ? `MAINTAINER: ${repo.owner || 'ORPHANED'} • ` : ''}LAST CHECKED:{' '}
                {repo.updated_at ? formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true }) : 'NEVER'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 bg-zinc-50/50 dark:bg-black/20">
          <button
            onClick={() => setActiveTab('changelog')}
            className={`py-3 px-5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'changelog'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            CHANGELOG & RELEASES
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            REPO SETTINGS
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-zinc-100/60 dark:bg-black/40">
          {activeTab === 'changelog' ? (
            <div className="space-y-4">
              {/* AUR Stats Header Card */}
              {isAur && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white dark:bg-[#18181b] p-3 border-l-2 border-purple-500 border-zinc-200 dark:border-zinc-800">
                    <p className="text-[0.6rem] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">MAINTAINER</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase truncate">{repo.owner || 'ORPHANED'}</p>
                  </div>

                  <div className="bg-white dark:bg-[#18181b] p-3 border-l-2 border-emerald-500 border-zinc-200 dark:border-zinc-800">
                    <p className="text-[0.6rem] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">VOTES</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{repo.stargazers_count?.toLocaleString() || 0}</p>
                  </div>

                  <div className="bg-white dark:bg-[#18181b] p-3 border-l-2 border-amber-500 border-zinc-200 dark:border-zinc-800">
                    <p className="text-[0.6rem] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">POPULARITY</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {repo.popularity !== undefined && repo.popularity !== null ? repo.popularity.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <span className="text-xs uppercase tracking-widest">FETCHING RELEASES...</span>
                </div>
              ) : releases.length > 0 ? (
                releases.map((release) => {
                  const isInstalled = repo.installed_version === release.tag_name;
                  return (
                    <div
                      key={release.id}
                      className={`bg-white dark:bg-[#18181b] border font-mono ${
                        isInstalled ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="bg-zinc-50 dark:bg-zinc-900/60 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-syne font-bold uppercase text-zinc-900 dark:text-white text-base flex items-center gap-2">
                            {release.name || release.tag_name}
                            {release.tag_name && (
                              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[0.65rem] px-1.5 py-0.5 border border-blue-200 dark:border-blue-800 font-mono">
                                {release.tag_name}
                              </span>
                            )}
                            {isInstalled && (
                              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[0.65rem] px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-800 font-mono font-bold uppercase flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                INSTALLED
                              </span>
                            )}
                          </h3>
                          <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                            PUBLISHED {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isInstalled && (
                            <button
                              onClick={() => handleMarkInstalled(release)}
                              disabled={updatingVersion === release.id}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/40 px-2.5 py-1 font-bold uppercase transition-colors flex items-center gap-1"
                            >
                              {updatingVersion === release.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              MARK AS INSTALLED
                            </button>
                          )}
                          <a
                            href={release.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 uppercase font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {isAur ? 'AUR' : 'GITHUB'}
                          </a>
                        </div>
                      </div>

                      <div className="p-5 prose prose-xs max-w-none text-zinc-600 dark:text-zinc-300 text-xs font-mono dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {release.body || '*No release description provided.*'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 uppercase text-xs">
                  NO RELEASES FOUND FOR THIS REPOSITORY.
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-lg mx-auto bg-white dark:bg-[#18181b] p-6 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <h3 className="font-syne font-bold uppercase text-zinc-900 dark:text-white text-lg">
                REPOSITORY CONFIGURATION
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    ASSIGNED GROUP
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs uppercase font-mono cursor-pointer outline-none focus:border-blue-500"
                  >
                    <option value="">(NO GROUP / UNGROUPED)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    CURRENTLY INSTALLED VERSION
                  </label>
                  <input
                    type="text"
                    value={installedVersion}
                    onChange={(e) => setInstalledVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    CHECK INTERVAL (MINUTES)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={checkInterval}
                      onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                      className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                    />
                    <span className="text-zinc-500 uppercase text-xs">MIN</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer uppercase text-xs">
                    <input
                      type="checkbox"
                      checked={includePrereleases}
                      onChange={(e) => setIncludePrereleases(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded-none border-zinc-300"
                    />
                    <span>INCLUDE PRE-RELEASES</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-2.5 p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded-none border-zinc-300"
                    />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white uppercase flex items-center gap-1.5 text-xs">
                        {notificationsEnabled ? <Bell className="w-3.5 h-3.5 text-blue-500" /> : <BellOff className="w-3.5 h-3.5 text-zinc-400" />}
                        ENABLE NOTIFICATIONS FOR THIS APP
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>SAVE CHANGES</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
