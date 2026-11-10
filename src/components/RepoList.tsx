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
  FolderPlus,
  Grid,
  List,
  ListFilter,
  Settings as SettingsIcon,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { AddRepoForm } from './AddRepoForm';
import { RepoCard } from './RepoCard';
import { RepoRow } from './RepoRow';
import { RepoDetails } from './RepoDetails';
import { GroupManagerModal } from './GroupManagerModal';
import { SettingsPage } from './SettingsPage';
import { Modal } from './Modal';
import { Repo, Group } from '../types';
import { useTheme } from '../context/ThemeContext';

type SortOption = 'updated_at' | 'stargazers_count' | 'name';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list' | 'grouped';

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'bulk'>('single');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

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
        setLastRefreshedAt(new Date());

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

    if (selectedSourceFilter === 'github') {
      result = result.filter((repo) => repo.source_type !== 'aur');
    } else if (selectedSourceFilter === 'aur') {
      result = result.filter((repo) => repo.source_type === 'aur');
    }

    if (selectedGroupFilter === 'ungrouped') {
      result = result.filter((repo) => !repo.group_id);
    } else if (typeof selectedGroupFilter === 'number') {
      result = result.filter((repo) => repo.group_id === selectedGroupFilter);
    }

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

    if (showUpdatesOnly) {
      result = result.filter(
        (repo) =>
          repo.installed_version &&
          repo.last_tag &&
          repo.installed_version !== repo.last_tag
      );
    }

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

  const ungroupedCount = useMemo(() => repos.filter((r) => !r.group_id).length, [repos]);
  const githubCount = useMemo(() => repos.filter((r) => r.source_type !== 'aur').length, [repos]);
  const aurCount = useMemo(() => repos.filter((r) => r.source_type === 'aur').length, [repos]);

  const openAddModal = (tab: 'single' | 'bulk' = 'single') => {
    setAddModalTab(tab);
    setIsAddModalOpen(true);
  };

  if (isSettingsOpen) {
    return (
      <SettingsPage
        onBack={() => setIsSettingsOpen(false)}
        groups={groups}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 font-mono flex flex-col lg:flex-row bg-dot-pattern">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <div className="font-syne font-extrabold text-2xl text-blue-600 dark:text-blue-500 uppercase tracking-tight leading-none">
              GIT-MNTR
            </div>
            <div className="text-[0.6rem] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
              RELEASE MONITOR SYSTEM
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => openAddModal('single')}
            className="px-3 py-1.5 bg-blue-600 text-white font-mono uppercase text-xs font-bold"
          >
            + ADD
          </button>
        </div>
      </div>

      {/* Technical Sidebar Container */}
      <aside
        className={`${
          isMobileSidebarOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-72 xl:w-80 shrink-0 bg-white/95 dark:bg-[#18181b]/95 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800/80 p-5 lg:p-6 flex flex-col justify-between z-20`}
      >
        <div className="space-y-6">
          {/* Logo Area */}
          <div className="hidden lg:block pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
            <div className="font-syne font-extrabold text-3xl xl:text-4xl text-blue-600 dark:text-blue-500 tracking-tighter uppercase leading-none">
              GIT-MNTR
            </div>
            <div className="text-[0.65rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mt-2 block">
              RELEASE MONITOR SYSTEM
            </div>
          </div>

          {/* Nav Section: Source Types */}
          <nav>
            <span className="text-[0.65rem] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2.5 block font-semibold">
              SOURCE TYPES
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedSourceFilter('all');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                  selectedSourceFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold border-zinc-900 dark:border-zinc-100'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>ALL SOURCES</span>
                <span className="text-[0.6rem] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold">
                  {repos.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedSourceFilter('github');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                  selectedSourceFilter === 'github'
                    ? 'bg-blue-600 text-white font-bold border-blue-600'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 inline-block" />
                  GITHUB
                </span>
                <span className="text-[0.6rem] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold">
                  {githubCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedSourceFilter('aur');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                  selectedSourceFilter === 'aur'
                    ? 'bg-purple-600 text-white font-bold border-purple-600'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 inline-block" />
                  AUR PACKAGES
                </span>
                <span className="text-[0.6rem] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold">
                  {aurCount}
                </span>
              </button>
            </div>
          </nav>

          {/* Nav Section: App Groups */}
          <nav>
            <span className="text-[0.65rem] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2.5 block font-semibold">
              APP GROUPS
            </span>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <button
                onClick={() => {
                  setSelectedGroupFilter('all');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                  selectedGroupFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold border-zinc-900 dark:border-zinc-100'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>ALL APPS</span>
                <span className="text-[0.6rem] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold">
                  {repos.length}
                </span>
              </button>

              {groups.map((g) => {
                const isSelected = selectedGroupFilter === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGroupFilter(g.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                      isSelected
                        ? 'border-transparent text-white font-bold'
                        : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    style={isSelected ? { backgroundColor: g.color || '#3B82F6' } : {}}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{ backgroundColor: isSelected ? '#ffffff' : g.color || '#3B82F6' }}
                      />
                      <span className="truncate">{g.name}</span>
                    </span>
                    <span className="text-[0.6rem] bg-zinc-200/80 dark:bg-black/30 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold shrink-0 ml-1">
                      {g.repo_count || 0}
                    </span>
                  </button>
                );
              })}

              {ungroupedCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedGroupFilter('ungrouped');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono uppercase transition-colors border ${
                    selectedGroupFilter === 'ungrouped'
                      ? 'bg-zinc-800 text-white font-bold border-zinc-800'
                      : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>UNGROUPED</span>
                  <span className="text-[0.6rem] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 font-bold">
                    {ungroupedCount}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsGroupManagerOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors mt-2 border border-dashed border-blue-400/40"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ MANAGE GROUPS</span>
              </button>
            </div>
          </nav>
        </div>

        {/* System Meta Telemetry at bottom */}
        <div className="pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2 text-[0.65rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
          <span className="text-[0.6rem] text-zinc-400 dark:text-zinc-500 tracking-[0.2em] block font-semibold mb-2">
            SYSTEM META
          </span>
          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800/40">
            <span>LAST REFRESH</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {Math.max(0, Math.floor((new Date().getTime() - lastRefreshedAt.getTime()) / 60000))}m AGO
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800/40">
            <span>UPDATE STATUS</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
              IDLE
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>TOTAL REPOS</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{repos.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Technical Content Panel */}
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="SEARCH REPOSITORIES / ORGS / GROUPS"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-xs font-mono uppercase text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Action Group */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* View Mode Switcher */}
            <div className="flex bg-white dark:bg-[#18181b] p-1 border border-zinc-300 dark:border-zinc-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 text-xs font-mono uppercase transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 text-xs font-mono uppercase transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 text-xs font-mono uppercase transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Grouped View"
              >
                <ListFilter className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowUpdatesOnly(!showUpdatesOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-mono uppercase transition-colors ${
                showUpdatesOnly
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 font-bold'
                  : 'bg-white dark:bg-[#18181b] border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>UPDATES ONLY</span>
            </button>

            <button
              onClick={() => loadData()}
              className="p-2.5 bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh All"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono uppercase transition-colors"
              title="Settings & Notifications"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>SETTINGS</span>
            </button>

            <button
              onClick={() => openAddModal('bulk')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono uppercase transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>BULK IMPORT</span>
            </button>

            <button
              onClick={() => openAddModal('single')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono uppercase text-xs font-bold tracking-wider transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD REPOSITORY</span>
            </button>
          </div>
        </div>

        {/* Technical Sub-Header: Sort Controls & Active Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs font-mono">
          <div className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>
              SHOWING {filteredAndSortedRepos.length} OF {repos.length} REPOSITORIES
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[0.65rem]">SORT:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white uppercase outline-none cursor-pointer font-mono font-semibold"
                >
                  <option value="updated_at">LAST UPDATED</option>
                  <option value="stargazers_count">STARS / VOTES</option>
                  <option value="name">REPO NAME</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 w-3 h-3 pointer-events-none" />
              </div>
            </div>

            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white uppercase outline-none cursor-pointer font-mono font-semibold"
              >
                <option value="desc">DESCENDING</option>
                <option value="asc">ASCENDING</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 w-3 h-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 font-mono">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <span className="text-xs uppercase tracking-widest">FETCHING TELEMETRY...</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 text-xs font-mono mb-6 flex items-center gap-2 uppercase tracking-wide"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ERROR: {error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedRepos.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#18181b]/60 border border-dashed border-zinc-300 dark:border-zinc-800 p-8 my-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-100 dark:bg-zinc-800 mb-4 border border-zinc-300 dark:border-zinc-700">
              <Search className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="font-syne text-xl font-bold uppercase text-zinc-900 dark:text-white mb-2">
              NO MATCHING REPOSITORIES
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto uppercase mb-6 tracking-wide">
              {searchQuery
                ? `NO RESULTS MATCHING QUERY "${searchQuery}"`
                : selectedGroupFilter !== 'all'
                ? 'NO REPOSITORIES FOUND IN THIS GROUP FILTER.'
                : 'NO MONITORED REPOSITORIES REGISTERED IN SYSTEM YET.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => openAddModal('bulk')}
                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs uppercase font-bold flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>BULK IMPORT</span>
              </button>
              <button
                onClick={() => openAddModal('single')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD REPOSITORY</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Views */}
        {!loading && filteredAndSortedRepos.length > 0 && (
          <div className="flex-1">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
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
            ) : viewMode === 'list' ? (
              <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-[0.65rem] font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        <th className="py-3 px-4">REPOSITORY</th>
                        <th className="py-3 px-4">INSTALLED</th>
                        <th className="py-3 px-4">LATEST RELEASE</th>
                        <th className="py-3 px-4">STATS</th>
                        <th className="py-3 px-4">LAST CHECKED</th>
                        <th className="py-3 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredAndSortedRepos.map((repo) => (
                        <RepoRow
                          key={repo.id}
                          repo={repo}
                          onDelete={(id) => setRepoToDelete(id)}
                          onSelect={setSelectedRepo}
                          onUpdate={() => loadData(true)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grouped View Section */
              <div className="space-y-8">
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
                        <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                          <span
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ backgroundColor: group.color || '#3B82F6' }}
                          />
                          <h2 className="font-syne font-extrabold text-lg uppercase tracking-tight text-zinc-900 dark:text-white">
                            {group.name}
                          </h2>
                          <span className="text-[0.65rem] px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase">
                            {groupRepos.length} {groupRepos.length === 1 ? 'REPO' : 'REPOS'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
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

                {(selectedGroupFilter === 'all' || selectedGroupFilter === 'ungrouped') && (
                  (() => {
                    const ungroupedRepos = filteredAndSortedRepos.filter((r) => !r.group_id);
                    if (ungroupedRepos.length === 0) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="w-3.5 h-3.5 bg-zinc-500 shrink-0" />
                          <h2 className="font-syne font-extrabold text-lg uppercase tracking-tight text-zinc-900 dark:text-white">
                            UNGROUPED REPOSITORIES
                          </h2>
                          <span className="text-[0.65rem] px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase">
                            {ungroupedRepos.length} {ungroupedRepos.length === 1 ? 'REPO' : 'REPOS'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
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
            )}
          </div>
        )}

        {/* Technical Telemetry Controls Footer (Matching Variation 3 design) */}
        <footer className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-[0.65rem] font-mono text-zinc-500 dark:text-zinc-400 uppercase gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
            <span>NODE_STATUS: OK</span>
          </div>
          <div>
            MONITORING {repos.length} {repos.length === 1 ? 'REPOSITORY' : 'REPOSITORIES'} ACROSS {githubCount > 0 && aurCount > 0 ? '2' : githubCount > 0 || aurCount > 0 ? '1' : '0'} SOURCES
          </div>
          <div>BUILD: 2026-REL-MON</div>
        </footer>
      </main>

      {/* Add Repo Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={addModalTab === 'bulk' ? 'BULK IMPORT REPOSITORIES' : 'ADD NEW REPOSITORY'}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] font-mono">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="p-2 bg-red-500/10 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-syne font-bold text-lg uppercase text-zinc-900 dark:text-white">
                DELETE REPOSITORY
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed uppercase">
              CONFIRM DELETION OF THIS REPOSITORY. THIS ACTION CANNOT BE UNDONE.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRepoToDelete(null)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs uppercase font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs uppercase font-bold"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
