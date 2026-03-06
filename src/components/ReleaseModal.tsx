import React, { useState } from 'react';
import { X, ExternalLink, Calendar, Tag, CheckCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: {
    id?: number;
    name?: string;
    tag_name: string;
    body?: string;
    published_at?: string;
    html_url?: string;
    owner: string;
    repo: string;
    repo_id?: number;
  };
  installedVersion?: string;
  onUpdate?: () => void;
}

export const ReleaseModal: React.FC<ReleaseModalProps> = ({ isOpen, onClose, release, installedVersion, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!isOpen) return null;

  const handleMarkInstalled = async () => {
    if (!release.repo_id) return;
    setUpdating(true);
    try {
      await axios.put(`/api/repos/${release.repo_id}`, {
        installed_version: release.tag_name
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update installed version', error);
      alert('Failed to update installed version');
    } finally {
      setUpdating(false);
    }
  };

  const isInstalled = installedVersion === release.tag_name;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {release.name || release.tag_name}
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-mono">
                {release.tag_name}
              </span>
              {isInstalled && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Installed
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {release.owner}/{release.repo}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            {release.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Published {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
              </div>
            )}
            
            <div className="ml-auto flex items-center gap-3">
              {!isInstalled && release.repo_id && (
                <button
                  onClick={handleMarkInstalled}
                  disabled={updating}
                  className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Mark as Installed
                </button>
              )}
              
              {release.html_url && (
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              )}
            </div>
          </div>

          <div className="prose prose-sm max-w-none prose-blue dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {release.body || '*No description provided.*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
