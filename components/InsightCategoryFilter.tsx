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
 settingsLoading?: boolean; // Indicates if saved settings are still loading
 hasSavedSettings?: boolean; // Indicates if settings were successfully loaded from backend
}

export default function InsightCategoryFilter({ 
 selectedCategories, 
 onCategoriesChange, 
 className = '',
 settingsLoading = false,
 hasSavedSettings = false
}: InsightCategoryFilterProps) {
 const [categories, setCategories] = useState<InsightCategory[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const buttonRef = useRef<HTMLButtonElement>(null);
 const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
 const autoSelectDone = useRef(false);
 const prevHasSavedSettingsRef = useRef(hasSavedSettings);
 
 // Reset auto-select flag on mount (when navigating to this page)
 useEffect(() => {
 console.log('[InsightCategoryFilter] Component mounted, resetting auto-select flag');
 autoSelectDone.current = false;
 
 return () => {
 console.log('[InsightCategoryFilter] Component unmounting');
 };
 }, []);
 
 // Reset auto-select flag when hasSavedSettings changes (e.g., when navigating back and settings load)
 useEffect(() => {
 if (prevHasSavedSettingsRef.current !== hasSavedSettings) {
 console.log('[InsightCategoryFilter] hasSavedSettings changed from', prevHasSavedSettingsRef.current, 'to', hasSavedSettings, '- resetting auto-select flag');
 autoSelectDone.current = false;
 prevHasSavedSettingsRef.current = hasSavedSettings;
 }
 }, [hasSavedSettings]);

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
 
 // Show all categories (no filtering by class)
 setCategories(categoryObjects);
 
 // Note: Auto-select first category is handled in a separate useEffect that waits for settings to load
 } catch (err) {
 console.error('Error fetching insight categories:', err);
 setError(err instanceof Error ? err.message : 'Failed to fetch categories');
 } finally {
 setLoading(false);
 }
 };

 fetchCategories();
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 // Auto-select first category after settings have loaded if no categories are selected
 // Only run this if:
 // 1. Settings are done loading
 // 2. No settings were found (new user or no saved preferences)
 // 3. No categories are currently selected
 // 4. We haven't auto-selected yet
 // 5. Categories list is loaded
 useEffect(() => {
 console.log('[InsightCategoryFilter] Auto-select check:', {
 settingsLoading,
 hasSavedSettings,
 categoriesLength: categories.length,
 selectedCategoriesLength: selectedCategories.length,
 autoSelectDone: autoSelectDone.current,
 loading
 });
 
 // Don't auto-select if:
 // - Settings are still loading
 // - We have saved settings AND categories are selected (respect user's saved choice)
 // - Categories haven't loaded yet
 // - We already have categories selected
 // - We've already done the auto-select
 if (settingsLoading || (hasSavedSettings && selectedCategories.length > 0) || loading || categories.length === 0 || selectedCategories.length > 0 || autoSelectDone.current) {
 console.log('[InsightCategoryFilter] Auto-select conditions not met, returning.');
 return;
 }
 
 // Auto-select the first available category
 if (categories.length > 0) {
 console.log('[InsightCategoryFilter] Auto-selecting first category:', categories[0].name);
 onCategoriesChange([categories[0].name]);
 autoSelectDone.current = true;
 }
 }, [settingsLoading, hasSavedSettings, categories, selectedCategories, onCategoriesChange, loading]);

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
 if (!isOpen && buttonRef.current) {
 const rect = buttonRef.current.getBoundingClientRect();
 setDropdownPosition({
 top: rect.bottom + 4,
 left: rect.left,
 });
 }
 setIsOpen(!isOpen);
 };

 if (loading) {
 return (
 <div className={`relative z-[100] flex items-center space-x-1 ${className}`}>
 <span className="text-sm font-medium text-content-secondary">Focus:</span>
 <button 
 className="border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary"
 disabled
 >
 Loading...
 </button>
 </div>
 );
 }

 if (error) {
 return (
 <div className={`relative z-[100] flex items-center space-x-1 ${className}`}>
 <span className="text-sm font-medium text-content-secondary">Focus:</span>
 <button 
 className="border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary"
 disabled
 >
 Error
 </button>
 </div>
 );
 }

 return (
 <div className={`relative z-40 ${className}`} ref={dropdownRef}>
 <div className="flex flex-col md:flex-row md:items-center gap-1">
 <span className="text-sm font-medium text-content-secondary whitespace-nowrap">Focus:</span>
 <div className="relative w-full md:w-auto">
 <button
 ref={buttonRef}
 onClick={handleToggleDropdown}
 className="border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 hover:border-outline-strong hover:border-outline-strong transition-colors flex items-center space-x-1 w-full md:min-w-[200px] md:max-w-[300px] justify-between"
 >
 <span className="truncate">
 {selectedCategories.length === 0 
 ? 'None' 
 : selectedCategories.length === categories.length
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
 <>
 <div 
 className="fixed bg-surface border border-outline-strong rounded-lg shadow-lg z-40 w-[90vw] md:w-auto md:min-w-[250px] max-h-60 overflow-y-auto"
 style={{
 top: `${dropdownPosition.top}px`,
 left: `${dropdownPosition.left}px`,
 maxWidth: 'calc(100vw - 32px)' // Ensure it fits on mobile screen with padding
 }}
 >
 <div className="p-2">
 {categories.length === 0 ? (
 <div className="text-sm text-content-muted py-2">No categories available</div>
 ) : (
 categories.map((category) => (
 <label
 key={category.name}
 className="flex items-center space-x-2 py-2 px-2 hover:bg-surface-elevated cursor-pointer rounded"
 >
 <input
 type="checkbox"
 checked={selectedCategories.includes(category.name)}
 onChange={() => toggleCategory(category.name)}
 className="w-4 h-4 text-brand border-outline-strong rounded focus:ring-brand"
 />
 <span className="text-sm text-content-secondary">{category.name}</span>
 </label>
 ))
 )}
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 );
}

