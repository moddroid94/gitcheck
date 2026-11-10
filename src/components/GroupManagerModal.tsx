import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Check, X, Palette, AlertCircle } from 'lucide-react';
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
      setError(err.response?.data?.error || 'FAILED TO CREATE GROUP');
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
      setError(err.response?.data?.error || 'FAILED TO UPDATE GROUP');
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
      setError(err.response?.data?.error || 'FAILED TO DELETE GROUP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MANAGE REPOSITORY GROUPS">
      <div className="space-y-6 font-mono text-xs">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-bold uppercase flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Group Form */}
        <form onSubmit={handleCreateGroup} className="p-4 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            CREATE NEW GROUP
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="GROUP NAME (E.G. DEVTOOLS)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono uppercase outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading || !newGroupName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              ADD GROUP
            </button>
          </div>

          {/* Color Picker presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[0.65rem] text-zinc-500 uppercase flex items-center gap-1 font-bold">
              <Palette className="w-3.5 h-3.5" /> COLOR:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-4 h-4 ${selectedColor === c.hex ? 'ring-2 ring-blue-500 border border-white' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Existing Groups List */}
        <div className="space-y-3">
          <h4 className="text-[0.65rem] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            EXISTING GROUPS ({groups.length})
          </h4>

          {groups.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 uppercase">
              NO CUSTOM GROUPS CREATED YET.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-60 overflow-y-auto pr-1">
              {groups.map((group) => {
                const isEditing = editingId === group.id;

                if (isEditing) {
                  return (
                    <div key={group.id} className="py-2.5 flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono uppercase text-zinc-900 dark:text-white"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setEditColor(c.hex)}
                            className={`w-3.5 h-3.5 ${editColor === c.hex ? 'ring-2 ring-blue-500' : ''}`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleUpdateGroup(group.id)}
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={group.id} className="py-2.5 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 shrink-0"
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <span className="font-syne font-bold text-zinc-900 dark:text-white uppercase text-sm">
                        {group.name}
                      </span>
                      <span className="text-[0.6rem] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase">
                        {group.repo_count || 0} REPOS
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(group)}
                        className="p-1 text-zinc-400 hover:text-blue-500 transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
