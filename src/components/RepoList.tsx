import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Trash2, ExternalLink, RefreshCw, Plus, AlertTriangle, Moon, Sun, Search, Filter, ChevronDown } from 'lucide-react';
import { AddRepoForm } from './AddRepoForm';
import { RepoCard } from './RepoCard';
import { RepoDetails } from './RepoDetails';
import { Modal } from './Modal';
import { Repo } from '../db';
import { useTheme } from '../context/ThemeContext';

type SortOption = 'updated_at' | 'stargazers_count' | 'name';
type SortOrder = 'asc' | 'desc';

export const RepoList: React.FC = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoToDelete, setRepoToDelete] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const confirmDelete = async () => {
    if (!repoToDelete) return;
    try {
      await axios.delete(`/api/repos/${repoToDelete}`);
      fetchRepos();
      setRepoToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete repo');
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Filter and Sort Logic
  const filteredAndSortedRepos = useMemo(() => {
    let result = [...repos];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (repo) =>
          repo.repo.toLowerCase().includes(query) ||
          repo.owner.toLowerCase().includes(query) ||
          (repo.description && repo.description.toLowerCase().includes(query))
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
            // Handle SQLite default format "YYYY-MM-DD HH:MM:SS" by replacing space with T
            // This ensures consistent parsing across browsers
            return new Date(dateStr.replace(' ', 'T')).getTime();
          };
          comparison = getTime(a.updated_at) - getTime(b.updated_at);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [repos, searchQuery, sortBy, sortOrder, showUpdatesOnly]);

  return (
    <div className="w-full p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">GitHub Release Monitor</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track releases and changelogs for your favorite repositories.</p>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => fetchRepos()}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpdatesOnly(!showUpdatesOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors font-medium ${
              showUpdatesOnly
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Updates Only</span>
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="updated_at">Last Updated</option>
              <option value="stargazers_count">Stars</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="appearance-none pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg relative mb-6 flex items-center gap-2" role="alert">
          <AlertTriangle className="w-5 h-5" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!loading && filteredAndSortedRepos.length === 0 && (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No repositories found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {searchQuery ? `No results matching "${searchQuery}"` : "Get started by adding your first repository."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedRepos.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            onDelete={(id) => setRepoToDelete(id)}
            onSelect={setSelectedRepo}
            onUpdate={() => fetchRepos(true)}
          />
        ))}
      </div>

      {/* Add Repo Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Repository"
      >
        <AddRepoForm 
          onRepoAdded={() => {
            fetchRepos();
            setIsAddModalOpen(false);
          }} 
        />
      </Modal>

      {selectedRepo && (
        <RepoDetails
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
          onUpdate={() => fetchRepos(true)}
        />
      )}

      {repoToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Repository</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to remove this repository? This action cannot be undone and you will lose all tracked history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRepoToDelete(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
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
