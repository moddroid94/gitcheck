import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Loader2, Search, Settings, ChevronDown, ChevronUp, Folder, Layers } from 'lucide-react';
import { Group } from '../types';
import { BulkAddRepoForm } from './BulkAddRepoForm';

interface AddRepoFormProps {
  onRepoAdded: () => void;
  groups?: Group[];
  defaultGroupId?: number | null;
  onOpenManageGroups?: () => void;
  initialTab?: 'single' | 'bulk';
}

export const AddRepoForm: React.FC<AddRepoFormProps> = ({
  onRepoAdded,
  groups = [],
  defaultGroupId = null,
  onOpenManageGroups,
  initialTab = 'single',
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(initialTab);
  const [repoString, setRepoString] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId ? String(defaultGroupId) : '');
  const [checkInterval, setCheckInterval] = useState(60);
  const [includePrereleases, setIncludePrereleases] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [installedVersion, setInstalledVersion] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('/api/settings')
      .then((res) => {
        if (res.data) {
          if (res.data.default_check_interval) {
            setCheckInterval(res.data.default_check_interval);
          }
          if (res.data.default_include_prereleases !== undefined) {
            setIncludePrereleases(res.data.default_include_prereleases);
          }
          if (res.data.default_notifications_enabled !== undefined) {
            setNotificationsEnabled(res.data.default_notifications_enabled);
          }
          if (!defaultGroupId && res.data.default_group_id) {
            setSelectedGroupId(String(res.data.default_group_id));
          }
        }
      })
      .catch(() => {});
  }, [defaultGroupId]);

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanInput = repoString.trim();
    if (!cleanInput) {
      setError('PLEASE ENTER A REPOSITORY IDENTIFIER OR URL');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/repos', {
        input_string: cleanInput,
        check_interval: Number(checkInterval),
        include_prereleases: includePrereleases,
        notifications_enabled: notificationsEnabled,
        installed_version: installedVersion || null,
        group_id: selectedGroupId ? parseInt(selectedGroupId) : null,
      });

      setRepoString('');
      setCheckInterval(60);
      setIncludePrereleases(false);
      setInstalledVersion('');
      setShowOptions(false);
      onRepoAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || 'FAILED TO ADD REPOSITORY');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full font-mono">
      {/* Tabs Header */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs uppercase font-bold border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          SINGLE REPOSITORY / PKG
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs uppercase font-bold border-b-2 transition-colors ${
            activeTab === 'bulk'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          BULK IMPORT
        </button>
      </div>

      {activeTab === 'bulk' ? (
        <BulkAddRepoForm
          groups={groups}
          onReposAdded={onRepoAdded}
          defaultGroupId={defaultGroupId}
        />
      ) : (
        <form onSubmit={handleSubmitSingle} className="w-full">
          <div className="flex flex-col gap-4">
            {/* Main Input */}
            <div>
              <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                REPOSITORY (GITHUB OR AUR PACKAGE)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={repoString}
                  onChange={(e) => setRepoString(e.target.value)}
                  placeholder="gh:facebook/react or aur:yay"
                  className="block w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono uppercase focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <p className="mt-1 text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase">
                PREFIXES: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-blue-600 dark:text-blue-400">gh:owner/repo</code> FOR GITHUB, <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-purple-600 dark:text-purple-400">aur:pkgname</code> FOR AUR.
              </p>
            </div>

            {/* Group Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-zinc-400" /> GROUP (OPTIONAL)
                </label>
                {onOpenManageGroups && (
                  <button
                    type="button"
                    onClick={onOpenManageGroups}
                    className="text-[0.65rem] text-blue-600 dark:text-blue-400 uppercase hover:underline"
                  >
                    + MANAGE GROUPS
                  </button>
                )}
              </div>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs uppercase font-mono cursor-pointer outline-none"
              >
                <option value="">(NO GROUP / UNGROUPED)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options Toggle */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors w-fit pt-1"
            >
              <Settings className="w-3.5 h-3.5" />
              {showOptions ? 'HIDE OPTIONS' : 'SHOW OPTIONS'}
              {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Extended Options */}
            {showOptions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <label className="block text-[0.65rem] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    CHECK INTERVAL (MINUTES)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                    className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    INSTALLED VERSION (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={installedVersion}
                    onChange={(e) => setInstalledVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-2 space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer uppercase text-xs">
                    <input
                      type="checkbox"
                      checked={includePrereleases}
                      onChange={(e) => setIncludePrereleases(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded-none border-zinc-300"
                    />
                    <span>INCLUDE PRE-RELEASES</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer uppercase text-xs">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded-none border-zinc-300"
                    />
                    <span>ENABLE RELEASE NOTIFICATIONS</span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs uppercase font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              ADD REPOSITORY
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-xs uppercase text-red-600 dark:text-red-400 font-bold">
                {error}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
