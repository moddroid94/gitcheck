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
      setError(err.response?.data?.error || 'FAILED TO IMPORT REPOSITORIES');
    } finally {
      setLoading(false);
    }
  };

  const lineCount = repoListText.split(/[\n,;]+/).filter((s) => s.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 font-mono text-xs">
      <div>
        <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
          REPOSITORIES LIST (ONE PER LINE)
        </label>
        <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mb-2">
          USE <code className="bg-zinc-200 dark:bg-zinc-800 px-1 text-blue-600 dark:text-blue-400">gh:owner/repo</code> FOR GITHUB OR <code className="bg-zinc-200 dark:bg-zinc-800 px-1 text-purple-600 dark:text-purple-400">aur:pkgname</code> FOR AUR.
        </p>
        <textarea
          rows={5}
          value={repoListText}
          onChange={(e) => setRepoListText(e.target.value)}
          placeholder={`gh:facebook/react\naur:yay\naur:google-chrome`}
          className="block w-full p-3 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 font-mono text-xs uppercase outline-none focus:border-blue-500"
          required
        />
        {lineCount > 0 && (
          <div className="mt-1 text-[0.65rem] text-right text-zinc-500 uppercase">
            DETECTED ~{lineCount} {lineCount === 1 ? 'REPOSITORY' : 'REPOSITORIES'}
          </div>
        )}
      </div>

      {/* Group Selector */}
      <div>
        <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Folder className="w-3.5 h-3.5 text-zinc-400" /> ASSIGN TO GROUP (OPTIONAL)
        </label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs uppercase font-mono cursor-pointer outline-none focus:border-blue-500"
        >
          <option value="">(NO GROUP / UNGROUPED)</option>
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
        className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        {showOptions ? 'HIDE BATCH SETTINGS' : 'BATCH SETTINGS'}
        {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800">
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
          <div className="flex flex-col gap-2 pt-2 md:pt-4">
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
        disabled={loading || !repoListText.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>ADDING REPOSITORIES...</span>
          </>
        ) : (
          <>
            <Layers className="w-4 h-4" />
            <span>ADD ALL REPOSITORIES ({lineCount || 0})</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary and Results Display */}
      {summary && (
        <div className="space-y-2 pt-2 font-mono">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs uppercase font-bold">
            <span className="text-zinc-900 dark:text-white">BATCH IMPORT COMPLETED</span>
            <div className="flex gap-2 text-[0.65rem]">
              <span className="text-emerald-600 dark:text-emerald-400">{summary.successCount} ADDED</span>
              {summary.skippedCount > 0 && <span className="text-amber-600 dark:text-amber-400">{summary.skippedCount} SKIPPED</span>}
              {summary.failCount > 0 && <span className="text-red-600 dark:text-red-400">{summary.failCount} FAILED</span>}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="p-2 border text-[0.65rem] uppercase font-mono flex items-center justify-between gap-2 bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2 truncate">
                  {res.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {res.status === 'skipped' && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  {res.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className="font-bold text-zinc-900 dark:text-white truncate">
                    {res.owner}{res.repo ? `/${res.repo}` : ''}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 font-bold shrink-0 ${
                    res.status === 'success'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : res.status === 'skipped'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {res.error || (res.status === 'success' ? 'ADDED' : res.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};
