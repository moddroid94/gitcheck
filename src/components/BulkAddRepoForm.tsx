import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Loader2, CheckCircle2, XCircle, AlertCircle, Settings, ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { Group } from '../types';

interface BulkAddRepoFormProps {
  groups: Group[];
  onReposAdded: () => void;
  defaultGroupId?: number | null;
}

interface BulkResult {
  owner: string;
  repo: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

interface BulkSummary {
  total: number;
  successCount: number;
  failCount: number;
  skippedCount: number;
}

export const BulkAddRepoForm: React.FC<BulkAddRepoFormProps> = ({
  groups,
  onReposAdded,
  defaultGroupId = null,
}) => {
  const [repoListText, setRepoListText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId ? String(defaultGroupId) : '');
  const [checkInterval, setCheckInterval] = useState(60);
  const [includePrereleases, setIncludePrereleases] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [error, setError] = useState('');

  // Fetch system default settings if available
  useEffect(() => {
    axios.get('/api/settings').then((res) => {
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
    }).catch(() => {});
  }, [defaultGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoListText.trim()) return;

    setLoading(true);
    setError('');
    setSummary(null);
    setResults([]);

    try {
      const response = await axios.post('/api/repos/bulk', {
        repos: repoListText,
        group_id: selectedGroupId ? parseInt(selectedGroupId) : null,
        check_interval: Number(checkInterval),
        include_prereleases: includePrereleases,
        notifications_enabled: notificationsEnabled,
      });

      setSummary(response.data.summary);
      setResults(response.data.results || []);

      if (response.data.summary.successCount > 0) {
        onReposAdded();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import repositories');
    } finally {
      setLoading(false);
    }
  };

  const lineCount = repoListText.split(/[\n,;]+/).filter((s) => s.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Repositories List
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Enter repositories or packages one per line. Use <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">gh:owner/repo</code> for GitHub or <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">aur:pkgname</code> for AUR.
        </p>
        <textarea
          rows={5}
          value={repoListText}
          onChange={(e) => setRepoListText(e.target.value)}
          placeholder={`gh:facebook/react\naur:yay\naur:google-chrome\nhttps://github.com/vercel/next.js`}
          className="block w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all"
          required
        />
        {lineCount > 0 && (
          <div className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
            Detected ~{lineCount} {lineCount === 1 ? 'repository' : 'repositories'}
          </div>
        )}
      </div>

      {/* Group Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
          <Folder className="w-3.5 h-3.5" /> Assign to Group (Optional)
        </label>
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

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-fit"
      >
        <Settings className="w-4 h-4" />
        {showOptions ? 'Hide Batch Settings' : 'Batch Settings'}
        {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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
          <div className="flex flex-col gap-2 pt-2 md:pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrereleases}
                onChange={(e) => setIncludePrereleases(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Pre-releases</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable Release Notifications</span>
            </label>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !repoListText.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Adding Repositories...</span>
          </>
        ) : (
          <>
            <Layers className="w-4 h-4" />
            <span>Add All Repositories ({lineCount || 0})</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary and Results Display */}
      {summary && (
        <div className="space-y-3 pt-2">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">Batch Import Completed</span>
            </div>
            <div className="flex gap-2 font-medium">
              <span className="text-green-600 dark:text-green-400">{summary.successCount} added</span>
              {summary.skippedCount > 0 && <span className="text-amber-600 dark:text-amber-400">{summary.skippedCount} skipped</span>}
              {summary.failCount > 0 && <span className="text-red-600 dark:text-red-400">{summary.failCount} failed</span>}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-2 truncate">
                  {res.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {res.status === 'skipped' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                  {res.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="font-mono text-gray-900 dark:text-white truncate">
                    {res.owner}{res.repo ? `/${res.repo}` : ''}
                  </span>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ${
                    res.status === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : res.status === 'skipped'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  {res.error || (res.status === 'success' ? 'Added' : res.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};
