'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import TreeSelect from './TreeSelect';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const { user, savePreferences, preferencesLoading } = useUser();
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'group' | 'team' | 'none'>('none');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (value: string | null, label: string, type: 'group' | 'team') => {
    setSelectedValue(value);
    setSelectedLabel(label);
    setSelectedType(value ? type : 'none');
  };

  const handleGetStarted = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await savePreferences({
        default_team_or_group: selectedLabel || undefined,
        default_type: selectedType,
        has_completed_onboarding: true,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await savePreferences({
        default_team_or_group: null,
        default_type: 'none',
        has_completed_onboarding: true,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const userName = user?.user_name || user?.name || 'there';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome to SparksAI!</h1>
            </div>
          </div>
          <p className="text-white/90 text-lg">
            Hi {userName}, let's personalize your experience.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-content-primary mb-2">
              Set your default team or group
            </h2>
            <p className="text-content-secondary text-sm mb-4">
              Choose a team or group to see by default when you open the app. 
              You can always change this later in your settings.
            </p>

            <div className="relative">
              <TreeSelect
                selectedValue={selectedValue}
                onSelect={handleSelect}
                placeholder="Select a team or group (optional)"
              />
            </div>

            {selectedValue && (
              <div className="mt-3 flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  You'll see <strong>{selectedLabel}</strong> by default
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={handleSkip}
              disabled={saving || preferencesLoading}
              className="px-4 py-2 text-content-secondary hover:text-content-primary text-sm font-medium transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>

            <button
              onClick={handleGetStarted}
              disabled={saving || preferencesLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl 
                         hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg shadow-teal-500/25
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  Get Started
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

