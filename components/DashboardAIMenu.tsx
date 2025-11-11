'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DashboardAIMenuProps {
  onOpenAIChat: () => void;
  prompts: any[];
  selectedPrompt: string;
  onPromptChange: (prompt: string) => void;
  loadingPrompts: boolean;
}

const DashboardAIMenu: React.FC<DashboardAIMenuProps> = ({
  onOpenAIChat,
  prompts,
  selectedPrompt,
  onPromptChange,
  loadingPrompts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open AI Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">AI</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <div className="p-4 space-y-4">
            <button
              onClick={() => {
                onOpenAIChat();
                setIsOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
            >
              AI Insights
            </button>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Prompt:</label>
              <select
                value={selectedPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                disabled={loadingPrompts}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a prompt...</option>
                {prompts.map((prompt) => (
                  <option key={`${prompt.email_address}/${prompt.prompt_name}`} value={prompt.prompt_name}>
                    {prompt.prompt_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAIMenu;
