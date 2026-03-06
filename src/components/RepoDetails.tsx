import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Loader2, Save, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { Repo, Release } from '../db';
import { formatDistanceToNow } from 'date-fns';

interface RepoDetailsProps {
  repo: Repo;
  onClose: () => void;
  onUpdate: () => void;
}

export const RepoDetails: React.FC<RepoDetailsProps> = ({ repo, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'changelog' | 'settings'>('changelog');
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInterval, setCheckInterval] = useState(repo.check_interval || 60);
  const [includePrereleases, setIncludePrereleases] = useState(!!repo.include_prereleases);
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
        installed_version: release.tag_name
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update installed version', error);
      alert('Failed to update installed version');
    } finally {
      setUpdatingVersion(null);
    }
  };

  const handleSaveSettings = async () => {
    setUpdating(true);
    try {
      await axios.put(`/api/repos/${repo.id}`, { 
        check_interval: checkInterval,
        include_prereleases: includePrereleases ? 1 : 0
      });
      onUpdate();
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            {repo.avatar_url && (
              <img src={repo.avatar_url} alt={repo.owner} className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{repo.owner}/{repo.repo}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last checked: {repo.updated_at ? formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true }) : 'Never'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('changelog')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'changelog'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Changelog
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/30">
          {activeTab === 'changelog' ? (
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : releases.length > 0 ? (
                releases.map((release) => {
                  const isInstalled = repo.installed_version === release.tag_name;
                  return (
                    <div key={release.id} className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden ${isInstalled ? 'border-green-200 dark:border-green-900/50 ring-1 ring-green-100 dark:ring-green-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {release.name || release.tag_name}
                            {release.tag_name && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-mono">
                                {release.tag_name}
                              </span>
                            )}
                            {isInstalled && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Installed
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Published {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isInstalled && (
                            <button
                              onClick={() => handleMarkInstalled(release)}
                              disabled={updatingVersion === release.id}
                              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 px-3 py-1.5 rounded-md transition-colors font-medium flex items-center gap-1"
                            >
                              {updatingVersion === release.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Mark as Installed
                            </button>
                          )}
                          <a
                            href={release.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View on GitHub
                          </a>
                        </div>
                      </div>
                      <div className="p-6 prose prose-sm max-w-none prose-blue dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {release.body || '*No description provided.*'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No releases found.
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Repository Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Check Interval (minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="interval"
                      min="1"
                      value={checkInterval}
                      onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    How often to check for new releases for this repository.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="prereleases"
                      checked={includePrereleases}
                      onChange={(e) => setIncludePrereleases(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="prereleases" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Pre-releases
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 ml-6">
                    If checked, the monitor will also track beta, alpha, and RC releases.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={updating}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
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
