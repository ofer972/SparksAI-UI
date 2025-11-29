'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface DashboardData {
  layoutConfig: any;
  topBarFilters: Record<string, any>;
  reportFilters: Record<string, any>;
  pinnedFilters: Record<string, any>;
}

interface DashboardAIMenuProps {
  onOpenAIChat: (dashboardData?: DashboardData | null) => void;
  prompts: any[];
  selectedPrompt: string;
  onPromptChange: (prompt: string) => void;
  loadingPrompts: boolean;
  onCollectDashboardData?: () => Promise<DashboardData | null> | DashboardData | null;
}

function DashboardAIMenu({
  onOpenAIChat,
  prompts,
  selectedPrompt,
  onPromptChange,
  loadingPrompts,
  onCollectDashboardData,
}: DashboardAIMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update dropdown position
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.right - 320, // 320px = w-80 (20rem)
      });
    }
  };

  // Update position when opened
  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // Update position on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dropdownContent = isOpen && (
    <div 
      ref={menuRef}
      className="fixed w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[99999] overflow-hidden backdrop-blur-sm"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
      }}
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-5 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">AI Assistant</h3>
            <p className="text-blue-100 text-xs">Powered by AI</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* AI Insights Button */}
        <button
          onClick={async () => {
            console.log('[DashboardAIMenu] Collecting dashboard data...');
            const dashboardData = await onCollectDashboardData?.();
            console.log('[DashboardAIMenu] Collected dashboard data:', dashboardData);
            onOpenAIChat(dashboardData);
            setIsOpen(false);
          }}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          <div className="relative flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Open AI Insights</span>
          </div>
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">Customize</span>
          </div>
        </div>

        {/* Prompt Selector */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>Select Prompt</span>
          </label>
          <select
            value={selectedPrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={loadingPrompts}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a prompt template...</option>
            {prompts.map((prompt) => (
              <option key={`${prompt.email_address}/${prompt.prompt_name}`} value={prompt.prompt_name}>
                {prompt.prompt_name}
              </option>
            ))}
          </select>
          {loadingPrompts && (
            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading prompts...</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Select a prompt to customize your AI experience
        </p>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
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

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}

export default DashboardAIMenu;
