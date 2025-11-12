'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  SortingState,
  flexRender,
} from '@tanstack/react-table';
import { ApiService, verifySystem } from '../lib/api';
import { InsightType, DashboardViewConfig, ReportDefinition } from '../lib/config';
import EditInsightTypeModal from './EditInsightTypeModal';
import Toast from './Toast';
import DashboardLayoutArranger, { DashboardLayout } from './DashboardLayoutArranger';

const DASHBOARD_VIEWS = ['team-dashboard', 'pi-dashboard'];
const DEFAULT_ALLOWED_VIEW = 'every-dashboard';

const normalizeAllowedViews = (report?: ReportDefinition): string[] => {
  if (!report) {
    return [DEFAULT_ALLOWED_VIEW];
  }

  const rawAllowed = Array.isArray(report.meta_schema?.allowed_views)
    ? report.meta_schema.allowed_views
    : [DEFAULT_ALLOWED_VIEW];

  const normalized = rawAllowed
    .map((view) => (typeof view === 'string' ? view.trim().toLowerCase() : ''))
    .filter((view): view is string => view.length > 0);

  if (normalized.length === 0) {
    normalized.push(DEFAULT_ALLOWED_VIEW);
  }

  return Array.from(new Set(normalized));
};

const isReportAllowedForView = (report: ReportDefinition | undefined, view: string): boolean => {
  const allowedViews = normalizeAllowedViews(report);
  return allowedViews.includes(DEFAULT_ALLOWED_VIEW) || allowedViews.includes(view);
};

