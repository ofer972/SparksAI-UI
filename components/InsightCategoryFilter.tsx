'use client';

import { useState, useEffect, useRef } from 'react';
import { buildBackendUrl, API_CONFIG } from '@/lib/config';
import { authFetch } from '@/lib/api';

interface InsightCategory {
  name: string;
  class: string;
}

interface InsightCategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  className?: string;
}

export default function InsightCategoryFilter({ 
  selectedCategories, 
  onCategoriesChange, 
  className = '' 
}: InsightCategoryFilterProps) {
  const [categories, setCategories] = useState<InsightCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch raw response to get class field
        const url = buildBackendUrl(API_CONFIG.endpoints.insightTypes.getCategories);
        
        const response = await authFetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Extract categories from response
        let categoryObjects: InsightCategory[] = [];
        if (result.success && result.data && result.data.categories) {
          categoryObjects = result.data.categories.map((cat: string | { name: string; class: string }) => {
            if (typeof cat === 'string') {
              return { name: cat, class: 'Team' }; // Default to Team if string
            }
            return cat;
          });
        }
        
        // Filter to only Team categories
        const teamCategories = categoryObjects.filter((cat: InsightCategory) => cat.class === 'Team');
        setCategories(teamCategories);
      } catch (err) {
        console.error('Error fetching insight categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      onCategoriesChange(selectedCategories.filter(cat => cat !== categoryName));
    } else {
      onCategoriesChange([...selectedCategories, categoryName]);
    }
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  if (loading) {
    return (
      <div className={`relative z-10 flex items-center space-x-1 ${className}`}>
        <span className="text-sm font-medium text-gray-700">Categories:</span>
        <button 
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          disabled
        >
          Loading...
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative z-10 flex items-center space-x-1 ${className}`}>
        <span className="text-sm font-medium text-gray-700">Categories:</span>
        <button 
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          disabled
        >
          Error
        </button>
      </div>
    );
  }

  return (
    <div className={`relative z-10 ${className}`} ref={dropdownRef}>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium text-gray-700">Categories:</span>
        <div className="relative">
          <button
            onClick={handleToggleDropdown}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center space-x-1 min-w-[300px] justify-between"
          >
            <span className="truncate">
              {selectedCategories.length === 0 
                ? 'All' 
                : selectedCategories.join(', ')}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[300px] max-h-60 overflow-y-auto">
          <div className="p-2">
            {categories.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">No Team categories available</div>
            ) : (
              categories.map((category) => (
                <label
                  key={category.name}
                  className="flex items-center space-x-2 py-2 px-2 hover:bg-gray-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.name)}
                    onChange={() => toggleCategory(category.name)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
          )}
        </div>
      </div>
    </div>
  );
}

