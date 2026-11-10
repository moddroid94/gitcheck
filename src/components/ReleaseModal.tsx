import React, { useState } from 'react';
import { X, ExternalLink, Calendar, CheckCircle, Loader2 } from 'lucide-react';
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

const markdownComponents = {
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 font-mono"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </a>
  ),
};

export const ReleaseModal: React.FC<ReleaseModalProps> = ({ isOpen, onClose, release, installedVersion, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!isOpen) return null;

  const handleMarkInstalled = async () => {
    if (!release.repo_id) return;
    setUpdating(true);
    try {
      await axios.put(`/api/repos/${release.repo_id}`, {
        installed_version: release.tag_name,
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update installed version', error);
      alert('FAILED TO UPDATE INSTALLED VERSION');
    } finally {
      setUpdating(false);
    }
  };

  const isInstalled = installedVersion === release.tag_name;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div>
            <h2 className="font-syne font-extrabold text-xl uppercase text-zinc-900 dark:text-white flex items-center gap-2">
              {release.name || release.tag_name}
              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 border border-blue-200 dark:border-blue-800 font-mono">
                {release.tag_name}
              </span>
              {isInstalled && (
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5 border border-emerald-200 dark:border-emerald-800 font-mono font-bold uppercase flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  INSTALLED
                </span>
              )}
            </h2>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
              {release.owner}/{release.repo}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase mb-5 pb-3 border-b border-zinc-200 dark:border-zinc-800 flex-wrap">
            {release.published_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                PUBLISHED {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
              </div>
            )}

            <div className="ml-auto flex items-center gap-3">
              {!isInstalled && release.repo_id && (
                <button
                  onClick={handleMarkInstalled}
                  disabled={updating}
                  className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 font-bold uppercase transition-colors"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  MARK AS INSTALLED
                </button>
              )}

              {release.html_url && (
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold uppercase"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  VIEW ON {release.html_url.includes('aur.archlinux.org') ? 'AUR' : 'GITHUB'}
                </a>
              )}
            </div>
          </div>

          <div className="prose prose-xs max-w-none text-zinc-600 dark:text-zinc-300 text-xs font-mono dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {release.body || '*No release description provided.*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
