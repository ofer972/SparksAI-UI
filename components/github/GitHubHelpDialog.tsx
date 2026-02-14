'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { authFetch } from '@/lib/api';

type MdProps = { children?: React.ReactNode };

const markdownComponents = {
  p: ({ children }: MdProps) => <p className="text-sm text-content-secondary mb-3">{children}</p>,
  strong: ({ children }: MdProps) => <strong className="font-semibold text-content-primary">{children}</strong>,
  em: ({ children }: MdProps) => <em className="italic">{children}</em>,
  ul: ({ children }: MdProps) => <ul className="list-disc list-inside text-sm text-content-secondary mb-3">{children}</ul>,
  ol: ({ children }: MdProps) => <ol className="list-decimal list-inside text-sm text-content-secondary mb-3">{children}</ol>,
  li: ({ children }: MdProps) => <li className="text-content-secondary">{children}</li>,
  code: ({ children }: MdProps) => <code className="bg-surface-secondary px-1 rounded text-xs">{children}</code>,
  pre: ({ children }: MdProps) => <pre className="bg-surface-secondary p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap mb-3">{children}</pre>,
  h1: ({ children }: MdProps) => <h1 className="text-xl font-bold text-content-primary mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }: MdProps) => <h2 className="text-lg font-bold text-content-primary mt-4 mb-2">{children}</h2>,
  h3: ({ children }: MdProps) => <h3 className="text-base font-semibold text-content-primary mt-3 mb-2">{children}</h3>,
  blockquote: ({ children }: MdProps) => <blockquote className="border-l-2 border-outline pl-3 italic text-content-secondary mb-3">{children}</blockquote>,
  hr: () => <hr className="border-outline my-4" />,
};

type HelpTopic = 'pr-metrics' | 'dora-metrics';

interface GitHubHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topic: HelpTopic | null;
}

export default function GitHubHelpDialog({ isOpen, onClose, topic }: GitHubHelpDialogProps) {
  const [label, setLabel] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !topic) return;
    setError(null);
    setLoading(true);
    authFetch(`/api/v1/github-service/help?topic=${topic}`)
      .then((res) => res.json())
      .then((data) => {
        setLabel(data?.label ?? 'Help');
        setMarkdown(data?.markdown ?? '');
      })
      .catch(() => setError('Failed to load help.'))
      .finally(() => setLoading(false));
  }, [isOpen, topic]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-[46.2rem] w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline flex-shrink-0">
          <h2 className="text-xl font-semibold text-content-primary">{label || 'Help'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-secondary text-content-secondary"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {loading && <p className="text-content-secondary">Loading…</p>}
          {error && <p className="text-danger-text">{error}</p>}
          {!loading && !error && markdown && (
            <div className="text-content-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="border-t border-outline px-6 py-3 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
