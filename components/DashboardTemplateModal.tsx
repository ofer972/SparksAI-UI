'use client';

import React, { useState, useEffect } from 'react';
import { getPITerminology } from '@/lib/piTerminology';
import { ApiService } from '@/lib/api';
import { configCache } from '@/lib/configCache';

export interface DashboardTemplate {
  id: 'team' | 'pi' | 'blank';
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: {
    title: string;
    items: string[];
  };
  color: string;
}

interface DashboardTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: 'team' | 'pi' | 'blank', name: string, description: string) => void;
}

// Fallback names when API data is not available
const TEAM_TEMPLATE_FALLBACK_ITEMS = [
  'Current Sprint Progress',
  'Team Sprint Burndown',
  'Closed Sprints History',
  'Sprint Predictability',
  'Issues Trend Analysis',
];

const getPITemplateFallbackItems = () => [
  `${getPITerminology()} Objectives & Progress`,
  'Feature Completion Status',
  `Team Velocity by ${getPITerminology()}`,
  'Dependencies Tracking',
  `${getPITerminology()} Risks & Issues`,
];

export default function DashboardTemplateModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate 
}: DashboardTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'team' | 'pi' | 'blank'>('blank');
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [teamReportNames, setTeamReportNames] = useState<string[]>([]);
  const [piReportNames, setPiReportNames] = useState<string[]>([]);

  // Fetch actual report names from dashboard config when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadReportNames = async () => {
      try {
        const apiService = new ApiService();
        const [reports, configs] = await Promise.all([
          configCache.getReportDefinitions(() => apiService.getReportDefinitions()),
          configCache.getDashboardConfigs(() => apiService.getDashboardViewConfigs()),
        ]);

        if (cancelled) return;

        const reportNameMap = new Map(reports.map((r) => [r.report_id, r.report_name]));

        const getReportIdsFromConfig = (viewName: string): string[] => {
          const config = configs.find((c) => c.view === viewName);
          if (!config?.reportIds?.length) return [];

          const ids: string[] = [];
          if (config.layout_config?.rows) {
            config.layout_config.rows.forEach((row: { reportIds?: string[] }) => {
              row.reportIds?.forEach((id) => ids.push(id));
            });
          }
          if (ids.length === 0) {
            return config.reportIds || [];
          }
          return ids;
        };

        const teamIds = getReportIdsFromConfig('team-dashboard');
        const piIds = getReportIdsFromConfig('pi-dashboard');

        const teamNames = teamIds
          .map((id) => reportNameMap.get(id))
          .filter((name): name is string => !!name);
        const piNames = piIds
          .map((id) => reportNameMap.get(id))
          .filter((name): name is string => !!name);

        setTeamReportNames(teamNames.length > 0 ? teamNames : TEAM_TEMPLATE_FALLBACK_ITEMS);
        setPiReportNames(piNames.length > 0 ? piNames : getPITemplateFallbackItems());
      } catch (err) {
        if (!cancelled) {
          console.warn('[DashboardTemplateModal] Failed to load report names, using fallbacks:', err);
          setTeamReportNames(TEAM_TEMPLATE_FALLBACK_ITEMS);
          setPiReportNames(getPITemplateFallbackItems());
        }
      }
    };

    loadReportNames();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const templates: DashboardTemplate[] = [
    {
      id: 'blank',
      name: 'Start from Scratch',
      description: 'Create a completely empty dashboard and build it your way',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      preview: {
        title: 'Empty Canvas',
        items: [
          'No pre-configured reports',
          'Full customization freedom',
          'Add any reports you need',
        ],
      },
      color: 'from-gray-400 to-gray-600',
    },
    {
      id: 'team',
      name: 'Team Dashboard Template',
      description: 'Pre-configured with team-focused reports and metrics',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      preview: {
        title: 'Includes',
        items: teamReportNames.length > 0 ? teamReportNames : TEAM_TEMPLATE_FALLBACK_ITEMS,
      },
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'pi',
      name: `${getPITerminology()} Dashboard Template`,
      description: `Pre-configured with ${getPITerminology().toLowerCase()} reports and KPIs`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      preview: {
        title: 'Includes',
        items: piReportNames.length > 0 ? piReportNames : getPITemplateFallbackItems(),
      },
      color: 'from-purple-500 to-pink-600',
    },
  ];

  const handleContinue = () => {
    if (step === 'template') {
      setStep('details');
    } else {
      if (dashboardName.trim()) {
        onSelectTemplate(selectedTemplate, dashboardName, dashboardDescription);
        handleClose();
      }
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('template');
    }
  };

  const handleClose = () => {
    setStep('template');
    setSelectedTemplate('blank');
    setDashboardName('');
    setDashboardDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-outline bg-gradient-to-r from-brand/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3">
                <div className="p-2 bg-brand rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Create New Dashboard
              </h2>
              <p className="text-sm text-content-secondary mt-1">
                {step === 'template' 
                  ? 'Choose a template or start from scratch' 
                  : 'Enter dashboard details'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-1 rounded-full ${step === 'template' ? 'bg-brand' : 'bg-brand'}`} />
            <div className={`flex-1 h-1 rounded-full ${step === 'details' ? 'bg-brand' : 'bg-outline'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 'template' ? (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-content-primary mb-2">
                  Select a Template
                </h3>
                <p className="text-sm text-content-secondary">
                  Templates come pre-configured with reports to help you get started quickly
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`group relative flex flex-col bg-surface-elevated rounded-xl border-2 transition-all duration-200 overflow-hidden text-left p-0 ${
                      selectedTemplate === template.id
                        ? 'border-brand shadow-lg shadow-brand/20 scale-[1.02]'
                        : 'border-outline hover:border-brand/50 hover:shadow-md'
                    }`}
                  >
                    {/* Gradient header - flush with top of card */}
                    <div className={`h-24 flex-shrink-0 bg-gradient-to-br ${template.color} flex items-center justify-center relative`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative text-white">
                        {template.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-content-primary text-base leading-tight pr-2">
                          {template.name}
                        </h4>
                        {selectedTemplate === template.id && (
                          <div className="flex-shrink-0 w-6 h-6 bg-brand rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-content-secondary mb-4 leading-relaxed">
                        {template.description}
                      </p>

                      {/* Preview items */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-content-primary uppercase tracking-wide">
                          {template.preview.title}
                        </p>
                        <ul className="space-y-1.5">
                          {template.preview.items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-content-secondary">
                              <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-content-primary mb-2">
                  Dashboard Details
                </h3>
                <p className="text-sm text-content-secondary">
                  Give your dashboard a name and optional description
                </p>
              </div>

              {/* Selected template preview */}
              <div className="mb-8 p-4 bg-surface-elevated rounded-xl border border-outline">
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${templates.find(t => t.id === selectedTemplate)?.color} rounded-lg text-white`}>
                    {templates.find(t => t.id === selectedTemplate)?.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide">Using Template</p>
                    <p className="font-bold text-content-primary">{templates.find(t => t.id === selectedTemplate)?.name}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-content-secondary mb-2">
                    Dashboard Name <span className="text-danger-text">*</span>
                  </label>
                  <input
                    type="text"
                    value={dashboardName}
                    onChange={(e) => setDashboardName(e.target.value)}
                    placeholder="e.g., My Team Performance Dashboard"
                    className="w-full px-4 py-3 bg-surface-elevated border-2 border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm text-content-primary placeholder-content-muted transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-content-secondary mb-2">
                    Description <span className="text-content-muted font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={dashboardDescription}
                    onChange={(e) => setDashboardDescription(e.target.value)}
                    placeholder="Add a description to help you remember what this dashboard is for..."
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-elevated border-2 border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm text-content-primary placeholder-content-muted transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-outline bg-surface-elevated flex items-center justify-between">
          <button
            onClick={step === 'template' ? handleClose : handleBack}
            className="px-6 py-2.5 text-sm font-semibold text-content-secondary hover:text-content-primary hover:bg-surface rounded-lg transition-all"
          >
            {step === 'template' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleContinue}
            disabled={step === 'details' && !dashboardName.trim()}
            className="px-8 py-2.5 bg-gradient-to-r from-brand to-brand hover:from-brand-hover hover:to-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            {step === 'template' ? (
              <>
                Continue
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Dashboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
