import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Trash2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Moon,
  Sun,
  Search,
  Filter,
  ChevronDown,
  Layers,
  Folder,
  FolderPlus,
  Grid,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { AddRepoForm } from './AddRepoForm';
import { RepoCard } from './RepoCard';
import { RepoDetails } from './RepoDetails';
import { GroupManagerModal } from './GroupManagerModal';
import { Modal } from './Modal';
import { Repo, Group } from '../db';
import { useTheme } from '../context/ThemeContext';

type SortOption = 'updated_at' | 'stargazers_count' | 'name';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'grouped';

export const RepoList: React.FC = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoToDelete, setRepoToDelete] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Group & View State
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'all' | 'ungrouped' | number>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'all' | 'github' | 'aur'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);

  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'bulk'>('single');

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      if (Array.isArray(response.data)) {
        setGroups(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const fetchRepos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/api/repos');
      if (Array.isArray(response.data)) {
        setRepos(response.data);

        // If a repo is selected, update it with the new data
        if (selectedRepo) {
          const updatedRepo = response.data.find((r: Repo) => r.id === selectedRepo.id);
          if (updatedRepo) {
            setSelectedRepo(updatedRepo);
          }
        }
      } else {
        console.error('Unexpected API response:', response.data);
        setRepos([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch repos');
      setRepos([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadData = async (silent = false) => {
    await Promise.all([fetchRepos(silent), fetchGroups()]);
  };

  const confirmDelete = async () => {
    if (!repoToDelete) return;
    try {
      await axios.delete(`/api/repos/${repoToDelete}`);
      loadData(true);
      setRepoToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete repo');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort Logic
  const filteredAndSortedRepos = useMemo(() => {
    let result = [...repos];

    // Filter by Source (GitHub vs AUR)
    if (selectedSourceFilter === 'github') {
      result = result.filter((repo) => repo.source_type !== 'aur');
    } else if (selectedSourceFilter === 'aur') {
      result = result.filter((repo) => repo.source_type === 'aur');
    }

    // Filter by Group
    if (selectedGroupFilter === 'ungrouped') {
      result = result.filter((repo) => !repo.group_id);
    } else if (typeof selectedGroupFilter === 'number') {
      result = result.filter((repo) => repo.group_id === selectedGroupFilter);
    }

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (repo) =>
          repo.repo.toLowerCase().includes(query) ||
          repo.owner.toLowerCase().includes(query) ||
          (repo.description && repo.description.toLowerCase().includes(query)) ||
          (repo.group_name && repo.group_name.toLowerCase().includes(query))
      );
    }

    // Updates Filter
    if (showUpdatesOnly) {
      result = result.filter(
        (repo) =>
          repo.installed_version &&
          repo.last_tag &&
          repo.installed_version !== repo.last_tag
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.repo || '').localeCompare(b.repo || '', undefined, { sensitivity: 'base' });
          break;
        case 'stargazers_count':
          comparison = (a.stargazers_count || 0) - (b.stargazers_count || 0);
          break;
        case 'updated_at':
          const getTime = (dateStr?: string) => {
            if (!dateStr) return 0;
            return new Date(dateStr.replace(' ', 'T')).getTime();
          };
          comparison = getTime(a.updated_at) - getTime(b.updated_at);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [repos, selectedSourceFilter, selectedGroupFilter, searchQuery, sortBy, sortOrder, showUpdatesOnly]);

  // Compute counts for group tabs
  const ungroupedCount = useMemo(() => repos.filter((r) => !r.group_id).length, [repos]);

  const openAddModal = (tab: 'single' | 'bulk' = 'single') => {
    setAddModalTab(tab);
    setIsAddModalOpen(true);
  };

  return (
    <div className="w-full p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            GitHub Release Monitor
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Track releases, changelogs, and organization groups for your applications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={toggleTheme}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => loadData()}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => openAddModal('bulk')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
          >
            <Layers className="w-4 h-4 text-blue-500" />
            Bulk Import
          </button>
          <button
            onClick={() => openAddModal('single')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        </div>
      </div>

      {/* Source Type Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-4 w-fit border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedSourceFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedSourceFilter === 'all'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          All Sources ({repos.length})
        </button>
        <button
          onClick={() => setSelectedSourceFilter('github')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedSourceFilter === 'github'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          GitHub ({repos.filter(r => r.source_type !== 'aur').length})
        </button>
        <button
          onClick={() => setSelectedSourceFilter('aur')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedSourceFilter === 'aur'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          AUR Packages ({repos.filter(r => r.source_type === 'aur').length})
        </button>
      </div>

      {/* Groups Filter Pills Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedGroupFilter === 'all'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>All Apps</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedGroupFilter === 'all'
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {repos.length}
            </span>
          </button>

          {groups.map((g) => {
            const isSelected = selectedGroupFilter === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupFilter(g.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-transparent text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: g.color || '#3B82F6' }
                    : {}
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : g.color || '#3B82F6' }}
                />
                <span>{g.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? 'bg-black/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {g.repo_count || 0}
                </span>
              </button>
            );
          })}

          {ungroupedCount > 0 && (
            <button
              onClick={() => setSelectedGroupFilter('ungrouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedGroupFilter === 'ungrouped'
                  ? 'bg-gray-700 border-gray-700 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>Ungrouped</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedGroupFilter === 'ungrouped'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {ungroupedCount}
              </span>
            </button>
          )}
        </div>

        <button
          onClick={() => setIsGroupManagerOpen(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Manage Groups</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search repositories, owners, or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Grouped View"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowUpdatesOnly(!showUpdatesOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
              showUpdatesOnly
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Updates Only</span>
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="updated_at">Last Updated</option>
              <option value="stargazers_count">Stars</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="appearance-none pl-3 pr-8 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg relative mb-6 flex items-center gap-2 text-sm"
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && filteredAndSortedRepos.length === 0 && (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No repositories found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm mb-4">
            {searchQuery
              ? `No results matching "${searchQuery}"`
              : selectedGroupFilter !== 'all'
              ? 'No repositories in this group.'
              : 'Get started by adding your first repository or importing in bulk.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => openAddModal('bulk')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700"
            >
              <Layers className="w-4 h-4 text-blue-500" />
              Bulk Import
            </button>
            <button
              onClick={() => openAddModal('single')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
          </div>
        </div>
      )}

      {/* Repo Cards Display */}
      {!loading && filteredAndSortedRepos.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRepos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onDelete={(id) => setRepoToDelete(id)}
                onSelect={setSelectedRepo}
                onUpdate={() => loadData(true)}
              />
            ))}
          </div>
        ) : (
          /* Grouped View Section */
          <div className="space-y-8">
            {/* Display each custom group section */}
            {groups
              .filter((g) =>
                selectedGroupFilter === 'all'
                  ? true
                  : selectedGroupFilter === g.id
              )
              .map((group) => {
                const groupRepos = filteredAndSortedRepos.filter((r) => r.group_id === group.id);
                if (groupRepos.length === 0 && selectedGroupFilter === 'all') return null;

                return (
                  <div key={group.id} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {group.name}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                        {groupRepos.length} {groupRepos.length === 1 ? 'repo' : 'repos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          onDelete={(id) => setRepoToDelete(id)}
                          onSelect={setSelectedRepo}
                          onUpdate={() => loadData(true)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

            {/* Ungrouped section in Grouped View */}
            {(selectedGroupFilter === 'all' || selectedGroupFilter === 'ungrouped') && (
              (() => {
                const ungroupedRepos = filteredAndSortedRepos.filter((r) => !r.group_id);
                if (ungroupedRepos.length === 0) return null;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="w-4 h-4 rounded-full bg-gray-400 shrink-0 shadow-xs" />
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Ungrouped Repositories
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                        {ungroupedRepos.length} {ungroupedRepos.length === 1 ? 'repo' : 'repos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {ungroupedRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          onDelete={(id) => setRepoToDelete(id)}
                          onSelect={setSelectedRepo}
                          onUpdate={() => loadData(true)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )
      )}

      {/* Add Repo Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={addModalTab === 'bulk' ? 'Bulk Import Repositories' : 'Add New Repository'}
      >
        <AddRepoForm
          groups={groups}
          initialTab={addModalTab}
          defaultGroupId={typeof selectedGroupFilter === 'number' ? selectedGroupFilter : null}
          onOpenManageGroups={() => {
            setIsAddModalOpen(false);
            setIsGroupManagerOpen(true);
          }}
          onRepoAdded={() => {
            loadData(true);
          }}
        />
      </Modal>

      {/* Group Manager Modal */}
      <GroupManagerModal
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
        groups={groups}
        onGroupsUpdated={() => loadData(true)}
      />

      {/* Repo Details Modal */}
      {selectedRepo && (
        <RepoDetails
          repo={selectedRepo}
          groups={groups}
          onClose={() => setSelectedRepo(null)}
          onUpdate={() => loadData(true)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {repoToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700 transform transition-all">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Repository</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-sm">
              Are you sure you want to remove this repository? This action cannot be undone and you will lose tracked release history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRepoToDelete(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-medium"
              >
                Delete Repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
