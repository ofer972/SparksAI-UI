'use client';

import { useState, useRef, useEffect } from 'react';

interface Repository {
  id: number;
  github_repo_id: number;
  name: string;
}

interface RepositoryMultiSelectProps {
  githubRepoIds: number[];
  availableRepositories: Repository[];
  onGithubRepoIdsChange: (ids: number[]) => void;
}

export default function RepositoryMultiSelect({
  githubRepoIds,
  availableRepositories,
  onGithubRepoIdsChange,
}: RepositoryMultiSelectProps) {
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(event.target as Node)) {
        setRepoDropdownOpen(false);
      }
    };

    if (repoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [repoDropdownOpen]);

  const handleRepositoryToggle = (githubRepoId: number) => {
    if (githubRepoIds.includes(githubRepoId)) {
      onGithubRepoIdsChange(githubRepoIds.filter(id => id !== githubRepoId));
    } else {
      onGithubRepoIdsChange([...githubRepoIds, githubRepoId]);
    }
  };

  const handleSelectAll = () => {
    if (githubRepoIds.length === availableRepositories.length) {
      onGithubRepoIdsChange([]);
    } else {
      onGithubRepoIdsChange(availableRepositories.map(r => r.github_repo_id));
    }
  };

  const getRepositoryDisplayText = () => {
    if (githubRepoIds.length === 0) {
      return 'All Repositories';
    }
    if (githubRepoIds.length === availableRepositories.length) {
      return 'All Repositories';
    }
    const selectedRepoNames = githubRepoIds
      .map(githubRepoId => availableRepositories.find(r => r.github_repo_id === githubRepoId)?.name)
      .filter(Boolean);

    if (selectedRepoNames.length <= 2) {
      return selectedRepoNames.join(', ');
    }
    return `${selectedRepoNames.slice(0, 2).join(', ')} +${selectedRepoNames.length - 2} more`;
  };

  return (
    <div className="relative" ref={repoDropdownRef}>
      <button
        type="button"
        onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
        className="w-full px-2 py-1 text-left border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between min-w-[280px]"
      >
        <span className={`truncate ${githubRepoIds.length === 0 || githubRepoIds.length === availableRepositories.length ? 'text-gray-500' : 'text-gray-900'}`}>
          {getRepositoryDisplayText()}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${repoDropdownOpen ? 'transform rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {repoDropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRepoDropdownOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {githubRepoIds.length === availableRepositories.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {availableRepositories.map((repo) => (
                <label
                  key={repo.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={githubRepoIds.includes(repo.github_repo_id)}
                    onChange={() => handleRepositoryToggle(repo.github_repo_id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">{repo.name}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}



