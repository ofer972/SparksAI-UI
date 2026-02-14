'use client';

import React, { useState, useEffect } from 'react';
import { getPITerminology } from '@/lib/piTerminology';
import { ApiService, getPublicDashboards } from '@/lib/api';
import { configCache } from '@/lib/configCache';
import type { PublicDashboard } from '@/lib/config';

export interface DashboardTemplate {
  id: 'team' | 'pi' | 'blank' | 'public';
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
  onSelectTemplate: (templateId: 'team' | 'pi' | 'blank' | 'public', name: string, description: string, sourceDashboardId?: string) => void;
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
  const [selectedTemplate, setSelectedTemplate] = useState<'team' | 'pi' | 'blank' | 'public'>('blank');
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [step, setStep] = useState<'template' | 'browse' | 'details'>('template');
  const [teamReportNames, setTeamReportNames] = useState<string[]>([]);
  const [piReportNames, setPiReportNames] = useState<string[]>([]);

  // Public dashboard browser state
  const [publicDashboards, setPublicDashboards] = useState<PublicDashboard[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedPublicDashboardId, setSelectedPublicDashboardId] = useState('');
  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [emailInputValue, setEmailInputValue] = useState('');
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false);
  const emailComboRef = React.useRef<HTMLDivElement>(null);

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

  // Fetch public dashboards when entering browse step
  useEffect(() => {
    if (step !== 'browse') return;
    let cancelled = false;
    const loadPublic = async () => {
      setLoadingPublic(true);
      try {
        const data = await getPublicDashboards();
        if (!cancelled) {
          setPublicDashboards(data);
        }
      } catch (err) {
        console.error('[DashboardTemplateModal] Failed to load public dashboards:', err);
        if (!cancelled) {
          setPublicDashboards([]);
        }
      } finally {
        if (!cancelled) setLoadingPublic(false);
      }
    };
    loadPublic();
    return () => { cancelled = true; };
  }, [step]);

  // Close email dropdown on click outside
  React.useEffect(() => {
    if (!emailDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emailComboRef.current && !emailComboRef.current.contains(e.target as Node)) {
        setEmailDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emailDropdownOpen]);

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
    {
      id: 'public',
      name: 'From Public Dashboard',
      description: 'Clone a dashboard shared by another user as your starting point',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      preview: {
        title: 'How it works',
        items: [
          'Browse dashboards shared by others',
          'Filter by user email',
          'Clone layout and widgets',
        ],
      },
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  // Derived data for public dashboard browser
  const uniqueEmails = Array.from(new Set(publicDashboards.map(d => d.owner_email))).sort();
  const filteredEmails = emailInputValue
    ? uniqueEmails.filter(e => e.toLowerCase().includes(emailInputValue.toLowerCase()))
    : uniqueEmails;
  const filteredPublicDashboards = publicDashboards.filter(d => {
    const matchesEmail = !selectedEmail || d.owner_email === selectedEmail;
    const matchesSearch = !publicSearchQuery || 
      d.name.toLowerCase().includes(publicSearchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(publicSearchQuery.toLowerCase())) ||
      d.owner_email.toLowerCase().includes(publicSearchQuery.toLowerCase());
    return matchesEmail && matchesSearch;
  });

  const handleContinue = () => {
    if (step === 'template') {
      if (selectedTemplate === 'public') {
        setStep('browse');
      } else {
        setStep('details');
      }
    } else if (step === 'browse') {
      if (selectedPublicDashboardId) {
        // Pre-fill the name from the selected dashboard
        const selected = publicDashboards.find(d => d.id === selectedPublicDashboardId);
        if (selected && !dashboardName) {
          setDashboardName(`${selected.name} (copy)`);
        }
        setStep('details');
      }
    } else {
      if (dashboardName.trim()) {
        onSelectTemplate(selectedTemplate, dashboardName, dashboardDescription, selectedPublicDashboardId || undefined);
        handleClose();
      }
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      if (selectedTemplate === 'public') {
        setStep('browse');
      } else {
        setStep('template');
      }
    } else if (step === 'browse') {
      setStep('template');
    }
  };

  const handleClose = () => {
    setStep('template');
    setSelectedTemplate('blank');
    setDashboardName('');
    setDashboardDescription('');
    setSelectedEmail('');
    setSelectedPublicDashboardId('');
    setPublicSearchQuery('');
    setPublicDashboards([]);
    setEmailInputValue('');
    setEmailDropdownOpen(false);
    onClose();
  };

  const getStepIndex = () => {
    if (step === 'template') return 0;
    if (step === 'browse') return 1;
    if (step === 'details') return selectedTemplate === 'public' ? 2 : 1;
    return 0;
  };

  const totalSteps = selectedTemplate === 'public' ? 3 : 2;

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
                  : step === 'browse'
                  ? 'Select a public dashboard to use as a template'
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
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i <= getStepIndex() ? 'bg-brand' : 'bg-outline'}`} />
            ))}
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

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          ) : step === 'browse' ? (
            /* Public dashboard browser */
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-content-primary mb-2">
                  Browse Public Dashboards
                </h3>
                <p className="text-sm text-content-secondary">
                  Select a dashboard to clone as your starting point
                </p>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="Search dashboards..."
                    className="w-full px-4 py-2.5 bg-surface-elevated border-2 border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm text-content-primary placeholder-content-muted transition-all"
                  />
                </div>
                <div className="min-w-[260px] relative" ref={emailComboRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedEmail ? selectedEmail : emailInputValue}
                      onChange={(e) => {
                        setEmailInputValue(e.target.value);
                        if (selectedEmail) {
                          setSelectedEmail('');
                          setSelectedPublicDashboardId('');
                        }
                        setEmailDropdownOpen(true);
                      }}
                      onFocus={() => setEmailDropdownOpen(true)}
                      placeholder="Filter by user email..."
                      className={`w-full pl-4 pr-9 py-2.5 bg-surface-elevated border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm transition-all ${
                        selectedEmail ? 'border-brand text-content-primary' : 'border-outline text-content-primary placeholder-content-muted'
                      }`}
                    />
                    {/* Clear / chevron button */}
                    {selectedEmail ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedEmail(''); setEmailInputValue(''); setSelectedPublicDashboardId(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface text-content-muted hover:text-content-primary transition-colors"
                        aria-label="Clear email filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Dropdown list */}
                  {emailDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-surface-elevated border-2 border-outline rounded-xl shadow-lg">
                      <button
                        type="button"
                        onClick={() => { setSelectedEmail(''); setEmailInputValue(''); setSelectedPublicDashboardId(''); setEmailDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          !selectedEmail ? 'text-brand font-medium bg-brand/5' : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary'
                        }`}
                      >
                        All users
                      </button>
                      {filteredEmails.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-content-muted italic">No matching users</div>
                      ) : (
                        filteredEmails.map(email => (
                          <button
                            key={email}
                            type="button"
                            onClick={() => { setSelectedEmail(email); setEmailInputValue(''); setSelectedPublicDashboardId(''); setEmailDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              selectedEmail === email
                                ? 'text-brand font-medium bg-brand/5'
                                : 'text-content-primary hover:bg-surface hover:text-content-primary'
                            }`}
                          >
                            {email}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dashboard list */}
              {loadingPublic ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3"></div>
                  <p className="text-sm text-content-tertiary">Loading public dashboards...</p>
                </div>
              ) : filteredPublicDashboards.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-content-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-content-muted font-medium">No public dashboards found</p>
                  <p className="text-xs text-content-tertiary mt-1">No users have shared their dashboards yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                  {filteredPublicDashboards.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedPublicDashboardId(d.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selectedPublicDashboardId === d.id
                          ? 'border-brand bg-blue-50 dark:bg-blue-950/20 shadow-md'
                          : 'border-outline hover:border-brand/50 hover:shadow-sm bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-content-primary text-sm leading-tight pr-2">{d.name}</h4>
                        {selectedPublicDashboardId === d.id && (
                          <div className="flex-shrink-0 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {d.description && (
                        <p className="text-xs text-content-secondary mb-2 line-clamp-2">{d.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-content-tertiary">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{d.owner_email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                    <p className="font-bold text-content-primary">
                      {selectedTemplate === 'public'
                        ? publicDashboards.find(d => d.id === selectedPublicDashboardId)?.name || 'Public Dashboard'
                        : templates.find(t => t.id === selectedTemplate)?.name}
                    </p>
                    {selectedTemplate === 'public' && (
                      <p className="text-xs text-content-tertiary mt-0.5">
                        by {publicDashboards.find(d => d.id === selectedPublicDashboardId)?.owner_email}
                      </p>
                    )}
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
            disabled={
              (step === 'details' && !dashboardName.trim()) ||
              (step === 'browse' && !selectedPublicDashboardId)
            }
            className="px-8 py-2.5 bg-gradient-to-r from-brand to-brand hover:from-brand-hover hover:to-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            {step === 'template' ? (
              <>
                Continue
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            ) : step === 'browse' ? (
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
