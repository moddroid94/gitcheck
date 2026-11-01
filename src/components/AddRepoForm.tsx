import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Loader2, Search, Settings, ChevronDown, ChevronUp, Folder, Layers, UserPlus } from 'lucide-react';
import { Group } from '../db';
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
  const [installedVersion, setInstalledVersion] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanInput = repoString.trim();
    if (!cleanInput) {
      setError('Please enter a repository identifier or URL');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/repos', {
        input_string: cleanInput,
        check_interval: Number(checkInterval),
        include_prereleases: includePrereleases,
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
      setError(err.response?.data?.error || 'Failed to add repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          Single Repository / Package
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bulk'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Bulk Import
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repository (GitHub or AUR Package)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={repoString}
                  onChange={(e) => setRepoString(e.target.value)}
                  placeholder="gh:facebook/react or aur:yay (or owner/repo / package name)"
                  className="block w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900/50 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Prefixes: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">gh:owner/repo</code> for GitHub, <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">aur:pkgname</code> for Arch User Repository.
              </p>
            </div>

            {/* Group Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-gray-400" /> Group (Optional)
                </label>
                {onOpenManageGroups && (
                  <button
                    type="button"
                    onClick={onOpenManageGroups}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Manage Groups
                  </button>
                )}
              </div>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
              >
                <option value="">(No Group / Ungrouped)</option>
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
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-fit pt-1"
            >
              <Settings className="w-4 h-4" />
              {showOptions ? 'Hide Options' : 'Show Options'}
              {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Extended Options */}
            {showOptions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Check Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Installed Version (optional)
                  </label>
                  <input
                    type="text"
                    value={installedVersion}
                    onChange={(e) => setInstalledVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePrereleases}
                      onChange={(e) => setIncludePrereleases(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Pre-releases</span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Repository
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
