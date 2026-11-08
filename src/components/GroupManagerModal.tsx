import React, { useState } from 'react';
import axios from 'axios';
import { Folder, Plus, Edit2, Trash2, Check, X, Palette, AlertCircle } from 'lucide-react';
import { Group } from '../types';
import { Modal } from './Modal';

interface GroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onGroupsUpdated: () => void;
}

const PRESET_COLORS = [
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Slate', hex: '#64748B' },
];

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({
  isOpen,
  onClose,
  groups,
  onGroupsUpdated,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/groups', {
        name: newGroupName.trim(),
        color: selectedColor,
      });
      setNewGroupName('');
      onGroupsUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (group: Group) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color || '#3B82F6');
    setError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleUpdateGroup = async (id: number) => {
    if (!editName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await axios.put(`/api/groups/${id}`, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      onGroupsUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Are you sure? Monitored repos in this group will become ungrouped.')) return;
    setLoading(true);
    setError('');
    try {
      await axios.delete(`/api/groups/${id}`);
      onGroupsUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Repository Groups">
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Group Form */}
        <form onSubmit={handleCreateGroup} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Create New Group
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Group name (e.g. Infrastructure, DevTools)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading || !newGroupName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Group
            </button>
          </div>

          {/* Color Picker presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Color:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-5 h-5 rounded-full transition-transform ${selectedColor === c.hex ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 dark:ring-offset-gray-800' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Existing Groups List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Existing Groups ({groups.length})
          </h4>

          {groups.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              No custom groups created yet. Create one above to organize your repositories.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-60 overflow-y-auto pr-1">
              {groups.map((group) => {
                const isEditing = editingId === group.id;

                if (isEditing) {
                  return (
                    <div key={group.id} className="py-3 flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setEditColor(c.hex)}
                            className={`w-4 h-4 rounded-full ${editColor === c.hex ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-900' : ''}`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleUpdateGroup(group.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={group.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {group.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {group.repo_count || 0} {group.repo_count === 1 ? 'repo' : 'repos'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(group)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
