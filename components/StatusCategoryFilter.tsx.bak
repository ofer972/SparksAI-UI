'use client';

import React, { useState, useEffect, useRef } from 'react';

interface StatusCategoryFilterProps {
  value: string[];
  onChange: (values: string[]) => void;
  options?: string[];
  className?: string;
}

const StatusCategoryFilter: React.FC<StatusCategoryFilterProps> = ({
  value,
  onChange,
  options = ['To Do', 'In Progress', 'Done'],
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [localStatusCategories, setLocalStatusCategories] = useState<string[]>(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      return value;
    }
    return options;
  });

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      setLocalStatusCategories(value);
    } else if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      setLocalStatusCategories(options);
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleStatusCategoryChange = (values: string[]) => {
    setLocalStatusCategories(values);
    
    const allSelected = values.length === options.length;
    const noneSelected = values.length === 0;
    
    if (allSelected || noneSelected) {
      onChange([]);
    } else {
      onChange(values);
    }
  };

  const getStatusDisplayText = () => {
    if (localStatusCategories.length === options.length) {
      return 'All statuses selected';
    }
    if (localStatusCategories.length === 0) {
      return 'All statuses selected';
    }
    if (localStatusCategories.length <= 2) {
      return localStatusCategories.join(', ');
    }
    return `${localStatusCategories.length} selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full px-2 py-1 text-left border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <span className={`truncate ${localStatusCategories.length === 0 || localStatusCategories.length === options.length ? 'text-gray-500' : 'text-gray-900'}`}>
          {getStatusDisplayText()}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${dropdownOpen ? 'transform rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localStatusCategories.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleStatusCategoryChange([...localStatusCategories, option]);
                      } else {
                        handleStatusCategoryChange(localStatusCategories.filter((c) => c !== option));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusCategoryFilter;