const sanitizeDashboardLayout = (
  layout: Record<string, string[]>,
  reports: ReportDefinition[]
): Record<string, string[]> => {
  const reportMap = new Map<string, ReportDefinition>();
  reports.forEach((report) => {
    reportMap.set(report.report_id, report);
  });

  const sanitized: Record<string, string[]> = {};
  const allViews = new Set<string>([...DASHBOARD_VIEWS, ...Object.keys(layout)]);

  allViews.forEach((view) => {
    const selected = layout[view] ?? [];
    const filtered = selected.filter((id) => {
      const report = reportMap.get(id);
      return report ? isReportAllowedForView(report, view) : false;
    });
    sanitized[view] = filtered;
  });

  return sanitized;
};

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('ai-config');
  const [aiProvider, setAiProvider] = useState('openai');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiTemperature, setGeminiTemperature] = useState(0);
  const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [originalGeminiApiKey, setOriginalGeminiApiKey] = useState<string | null>(null);
  const [originalOpenaiApiKey, setOriginalOpenaiApiKey] = useState<string | null>(null);
  const MASK = '********';
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Insight Types state
  const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
  const [insightCategories, setInsightCategories] = useState<string[]>([]);
  const [loadingInsightTypes, setLoadingInsightTypes] = useState(false);
  const [insightTypesError, setInsightTypesError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState<InsightType | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSystemUser, setIsSystemUser] = useState(false);
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  const [selectedReportsByView, setSelectedReportsByView] = useState<Record<string, string[]>>({
    'team-dashboard': [],
    'pi-dashboard': [],
  });
  const [originalReportsByView, setOriginalReportsByView] = useState<Record<string, string[]>>({
    'team-dashboard': [],
    'pi-dashboard': [],
  });
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [currentArrangeView, setCurrentArrangeView] = useState<string | null>(null);
  const [dashboardLayouts, setDashboardLayouts] = useState<Record<string, DashboardLayout>>({});

  const cloneViewMap = (source: Record<string, string[]>): Record<string, string[]> => {
    const clone: Record<string, string[]> = {};
    for (const [view, reports] of Object.entries(source)) {
      clone[view] = [...reports];
    }
    return clone;
  };

  const normalizeConfigsToMap = (configs?: DashboardViewConfig[]): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    configs?.forEach((cfg) => {
      const view = cfg.view?.trim();
      if (!view) {
        return;
      }
      const rawReportIds = Array.isArray(cfg.reportIds)
        ? cfg.reportIds
        : Array.isArray((cfg as any).report_ids)
          ? (cfg as any).report_ids
          : [];
      map[view] = rawReportIds.map((id: unknown) => String(id));
    });
    DASHBOARD_VIEWS.forEach((view) => {
      if (!map[view]) {
        map[view] = [];
      }
    });
    return map;
  };

  const computeLayoutDirty = (next: Record<string, string[]>, base: Record<string, string[]>): boolean => {
    const views = Array.from(new Set<string>([...Object.keys(next), ...Object.keys(base)]));
    for (const view of views) {
      const nextValue = (next[view] ?? []).join('|');
      const baseValue = (base[view] ?? []).join('|');
      if (nextValue !== baseValue) {
        return true;
      }
    }
    return false;
  };

  const getViewLabel = (view: string): string => {
    switch (view) {
      case 'team-dashboard':
        return 'Team Dashboard';
      case 'pi-dashboard':
        return 'PI Dashboard';
      default:
        return view;
    }
  };

  // TanStack Table column helper
  const columnHelper = createColumnHelper<InsightType>();

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        enableSorting: true,
        size: 40, // Make ID column much smaller (70% smaller)
        minSize: 30,
        maxSize: 50,
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('insight_type', {
        header: 'Insight Type',
        enableSorting: true,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('insight_description', {
        header: 'Description',
        enableSorting: true,
        size: 220, // Make description column slightly wider
        minSize: 200,
        maxSize: 300,
        cell: (info) => (
          <div className="whitespace-nowrap" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'categories',
        header: 'Categories',
        enableSorting: false,
        size: 260, // Make categories column 30% wider (200 * 1.3 = 260)
        minSize: 200,
        maxSize: 400,
        cell: (info) => {
          const insightType = info.row.original;
          // Use insight_categories if available, fallback to categories for backward compatibility
          const includedCategories = insightType.insight_categories || insightType.categories || [];
          
          // Only show categories that are checked/included
          return (
            <div className="flex flex-wrap gap-1 justify-start">
              {includedCategories.map((category, index) => (
                <div key={category} className="flex items-center">
                  <label
                    className="flex items-center gap-1 cursor-default"
                    title={category}
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                  {index < includedCategories.length - 1 && (
                    <span className="mx-1 text-gray-300">|</span>
                  )}
                </div>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('active', {
        header: 'Active',
        enableSorting: true,
        size: 70, // Make Active column 30% smaller
        minSize: 60,
        maxSize: 80,
        cell: (info) => (
          <input
            type="checkbox"
            checked={info.getValue()}
            readOnly
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
          />
        ),
      }),
      columnHelper.display({
        id: 'last_modification_date',
        header: 'Last Modification Date',
        enableSorting: true,
        size: 160, // Make last modification date column 20% narrower (200 * 0.8 = 160)
        minSize: 150,
        maxSize: 200,
        sortingFn: (rowA, rowB) => {
          const getLastModificationDate = (row: InsightType) => {
            const createdDate = new Date(row.created_at);
            const updatedDate = new Date(row.updated_at);
            return updatedDate > createdDate ? updatedDate : createdDate;
          };
          const dateA = getLastModificationDate(rowA.original);
          const dateB = getLastModificationDate(rowB.original);
          return dateA.getTime() - dateB.getTime();
        },
        cell: (info) => {
          const insightType = info.row.original;
          const createdDate = new Date(insightType.created_at);
          const updatedDate = new Date(insightType.updated_at);
          // Get the latest date between created_at and updated_at
          const lastModificationDate = updatedDate > createdDate ? updatedDate : createdDate;
          
          // Format date as "October 25, 2025"
          const dateOptions: Intl.DateTimeFormatOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          };
          const formattedDate = lastModificationDate.toLocaleDateString('en-US', dateOptions);
          
          // Format time as hours:minutes (24-hour format)
          const hours = lastModificationDate.getHours().toString().padStart(2, '0');
          const minutes = lastModificationDate.getMinutes().toString().padStart(2, '0');
          const formattedTime = `${hours}:${minutes}`;
          
          return (
            <span className="text-sm text-gray-600">
              {formattedDate} {formattedTime}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        size: 100, // Make actions column narrower
        minSize: 90,
        maxSize: 120,
        cell: (info) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedInsightType(info.row.original);
                setIsEditModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => {
                // Delete functionality not implemented yet
                alert('Delete functionality will be implemented soon');
              }}
              disabled
              className="text-gray-400 cursor-not-allowed p-1 rounded"
              title="Delete (not implemented)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ),
      }),
    ],
    [insightCategories]
  );

  // TanStack Table instance
  const table = useReactTable({
    data: insightTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableColumnResizing: false,
    columnResizeMode: 'onChange',
    state: {
      sorting,
    },
  });

  // Load insight types and categories when Insight Types tab is active
  useEffect(() => {
    if (activeTab === 'insight-types') {
      const loadData = async () => {
        setLoadingInsightTypes(true);
        setInsightTypesError(null);
        try {
          const api = new ApiService();
          const [typesResult, categoriesResult] = await Promise.all([
            api.getInsightTypes(),
            api.getInsightCategories(),
          ]);
          setInsightTypes(typesResult.insight_types || []);
          setInsightCategories(categoriesResult.categories || []);
        } catch (e) {
          console.error('Failed to load insight types', e);
          setInsightTypesError(e instanceof Error ? e.message : 'Failed to load insight types');
        } finally {
          setLoadingInsightTypes(false);
        }
      };
      loadData();
    }
  }, [activeTab]);

  // Load settings from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const api = new ApiService();
        const result = await api.getSettings();
        if (!result) return;

        // Support both { data: { settings: {...} } } and flat objects
        const s = (result as any).settings ?? result;

        // Provider
        if (s.ai_provider) setAiProvider(s.ai_provider);

        // Models (backend provides a single ai_model for chatgpt/openai)
        if (s.ai_model) setOpenaiModel(s.ai_model);
        if (s.gemini_model) setGeminiModel(s.gemini_model);

        // Temperatures (map strings to numbers if needed)
        if (s.ai_gemini_temperature !== undefined) {
          const v = typeof s.ai_gemini_temperature === 'string' ? parseFloat(s.ai_gemini_temperature) : s.ai_gemini_temperature;
          if (!Number.isNaN(v)) setGeminiTemperature(v);
        } else if (s.gemini_temperature !== undefined) {
          const v = typeof s.gemini_temperature === 'string' ? parseFloat(s.gemini_temperature) : s.gemini_temperature;
          if (!Number.isNaN(v)) setGeminiTemperature(v);
        }

        if (s.ai_chatgpt_temperature !== undefined) {
          const v = typeof s.ai_chatgpt_temperature === 'string' ? parseFloat(s.ai_chatgpt_temperature) : s.ai_chatgpt_temperature;
          if (!Number.isNaN(v)) setOpenaiTemperature(v);
        } else if (s.openai_temperature !== undefined) {
          const v = typeof s.openai_temperature === 'string' ? parseFloat(s.openai_temperature) : s.openai_temperature;
          if (!Number.isNaN(v)) setOpenaiTemperature(v);
        }

        // API keys presence
        const hasGeminiKey = Boolean(s.gemini_api_key && String(s.gemini_api_key).length > 0);
        const openaiKeyValue = s.chatgpt_api_key || s.openai_api_key;
        const hasOpenaiKey = Boolean(openaiKeyValue && String(openaiKeyValue).length > 0);

        setOriginalGeminiApiKey(hasGeminiKey ? String(s.gemini_api_key) : null);
        setOriginalOpenaiApiKey(hasOpenaiKey ? String(openaiKeyValue) : null);
        setGeminiApiKey(hasGeminiKey ? MASK : '');
        setOpenaiApiKey(hasOpenaiKey ? MASK : '');
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkSystemRole = async () => {
      try {
        const result = await verifySystem();
        if (!cancelled) {
          setIsSystemUser(result);
        }
      } catch (error) {
        console.error('Failed to verify system role', error);
      }
    };
    checkSystemRole();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard-layout' && !isSystemUser) {
      setActiveTab('ai-config');
    }
  }, [activeTab, isSystemUser]);

  useEffect(() => {
    if (activeTab !== 'dashboard-layout' || !isSystemUser || layoutLoaded) {
      return;
    }

    let cancelled = false;
    const loadDashboardLayout = async () => {
      setLayoutLoading(true);
      setLayoutError(null);
      try {
        const api = new ApiService();
        const [reports, configs] = await Promise.all([
          api.getReportDefinitions(),
          api.getDashboardViewConfigs(),
        ]);
        if (cancelled) {
          return;
        }
        setAvailableReports(reports);
        const normalized = normalizeConfigsToMap(configs);
        const sanitized = sanitizeDashboardLayout(normalized, reports);
        const cloned = cloneViewMap(sanitized);
        setSelectedReportsByView(cloned);
        setOriginalReportsByView(cloneViewMap(sanitized));
        
        // Load layout configurations
        const layouts: Record<string, DashboardLayout> = {};
        configs.forEach((config) => {
          if (config.layout_config && config.layout_config.rows && config.layout_config.rows.length > 0) {
            layouts[config.view] = config.layout_config;
          }
        });
        setDashboardLayouts(layouts);
        
        setLayoutDirty(false);
        setLayoutLoaded(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load dashboard layout', error);
          setLayoutError(error instanceof Error ? error.message : 'Failed to load dashboard layout');
        }
      } finally {
        if (!cancelled) {
          setLayoutLoading(false);
        }
      }
    };

    loadDashboardLayout();

    return () => {
      cancelled = true;
    };
  }, [activeTab, isSystemUser, layoutLoaded]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      setSaveError(null);
      const api = new ApiService();
      // Match backend field names and types per /settings/batch
      const providerForApi = aiProvider === 'openai' ? 'chatgpt' : aiProvider; // backend expects 'chatgpt'
      // Determine keys to send: send original value if user didn't change (masked)
      const geminiKeyToSend = geminiApiKey && geminiApiKey !== MASK
        ? geminiApiKey
        : (originalGeminiApiKey ?? '');
      const openaiKeyToSend = openaiApiKey && openaiApiKey !== MASK
        ? openaiApiKey
        : (originalOpenaiApiKey ?? '');

      const payload: Record<string, any> = {
        ai_provider: String(providerForApi),
        ai_model: String(openaiModel),
        ai_gemini_temperature: String(geminiTemperature),
        ai_chatgpt_temperature: String(openaiTemperature),
        gemini_api_key: String(geminiKeyToSend),
        chatgpt_api_key: String(openaiKeyToSend),
      };

      const result = await api.updateSettings(payload, 'admin@example.com');

      // After save, mask and update originals
      setOriginalGeminiApiKey(payload.gemini_api_key);
      setOriginalOpenaiApiKey(payload.chatgpt_api_key);
      setGeminiApiKey(MASK);
      setOpenaiApiKey(MASK);

      setSaveMessage('Settings saved successfully');
    } catch (e) {
      console.error('Failed to save settings', e);
      setSaveError((e as any)?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const reportDefinitionById = useMemo(() => {
    const map = new Map<string, ReportDefinition>();
    availableReports.forEach((report) => {
      map.set(report.report_id, report);
    });
    return map;
  }, [availableReports]);

  const sortedReports = useMemo(() => {
    return Array.from(reportDefinitionById.values()).sort((a, b) =>
      a.report_name.localeCompare(b.report_name)
    );
  }, [reportDefinitionById]);

  const reportNameMap = useMemo(() => {
    const map = new Map<string, string>();
    reportDefinitionById.forEach((report, id) => {
      map.set(id, report.report_name);
    });
    return map;
  }, [reportDefinitionById]);

  const handleToggleReport = (view: string, reportId: string) => {
    setSelectedReportsByView((prev) => {
      const reportDefinition = reportDefinitionById.get(reportId);
      if (!reportDefinition || !isReportAllowedForView(reportDefinition, view)) {
        return prev;
      }

      const current = prev[view] ? [...prev[view]] : [];
      let nextList: string[];
      if (current.includes(reportId)) {
        nextList = current.filter((id) => id !== reportId);
      } else {
        nextList = [...current, reportId];
      }
      const nextMap = { ...prev, [view]: nextList };
      setLayoutDirty(computeLayoutDirty(nextMap, originalReportsByView));
      return nextMap;
    });
  };

  const handleResetLayouts = () => {
    setSelectedReportsByView(cloneViewMap(originalReportsByView));
    // Reload layouts from original data
    setLayoutLoaded(false); // This will trigger a reload
    setLayoutDirty(false);
  };

  const handleSaveLayouts = async () => {
    try {
      setLayoutSaving(true);
      setLayoutError(null);
      const api = new ApiService();
      const sanitizedSelection = sanitizeDashboardLayout(selectedReportsByView, availableReports);
      const payload = Object.entries(sanitizedSelection).map(([view, reportIds]) => ({
        view,
        reportIds,
        layout_config: dashboardLayouts[view] || undefined,
      }));
      const response = await api.updateDashboardViewConfigs(payload);
      const normalized = normalizeConfigsToMap(response);
      const sanitizedResponse = sanitizeDashboardLayout(normalized, availableReports);
      const cloned = cloneViewMap(sanitizedResponse);
      setSelectedReportsByView(cloned);
      setOriginalReportsByView(cloneViewMap(sanitizedResponse));
      setLayoutDirty(false);
      setToastType('success');
      setToastMessage('Dashboard layout updated successfully');
    } catch (error) {
      console.error('Failed to save dashboard layout', error);
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to save dashboard layout');
    } finally {
      setLayoutSaving(false);
    }
  };

  const settingsTabs = useMemo(() => {
    const tabs = [
      { id: 'ai-config', label: 'AI Configuration', icon: '🤖' },
      { id: 'insight-types', label: 'Insight Types', icon: '💡' },
      { id: 'notifications', label: 'Notifications', icon: '🔔' },
      { id: 'integrations', label: 'Integrations', icon: '🔗' },
    ];
    if (isSystemUser) {
      tabs.push({ id: 'dashboard-layout', label: 'Dashboard Layout', icon: '🗂️' });
    }
    return tabs;
  }, [isSystemUser]);

  const geminiModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ];

  const openaiModels = [
    { value: 'gpt-4o-mini', label: 'GPT-4o-mini (Faster)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  const viewOrder = useMemo(() => {
    const set = new Set<string>(DASHBOARD_VIEWS);
    Object.keys(selectedReportsByView).forEach((view) => set.add(view));
    return Array.from(set);
  }, [selectedReportsByView]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai-config':
        return (
          <div className="space-y-4">
            {/* AI Provider Selection */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-600 w-20">AI Provider:</span>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                >
                  <option value="openai">OpenAI ChatGPT</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
            </div>

            {/* Google Gemini Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-4">Google Gemini Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Model:</span>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  >
                    {geminiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Temperature:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={geminiTemperature}
                    onChange={(e) => setGeminiTemperature(parseFloat(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-20"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">API Key:</span>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter Gemini API key"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-64"
                  />
                </div>
              </div>
            </div>

            {/* OpenAI Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-4">OpenAI ChatGPT Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Model:</span>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  >
                    {openaiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Temperature:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={openaiTemperature}
                    onChange={(e) => setOpenaiTemperature(parseFloat(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-20"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">API Key:</span>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="Enter ChatGPT API key"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-3 py-1.5 text-xs rounded ${
                  saving ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {(saveMessage || saveError) && (
              <div
                className={`text-xs mt-2 ${saveError ? 'text-red-600' : 'text-green-600'}`}
              >
                {saveError || saveMessage}
              </div>
            )}
          </div>
        );
      case 'dashboard-layout':
        if (!isSystemUser) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              You need the system role to configure dashboard layouts.
            </div>
          );
        }

        // If in arrange mode, show the arranger
        if (isArrangeMode && currentArrangeView) {
          const reportsForView = sortedReports.filter((report) =>
            isReportAllowedForView(report, currentArrangeView)
          );
          // Get saved layout or create default 2-per-row layout
          let currentLayout = dashboardLayouts[currentArrangeView];
          
          if (!currentLayout) {
            // Create default layout with 2 reports per row
            const reportIds = selectedReportsByView[currentArrangeView] || [];
            const rows: { id: string; reportIds: string[] }[] = [];
            
            for (let i = 0; i < reportIds.length; i += 2) {
              rows.push({
                id: `row-${i / 2 + 1}`,
                reportIds: reportIds.slice(i, i + 2),
              });
            }
            
            currentLayout = { 
              rows: rows.length > 0 ? rows : [{ id: 'row-1', reportIds: [] }] 
            };
          }

          return (
            <DashboardLayoutArranger
              view={currentArrangeView}
              availableReports={reportsForView}
              initialLayout={currentLayout}
              onLayoutChange={(newLayout) => {
                setDashboardLayouts((prev) => ({
                  ...prev,
                  [currentArrangeView]: newLayout,
                }));
                // Update selected reports based on the layout
                const allReportIds = newLayout.rows.flatMap((row) => row.reportIds);
                setSelectedReportsByView((prev) => ({
                  ...prev,
                  [currentArrangeView]: allReportIds,
                }));
                setLayoutDirty(true);
                setIsArrangeMode(false);
                setCurrentArrangeView(null);
              }}
              onCancel={() => {
                setIsArrangeMode(false);
                setCurrentArrangeView(null);
              }}
            />
          );
        }

        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
              Choose which reports should appear on each dashboard. Use the &quot;Arrange&quot; button to organize reports in rows with custom column layouts.
            </div>
            {layoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                {layoutError}
              </div>
            )}
            {layoutLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="flex flex-col items-center gap-2 text-gray-600 text-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  Loading dashboard layout...
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {viewOrder.map((view) => {
                  const selected = selectedReportsByView[view] ?? [];
                  return (
                    <div key={view} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">{getViewLabel(view)}</h3>
                        <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{selected.length} selected</span>
                          <button
                            onClick={() => {
                              setCurrentArrangeView(view);
                              setIsArrangeMode(true);
                            }}
                            disabled={layoutSaving || selected.length === 0}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            📐 Arrange
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {selected.length > 0
                          ? `Currently: ${selected.map((id) => reportNameMap.get(id) ?? id).join(', ')}`
                          : 'No reports selected yet.'}
                      </div>
                      <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-64 overflow-auto">
                        {(() => {
                          const reportsForView = sortedReports.filter((report) =>
                            isReportAllowedForView(report, view)
                          );

                          if (reportsForView.length === 0) {
                            return (
                              <div className="p-3 text-sm text-gray-500">
                                No reports available for this dashboard.
                              </div>
                            );
                          }

                          return reportsForView.map((report) => {
                            const checked = selected.includes(report.report_id);
                            return (
                              <label
                                key={`${view}-${report.report_id}`}
                                className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  checked={checked}
                                  onChange={() => handleToggleReport(view, report.report_id)}
                                  disabled={layoutSaving}
                                />
                                <div>
                                  <div className="font-medium text-gray-900">{report.report_name}</div>
                                  {report.description && (
                                    <div className="text-xs text-gray-500">{report.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetLayouts}
                disabled={layoutSaving || !layoutDirty}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  layoutSaving || !layoutDirty
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveLayouts}
                disabled={layoutSaving || !layoutDirty}
                className={`px-3 py-1.5 text-sm rounded-md text-white ${
                  layoutSaving || !layoutDirty
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {layoutSaving ? 'Saving...' : 'Save Layout'}
              </button>
            </div>
          </div>
        );
      case 'insight-types':
        return (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Insight Types</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // TODO: Implement create functionality
                    alert('Create functionality will be implemented soon');
                  }}
                  disabled={loadingInsightTypes}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Create"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </button>
                <button
                  onClick={async () => {
                    setLoadingInsightTypes(true);
                    setInsightTypesError(null);
                    try {
                      const api = new ApiService();
                      const [typesResult, categoriesResult] = await Promise.all([
                        api.getInsightTypes(),
                        api.getInsightCategories(),
                      ]);
                      setInsightTypes(typesResult.insight_types || []);
                      setInsightCategories(categoriesResult.categories || []);
                    } catch (e) {
                      console.error('Failed to refresh insight types', e);
                      setInsightTypesError(e instanceof Error ? e.message : 'Failed to refresh insight types');
                    } finally {
                      setLoadingInsightTypes(false);
                    }
                  }}
                  disabled={loadingInsightTypes}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            
            {loadingInsightTypes ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">Loading insight types...</p>
              </div>
            ) : insightTypesError ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-600">{insightTypesError}</p>
              </div>
            ) : insightTypes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">No insight types found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header, index) => {
                          const isInsightType = header.id === 'insight_type';
                          const isDescription = header.id === 'insight_description';
                          const isCategories = header.id === 'categories';
                          const isLastModificationDate = header.id === 'last_modification_date';
                          const canSort = header.column.getCanSort();
                          const isLast = index === headerGroup.headers.length - 1;
                          return (
                            <th
                              key={header.id}
                              className={`${
                                isLastModificationDate ? 'px-1 py-2' : 'p-2'
                              } border-b border-gray-200 ${
                                !isLast ? 'border-r border-gray-200' : ''
                              } ${
                                isInsightType || isDescription || isCategories ? 'text-left' : 'text-center'
                              } ${
                                canSort ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                              }`}
                              style={
                                header.column.getSize() 
                                  ? { width: `${header.column.getSize()}px`, minWidth: `${header.column.getSize()}px` }
                                  : undefined
                              }
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            >
                              <div className={`flex items-center ${isInsightType || isDescription || isCategories ? 'justify-start' : 'justify-center'} gap-1`}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {canSort && (
                                  <span className="text-gray-400">
                                    {{
                                      asc: ' ↑',
                                      desc: ' ↓',
                                    }[header.column.getIsSorted() as string] ?? ' ↕'}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => {
                          const isInsightType = cell.column.id === 'insight_type';
                          const isDescription = cell.column.id === 'insight_description';
                          const isCategories = cell.column.id === 'categories';
                          const isLastModificationDate = cell.column.id === 'last_modification_date';
                          const isLast = cellIndex === row.getVisibleCells().length - 1;
                          return (
                            <td
                              key={cell.id}
                              className={`${
                                isLastModificationDate ? 'px-1 py-2' : 'p-2'
                              } ${
                                !isLast ? 'border-r border-gray-200' : ''
                              } ${
                                isInsightType || isDescription || isCategories ? 'text-left' : 'text-center'
                              }`}
                              style={
                                cell.column.getSize() 
                                  ? { width: `${cell.column.getSize()}px`, minWidth: `${cell.column.getSize()}px` }
                                  : undefined
                              }
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl mb-3">🚧</div>
            <h2 className="text-sm font-semibold mb-2">Coming Soon</h2>
            <p className="text-xs text-gray-600">
              {settingsTabs.find(tab => tab.id === activeTab)?.label} settings are under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Settings Tabs (wrap on small screens, single row on md+) */}
        <div className="flex flex-wrap md:flex-nowrap gap-1 border-b border-gray-200">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Edit Insight Type Modal */}
      <EditInsightTypeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInsightType(null);
        }}
        insightType={selectedInsightType}
        insightCategories={insightCategories}
        onSave={async (data) => {
          if (!selectedInsightType) return;
          
          try {
            const api = new ApiService();
            await api.updateInsightType(selectedInsightType.id, data);
            
            // Refresh the list
            const result = await api.getInsightTypes();
            setInsightTypes(result.insight_types || []);
            
            // Show success toast
            const insightTypeName = data.insight_type || selectedInsightType.insight_type;
            setToastType('success');
            setToastMessage(`Insight type "${insightTypeName}" updated successfully`);
            setTimeout(() => setToastMessage(null), 3000);
            
            setIsEditModalOpen(false);
            setSelectedInsightType(null);
          } catch (error) {
            // Show error toast
            setToastType('error');
            setToastMessage(`Failed to update insight type: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setTimeout(() => setToastMessage(null), 3000);
          }
        }}
      />
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
    </div>
  );
}
