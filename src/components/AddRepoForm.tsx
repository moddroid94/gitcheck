import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Loader2, Search, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface AddRepoFormProps {
  onRepoAdded: () => void;
}

export const AddRepoForm: React.FC<AddRepoFormProps> = ({ onRepoAdded }) => {
  const [repoString, setRepoString] = useState('');
  const [checkInterval, setCheckInterval] = useState(60);
  const [includePrereleases, setIncludePrereleases] = useState(false);
  const [installedVersion, setInstalledVersion] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Parse owner/repo from string
    const parts = repoString.trim().split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError('Please enter in "owner/repo" format (e.g. facebook/react)');
      setLoading(false);
      return;
    }

    const [owner, repo] = parts;

    try {
      await axios.post('/api/repos', {
        owner,
        repo,
        check_interval: Number(checkInterval),
        include_prereleases: includePrereleases,
        installed_version: installedVersion || null,
      });
      setRepoString('');
      setCheckInterval(60);
      setIncludePrereleases(false);
      setInstalledVersion('');
      setShowOptions(false);
      onRepoAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add repo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4">
        {/* Main Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={repoString}
            onChange={(e) => setRepoString(e.target.value)}
            placeholder="owner/repo (e.g. facebook/react)"
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900/50 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Options Toggle */}
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-fit"
        >
          <Settings className="w-4 h-4" />
          {showOptions ? 'Hide Options' : 'Show Options'}
          {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Extended Options */}
        {showOptions && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Check Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={checkInterval}
                onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrereleases}
                  onChange={(e) => setIncludePrereleases(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
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
  );
};
