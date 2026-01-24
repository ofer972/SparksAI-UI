'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import TreeSelect from '../TreeSelect';

export default function UserSettingsView() {
 const { user, preferences, preferencesLoading, savePreferences } = useUser();
 
 const [selectedValue, setSelectedValue] = useState<string | null>(null);
 const [selectedLabel, setSelectedLabel] = useState<string>('');
 const [selectedType, setSelectedType] = useState<'group' | 'team' | 'none'>('none');
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [hasChanges, setHasChanges] = useState(false);

 // Initialize from preferences
 useEffect(() => {
 if (preferences) {
 let teamGroupName = preferences.default_team_or_group || null;
 
 // Clean the team/group name (in case it has tree value format from old data)
 if (teamGroupName && teamGroupName.includes(':')) {
 // Handle old format like"team:Engineering" -> extract"Engineering"
 teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
 }
 
 if (teamGroupName && preferences.default_type && preferences.default_type !== 'none') {
 // Construct tree value for TreeSelect
 const treeValue = preferences.default_type === 'group'
 ? `group:${teamGroupName}`
 : `team:${teamGroupName}`;
 setSelectedValue(treeValue);
 setSelectedLabel(teamGroupName);
 setSelectedType(preferences.default_type as 'group' | 'team');
 } else {
 setSelectedValue(null);
 setSelectedLabel('');
 setSelectedType('none');
 }
 }
 }, [preferences]);

 const handleSelect = (value: string | null, label: string, type: 'group' | 'team') => {
 setSelectedValue(value);
 setSelectedLabel(label);
 setSelectedType(value ? type : 'none');
 setHasChanges(true);
 setSuccessMessage(null);
 };

 const handleSave = async () => {
 setSaving(true);
 setError(null);
 setSuccessMessage(null);
 
 try {
 await savePreferences({
 default_team_or_group: selectedLabel || null,
 default_type: selectedType,
 });
 setSuccessMessage('Settings saved successfully');
 setHasChanges(false);
 } catch (err: any) {
 console.error('Failed to save preferences:', err);
 setError(err.message || 'Failed to save settings');
 } finally {
 setSaving(false);
 }
 };

 const handleClear = () => {
 setSelectedValue(null);
 setSelectedLabel('');
 setSelectedType('none');
 setHasChanges(true);
 setSuccessMessage(null);
 };

 const userName = user?.user_name || user?.name || 'User';
 const userEmail = user?.email || '';
 const userInitials = userName
 .split(' ')
 .map((n: string) => n[0])
 .join('')
 .toUpperCase()
 .slice(0, 2);

 return (
    <div className="min-h-full bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated">
 {/* Header */}
        <div className="border-b border-outline bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
 <div className="max-w-4xl mx-auto px-6 py-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 to-surface rounded-xl shadow-lg">
 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 </div>
 <div>
 <h1 className="text-2xl font-bold text-content-primary text-content-primary">Settings</h1>
 <p className="text-sm text-content-tertiary text-content-muted mt-0.5">Manage your account and preferences</p>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="max-w-4xl mx-auto px-6 py-8">
 <div className="space-y-8">
 
 {/* Profile Card */}
 <div className="bg-surface rounded-2xl border border-outline border-outline shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-100 border-outline">
 <h2 className="text-lg font-semibold text-content-primary text-content-primary flex items-center gap-2">
 <svg className="w-5 h-5 text-content-muted text-content-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 Profile
 </h2>
 </div>
 <div className="p-6">
 <div className="flex items-center gap-5">
 <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white font-bold text-2xl shadow-lg">
 {userInitials}
 </div>
 <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 dark:bg-green-600 rounded-full border-4 border-white border-outline"></div>
 </div>
 <div className="flex-1">
 <h3 className="text-xl font-semibold text-content-primary text-content-primary">{userName}</h3>
 {userEmail && (
 <p className="text-sm text-content-tertiary text-content-muted mt-1 flex items-center gap-2">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
 </svg>
 {userEmail}
 </p>
 )}
 <div className="mt-3 flex items-center gap-2">
 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-secondary bg-surface-elevated text-content-secondary text-content-tertiary">
 {user?.user_type || 'User'}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Preferences Card */}
 <div className="bg-surface rounded-2xl border border-outline border-outline shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-100 border-outline">
 <h2 className="text-lg font-semibold text-content-primary text-content-primary flex items-center gap-2">
 <svg className="w-5 h-5 text-content-muted text-content-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
 </svg>
 Preferences
 </h2>
 </div>
 <div className="p-6 space-y-6">
 
 {/* Default Team/Group */}
 <div>
 <label className="block text-sm font-medium text-content-secondary text-content-tertiary mb-2">
 Default Team or Group
 </label>
 <p className="text-sm text-content-tertiary text-content-muted mb-4">
 Choose which team or group to show by default when you open the app. This helps you quickly access your most used workspace.
 </p>
 
 <div className="flex items-center gap-3">
 <div className="flex-1 max-w-md">
 <TreeSelect
 selectedValue={selectedValue}
 onSelect={handleSelect}
 placeholder="Select a team or group"
 />
 </div>
 {selectedValue && (
 <button
 onClick={handleClear}
 className="p-2 text-content-muted text-content-muted hover:text-content-secondary dark:hover:text-slate-300 hover:bg-surface-secondary hover:bg-surface-elevated rounded-lg transition-colors"
 title="Clear selection"
 >
 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 </div>
 
 {selectedValue && (
 <div className="mt-4 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-xl">
 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
 <svg className="w-5 h-5 text-emerald-600 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <div>
 <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
 Default workspace set
 </p>
 <p className="text-sm text-emerald-600 text-emerald-400">
 {selectedLabel || selectedValue} will be your default view
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Notifications */}
 {error && (
 <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-xl">
 <div className="p-2 bg-danger-bg rounded-lg">
 <svg className="w-5 h-5 text-danger-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <p className="text-sm text-red-800 text-red-300">{error}</p>
 </div>
 )}

 {successMessage && (
 <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-xl">
 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
 <svg className="w-5 h-5 text-emerald-600 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <p className="text-sm text-emerald-800 dark:text-emerald-300">{successMessage}</p>
 </div>
 )}

 {/* Save Button */}
 <div className="flex items-center justify-end gap-4 pt-4">
 <button
 onClick={handleSave}
 disabled={saving || preferencesLoading || !hasChanges}
 className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 bg-surface-elevated text-white font-medium rounded-xl 
 hover:bg-slate-800 hover:bg-surface-secondary transition-all shadow-lg shadow-slate-900/25 dark:shadow-slate-900/50
 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
 >
 {saving ? (
 <>
 <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
 </svg>
 Saving...
 </>
 ) : (
 <>
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 Save Changes
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
