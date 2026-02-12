'use client';

import { useEffect, useState, useMemo } from 'react';
import { ApiService, verifySystem } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { DashboardViewConfig, ReportDefinition } from '../lib/config';
import Toast from './Toast';
import DashboardLayoutArranger, { DashboardLayout } from './DashboardLayoutArranger';
import PromptsTab from './PromptsTab';
import InsightTypesTab from './InsightTypesTab';
import ConfigAndThresholdsTab from './ConfigAndThresholdsTab';
import BuildReportTab from './BuildReportTab';
import { configCache } from '../lib/configCache';
import { piLabel } from '@/lib/piTerminology';

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
 // Explicitly exclude removed reports
 if (id === 'pi-metrics-summary-by-team') {
 return false;
 }
 const report = reportMap.get(id);
 return report ? isReportAllowedForView(report, view) : false;
 });
 sanitized[view] = filtered;
 });

 return sanitized;
};

export default function SettingsScreen() {
 const [activeTab, setActiveTab] = useState('ai-config');
 const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
 const [pendingTab, setPendingTab] = useState<string | null>(null);
 const [aiProvider, setAiProvider] = useState('openai');
 const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
 const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
 const [geminiTemperature, setGeminiTemperature] = useState(0);
 const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
 const [geminiApiKey, setGeminiApiKey] = useState('');
 const [openaiApiKey, setOpenaiApiKey] = useState('');
 const [originalGeminiApiKey, setOriginalGeminiApiKey] = useState<string | null>(null);
 const [originalOpenaiApiKey, setOriginalOpenaiApiKey] = useState<string | null>(null);
 // Store original values for change tracking
 const [originalAiProvider, setOriginalAiProvider] = useState<string>('openai');
 const [originalGeminiModel, setOriginalGeminiModel] = useState<string>('gemini-2.5-flash');
 const [originalOpenaiModel, setOriginalOpenaiModel] = useState<string>('gpt-4o-mini');
 const [originalGeminiTemperature, setOriginalGeminiTemperature] = useState<number>(0);
 const [originalOpenaiTemperature, setOriginalOpenaiTemperature] = useState<number>(0.7);
 const MASK = '********';
 const [saving, setSaving] = useState(false);

 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const [toastType, setToastType] = useState<'success' | 'error'>('success');
 const [isSystemUser, setIsSystemUser] = useState(false);
 const [loadingError, setLoadingError] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(true);
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
 const [selectedDashboardView, setSelectedDashboardView] = useState<string>('team-dashboard');

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
      return piLabel('Dashboard');
 default:
 return view;
 }
 };


 // Load settings from backend on mount
 useEffect(() => {
 const load = async () => {
 try {
 setIsLoading(true);
 setLoadingError(null);
 const api = new ApiService();
 const result = await api.getSettings();
 if (!result) {
 setLoadingError('Failed to load settings: No data received from server');
 setIsLoading(false);
 return;
 }

 // Support both { data: { settings: {...} } } and flat objects
 const s = (result as any).settings ?? result;

 // Provider (normalize: backend may return 'chatgpt', we use 'openai' internally)
 const rawProvider = s.ai_provider;
 if (!rawProvider) {
 setLoadingError('Failed to load settings: Missing AI provider');
 setIsLoading(false);
 return;
 }
 const normalizedProvider = rawProvider === 'chatgpt' ? 'openai' : rawProvider;
 setAiProvider(normalizedProvider);
 setOriginalAiProvider(normalizedProvider);

 // Models (backend provides ai_chatgpt_model for chatgpt/openai and ai_gemini_model for gemini)
 const loadedOpenaiModel = s.ai_chatgpt_model;
 const loadedGeminiModel = s.ai_gemini_model;
 if (!loadedOpenaiModel || !loadedGeminiModel) {
 setLoadingError('Failed to load settings: Missing model configuration');
 setIsLoading(false);
 return;
 }
 setOpenaiModel(loadedOpenaiModel);
 setGeminiModel(loadedGeminiModel);
 setOriginalOpenaiModel(loadedOpenaiModel);
 setOriginalGeminiModel(loadedGeminiModel);

 // Temperatures (map strings to numbers if needed)
 let loadedGeminiTemp = 0;
 if (s.ai_gemini_temperature !== undefined) {
 const v = typeof s.ai_gemini_temperature === 'string' ? parseFloat(s.ai_gemini_temperature) : s.ai_gemini_temperature;
 if (!Number.isNaN(v)) loadedGeminiTemp = v;
 } else if (s.gemini_temperature !== undefined) {
 const v = typeof s.gemini_temperature === 'string' ? parseFloat(s.gemini_temperature) : s.gemini_temperature;
 if (!Number.isNaN(v)) loadedGeminiTemp = v;
 }
 setGeminiTemperature(loadedGeminiTemp);
 setOriginalGeminiTemperature(loadedGeminiTemp);

 let loadedOpenaiTemp = 0.7;
 if (s.ai_chatgpt_temperature !== undefined) {
 const v = typeof s.ai_chatgpt_temperature === 'string' ? parseFloat(s.ai_chatgpt_temperature) : s.ai_chatgpt_temperature;
 if (!Number.isNaN(v)) loadedOpenaiTemp = v;
 } else if (s.openai_temperature !== undefined) {
 const v = typeof s.openai_temperature === 'string' ? parseFloat(s.openai_temperature) : s.openai_temperature;
 if (!Number.isNaN(v)) loadedOpenaiTemp = v;
 }
 setOpenaiTemperature(loadedOpenaiTemp);
 setOriginalOpenaiTemperature(loadedOpenaiTemp);

 // API keys - backend doesn't return them, so always show MASK
 setOriginalGeminiApiKey(null);
 setOriginalOpenaiApiKey(null);
 setGeminiApiKey(MASK);
 setOpenaiApiKey(MASK);
 
 setIsLoading(false);
 } catch (e: any) {
 console.error('Failed to load settings', e);
 setLoadingError(e?.message || 'Failed to load settings from server');
 setIsLoading(false);
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
 
 // Use cache to prevent duplicate API calls
 const [reports, configs] = await Promise.all([
 configCache.getReportDefinitions(() => api.getReportDefinitions()),
 configCache.getDashboardConfigs(() => api.getDashboardViewConfigs()),
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

 // Check if AI config has changes
 const hasAiConfigChanges = (): boolean => {
 // Check provider
 if (aiProvider !== originalAiProvider) return true;

 // Check models
 if (openaiModel !== originalOpenaiModel) return true;
 if (geminiModel !== originalGeminiModel) return true;

 // Check temperatures
 if (openaiTemperature !== originalOpenaiTemperature) return true;
 if (geminiTemperature !== originalGeminiTemperature) return true;

 // Check API keys (only if changed from masked value)
 const geminiKeyChanged = geminiApiKey && geminiApiKey !== MASK && geminiApiKey !== (originalGeminiApiKey ?? '');
 const openaiKeyChanged = openaiApiKey && openaiApiKey !== MASK && openaiApiKey !== (originalOpenaiApiKey ?? '');

 // Also check if key was cleared (was set, now empty)
 const geminiKeyCleared = originalGeminiApiKey !== null && (!geminiApiKey || geminiApiKey === '');
 const openaiKeyCleared = originalOpenaiApiKey !== null && (!openaiApiKey || openaiApiKey === '');

 return geminiKeyChanged || openaiKeyChanged || geminiKeyCleared || openaiKeyCleared;
 };

 const handleSave = async () => {
 try {
 setSaving(true);
 setToastMessage(null);
 const api = new ApiService();
 
 // Always send all settings
 const payload: Record<string, any> = {
 ai_provider: String(aiProvider),
 ai_chatgpt_model: String(openaiModel),
 ai_gemini_model: String(geminiModel),
 ai_gemini_temperature: String(geminiTemperature),
 ai_chatgpt_temperature: String(openaiTemperature),
 };

 // Only include API keys if they were changed by the user (not MASK and not empty)
 if (geminiApiKey && geminiApiKey !== MASK && geminiApiKey !== '') {
 payload.gemini_api_key = String(geminiApiKey);
 }
 if (openaiApiKey && openaiApiKey !== MASK && openaiApiKey !== '') {
 payload.chatgpt_api_key = String(openaiApiKey);
 }

 const user = getCurrentUser();
 const updatedBy = user?.email || 'ui';
 const result = await api.updateSettings(payload, updatedBy);

 // After save, update all original values
 setOriginalAiProvider(aiProvider);
 setOriginalOpenaiModel(openaiModel);
 setOriginalGeminiModel(geminiModel);
 setOriginalOpenaiTemperature(openaiTemperature);
 setOriginalGeminiTemperature(geminiTemperature);
 
 // Update API key state - if a key was sent, mark it as saved (show MASK), otherwise keep current state
 if (payload.gemini_api_key) {
 setOriginalGeminiApiKey(payload.gemini_api_key);
 setGeminiApiKey(MASK);
 }
 if (payload.chatgpt_api_key) {
 setOriginalOpenaiApiKey(payload.chatgpt_api_key);
 setOpenaiApiKey(MASK);
 }

 setToastType('success');
 setToastMessage('Settings saved successfully');
 setTimeout(() => setToastMessage(null), 3000);
 } catch (e) {
 console.error('Failed to save settings', e);
 setToastType('error');
 setToastMessage((e as any)?.message || 'Failed to save settings');
 setTimeout(() => setToastMessage(null), 3000);
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
 const isRemoving = current.includes(reportId);
 
 if (isRemoving) {
 nextList = current.filter((id) => id !== reportId);
 } else {
 nextList = [...current, reportId];
 }
 
 // Remove duplicates
 nextList = Array.from(new Set(nextList));
 
 const nextMap = { ...prev, [view]: nextList };
 setLayoutDirty(computeLayoutDirty(nextMap, originalReportsByView));
 
 // Update layout intelligently - preserve existing structure
 setDashboardLayouts((prevLayouts) => {
 const currentLayout = prevLayouts[view] || { rows: [] };
 
 if (isRemoving) {
 // Remove report from layout, keep structure
 const newRows = currentLayout.rows
 .map((row) => ({
 ...row,
 reportIds: row.reportIds.filter((id) => id !== reportId),
 }))
 .filter((row) => row.reportIds.length > 0); // Remove empty rows
 
 return {
 ...prevLayouts,
 [view]: { rows: newRows },
 };
 } else {
 // Add report to layout - preserve existing structure
 const newLayout = { rows: [...currentLayout.rows] };
 
 // Check if report already exists in layout
 const alreadyExists = newLayout.rows.some(row => row.reportIds.includes(reportId));
 
 if (!alreadyExists) {
 if (newLayout.rows.length === 0) {
 // Create first row with the report
 newLayout.rows = [{ id: 'row-1', reportIds: [reportId] }];
 } else {
 const lastRowIndex = newLayout.rows.length - 1;
 const lastRow = { ...newLayout.rows[lastRowIndex] };
 
 if (lastRow.reportIds.length >= 2) {
 // Create new row
 newLayout.rows.push({ id: `row-${Date.now()}`, reportIds: [reportId] });
 } else {
 // Add to last row (create new array to avoid mutation)
 newLayout.rows[lastRowIndex] = {
 ...lastRow,
 reportIds: [...lastRow.reportIds, reportId],
 };
 }
 }
 }
 
 return {
 ...prevLayouts,
 [view]: newLayout,
 };
 }
 });
 
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
 
 // Clear dashboard configs cache so dashboards reload with new configuration
 const { configCache } = await import('@/lib/configCache');
 configCache.clearDashboardConfigs();
 console.log('[SettingsScreen] Dashboard configs cache cleared after save');
 
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

 const handleTabChange = (tabId: string) => {
 if (layoutDirty && activeTab === 'dashboard-layout') {
 setPendingTab(tabId);
 setShowUnsavedWarning(true);
 } else {
 setActiveTab(tabId);
 }
 };

 const confirmTabChange = () => {
 setShowUnsavedWarning(false);
 if (pendingTab) {
 setActiveTab(pendingTab);
 setPendingTab(null);
 setLayoutDirty(false);
 }
 };

 const cancelTabChange = () => {
 setShowUnsavedWarning(false);
 setPendingTab(null);
 };

 const settingsTabs = useMemo(() => {
 const tabs = [
 { 
 id: 'ai-config', 
 label: 'AI Configuration', 
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
 </svg>
 )
 },
 { 
 id: 'config-thresholds', 
 label: 'Config and Thresholds', 
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 )
 },
 { 
 id: 'insight-types', 
 label: 'Insight Types', 
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
 </svg>
 )
 },
 { 
 id: 'prompts', 
 label: 'Prompts', 
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
      )
    },
  ];
  if (isSystemUser) {
    tabs.push({ 
      id: 'dashboard-layout', 
      label: 'Dashboard Layout', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
        </svg>
      )
    });
  }
  // Add Build Report as the last tab (disabled)
  tabs.push({
    id: 'build-report',
    label: 'Build Report',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  });
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
 const hasChanges = hasAiConfigChanges();
 
 if (isLoading) {
 return (
 <div className="bg-surface rounded-lg shadow-sm p-4 text-center">
 <p className="text-content-tertiary">Loading settings...</p>
 </div>
 );
 }
 
 if (loadingError) {
 return (
 <div className="bg-danger-bg border border-danger-border rounded-lg p-4">
 <div className="flex items-center space-x-2">
 <span className="text-danger-text font-semibold">Error:</span>
 <span className="text-danger-text">{loadingError}</span>
 </div>
 </div>
 );
 }
 
 const currentActiveProvider = originalAiProvider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini';
 
 return (
 <div className="w-full h-full overflow-auto">
 <div className="w-full max-w-2xl">
 <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 from-surface dark:via-slate-800 to-surface-elevated rounded-lg shadow-sm border border-outline p-4 md:p-6 space-y-4 md:space-y-6">
 {/* Currently Active LLM Badge */}
 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-lg border border-blue-200 dark:border-blue-800 p-3 md:p-4">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="flex items-center justify-center w-10 h-10 bg-brand/20 rounded-full">
 {originalAiProvider === 'openai' ? (
 /* OpenAI Logo */
 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.4397-1.7845l-1.6589-2.8692a5.4025 5.4025 0 0 0-2.2856-2.2856l-2.8692-1.6589a5.9217 5.9217 0 0 0-3.5691-.4398L9.1919 1.2954a5.5054 5.5054 0 0 0-4.3872 4.3872L3.707 8.7157a5.9847 5.9847 0 0 0-.4397 1.7845l-1.6589 2.8692a5.4025 5.4025 0 0 0-2.2856 2.2856l-2.8692 1.6589a5.9217 5.9217 0 0 0-.4398 3.5691l1.2954 3.2678a5.5054 5.5054 0 0 0 4.3872 4.3872l3.2678 1.2954a5.9847 5.9847 0 0 0 1.7845.4397l2.8692 1.6589a5.4025 5.4025 0 0 0 2.2856 2.2856l1.6589 2.8692a5.9217 5.9217 0 0 0 3.5691.4398l3.2678-1.2954a5.5054 5.5054 0 0 0 4.3872-4.3872l1.2954-3.2678a5.9847 5.9847 0 0 0 .4397-1.7845l1.6589-2.8692a5.4025 5.4025 0 0 0 2.2856-2.2856l2.8692-1.6589a5.9217 5.9217 0 0 0 .4398-3.5691l-1.2954-3.2678a5.5054 5.5054 0 0 0-4.3872-4.3872l-3.2678-1.2954z" fill="#10A37F"/>
 <path d="M12.8135 3.6211L8.9332 8.9336a3.9872 3.9872 0 0 0 0 5.6416l3.8803 5.3125a4.0042 4.0042 0 0 0 5.6416 0l3.8803-5.3125a3.9872 3.9872 0 0 0 0-5.6416L18.4551 3.6211a4.0042 4.0042 0 0 0-5.6416 0z" fill="#FFFFFF"/>
 </svg>
 ) : (
 /* Google Gemini Logo */
 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4"/>
 <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="#34A853"/>
 <path d="M2 12L12 17L22 12" stroke="#EA4335" strokeWidth="2" fill="none"/>
 <path d="M12 2V12" stroke="#FBBC04" strokeWidth="2"/>
 </svg>
 )}
 </div>
 <div>
 <p className="text-xs font-medium text-content-tertiary">Currently Active LLM</p>
 <p className="text-sm font-semibold text-content-primary">{currentActiveProvider}</p>
 </div>
 </div>
 <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
 originalAiProvider === 'openai' 
 ? 'bg-brand/20 text-blue-700 dark:text-blue-300' 
 : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
 }`}>
 Active
 </span>
 </div>
 </div>

 {/* AI Provider Selection */}
 <div className="bg-surface rounded-lg border border-outline p-3 md:p-4">
 <div className="flex flex-col space-y-2 md:space-y-3">
 <label className="text-sm font-semibold text-content-secondary">Select AI Provider to Configure</label>
 <select
 value={aiProvider}
 onChange={(e) => setAiProvider(e.target.value)}
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-4 py-2.5 text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
 >
 <option value="openai">OpenAI ChatGPT</option>
 <option value="gemini">Google Gemini</option>
 </select>
 </div>
 </div>

 {/* Single Settings Container - Only for Selected Provider */}
 {aiProvider === 'openai' ? (
 <div className={`bg-surface rounded-lg p-4 md:p-6 border-2 transition-all ${
 originalAiProvider === 'openai' ? 'border-blue-500 border-blue-700' : 'border-outline'
 }`}>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
 {/* OpenAI Logo */}
 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/20000/svg">
 <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.4397-1.7845l-1.6589-2.8692a5.4025 5.4025 0 0 0-2.2856-2.2856l-2.8692-1.6589a5.9217 5.9217 0 0 0-3.5691-.4398L9.1919 1.2954a5.5054 5.5054 0 0 0-4.3872 4.3872L3.707 8.7157a5.9847 5.9847 0 0 0-.4397 1.7845l-1.6589 2.8692a5.4025 5.4025 0 0 0-2.2856 2.2856l-2.8692 1.6589a5.9217 5.9217 0 0 0-.4398 3.5691l1.2954 3.2678a5.5054 5.5054 0 0 0 4.3872 4.3872l3.2678 1.2954a5.9847 5.9847 0 0 0 1.7845.4397l2.8692 1.6589a5.4025 5.4025 0 0 0 2.2856 2.2856l1.6589 2.8692a5.9217 5.9217 0 0 0 3.5691.4398l3.2678-1.2954a5.5054 5.5054 0 0 0 4.3872-4.3872l1.2954-3.2678a5.9847 5.9847 0 0 0 .4397-1.7845l1.6589-2.8692a5.4025 5.4025 0 0 0 2.2856-2.2856l2.8692-1.6589a5.9217 5.9217 0 0 0 .4398-3.5691l-1.2954-3.2678a5.5054 5.5054 0 0 0-4.3872-4.3872l-3.2678-1.2954z" fill="#10A37F"/>
 <path d="M12.8135 3.6211L8.9332 8.9336a3.9872 3.9872 0 0 0 0 5.6416l3.8803 5.3125a4.0042 4.0042 0 0 0 5.6416 0l3.8803-5.3125a3.9872 3.9872 0 0 0 0-5.6416L18.4551 3.6211a4.0042 4.0042 0 0 0-5.6416 0z" fill="#FFFFFF"/>
 </svg>
 </div>
 <div>
 <h3 className="text-base font-semibold text-content-primary">OpenAI ChatGPT Settings</h3>
 <p className="text-xs text-content-tertiary">Configure your OpenAI API settings</p>
 </div>
 </div>
 {originalAiProvider === 'openai' && (
 <span className="px-3 py-1 bg-brand/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
 Active
 </span>
 )}
 </div>
 <div className="space-y-4">
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">Model</label>
 <select
 value={openaiModel}
 onChange={(e) => setOpenaiModel(e.target.value)}
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
 >
 {openaiModels.map((model) => (
 <option key={model.value} value={model.value}>
 {model.label}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">Temperature</label>
 <input
 type="number"
 step="0.1"
 min="0"
 max="1"
 value={openaiTemperature}
 onChange={(e) => setOpenaiTemperature(parseFloat(e.target.value))}
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
 />
 <p className="text-xs text-content-tertiary">Controls randomness (0 = deterministic, 1 = creative)</p>
 </div>
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">API Key</label>
 <input
 type="password"
 value={openaiApiKey}
 onChange={(e) => setOpenaiApiKey(e.target.value)}
 placeholder="Enter your OpenAI API key"
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
 />
 <p className="text-xs text-content-tertiary">Your API key is encrypted and stored securely</p>
 </div>
 </div>
 </div>
 ) : (
 <div className={`bg-surface rounded-lg p-4 md:p-6 border-2 transition-all ${
 originalAiProvider === 'gemini' ? 'border-green-500 dark:border-green-700' : 'border-outline'
 }`}>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
 {/* Google Gemini Logo */}
 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4"/>
 <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="#34A853"/>
 <path d="M2 12L12 17L22 12" stroke="#EA4335" strokeWidth="2" fill="none"/>
 <path d="M12 2V12" stroke="#FBBC04" strokeWidth="2"/>
 </svg>
 </div>
 <div>
 <h3 className="text-base font-semibold text-content-primary">Google Gemini Settings</h3>
 <p className="text-xs text-content-tertiary">Configure your Google Gemini API settings</p>
 </div>
 </div>
 {originalAiProvider === 'gemini' && (
 <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
 Active
 </span>
 )}
 </div>
 <div className="space-y-4">
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">Model</label>
 <select
 value={geminiModel}
 onChange={(e) => setGeminiModel(e.target.value)}
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
 >
 {geminiModels.map((model) => (
 <option key={model.value} value={model.value}>
 {model.label}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">Temperature</label>
 <input
 type="number"
 step="0.1"
 min="0"
 max="1"
 value={geminiTemperature}
 onChange={(e) => setGeminiTemperature(parseFloat(e.target.value))}
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
 />
 <p className="text-xs text-content-tertiary">Controls randomness (0 = deterministic, 1 = creative)</p>
 </div>
 <div className="flex flex-col space-y-2">
 <label className="text-sm font-medium text-content-secondary">API Key</label>
 <input
 type="password"
 value={geminiApiKey}
 onChange={(e) => setGeminiApiKey(e.target.value)}
 placeholder="Enter your Google Gemini API key"
 className="border border-outline-strong bg-surface-elevated text-content-primary rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
 />
 <p className="text-xs text-content-tertiary">Your API key is encrypted and stored securely</p>
 </div>
 </div>
 </div>
 )}

 {/* Save Button - Right Aligned */}
 <div className="flex items-center justify-end pt-2">
 <button
 onClick={handleSave}
 disabled={saving || !hasChanges}
 className={`w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
 saving || !hasChanges
 ? 'bg-gray-300 bg-surface-elevated text-content-muted cursor-not-allowed' 
 : 'bg-brand text-white hover:bg-brand-hover shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
 }`}
 >
 {saving ? 'Saving...' : 'Save Settings'}
 </button>
 </div>
 </div>
 </div>
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

 return (
 <div className="space-y-4 h-full flex flex-col min-h-0">
 {layoutError && (
 <div className="bg-danger-bg border border-danger-border text-danger-text rounded-lg p-4 text-sm flex-shrink-0">
 {layoutError}
 </div>
 )}
 
 {/* Header: Dashboard Selector and Action Buttons */}
 <div className="flex items-center justify-between flex-shrink-0">
 <div className="flex items-center gap-2">
 <label className="text-sm font-semibold text-content-secondary">Dashboard:</label>
 <div className="inline-flex rounded-lg border border-outline-strong bg-surface-elevated">
 <button
 onClick={() => setSelectedDashboardView('team-dashboard')}
 className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
 selectedDashboardView === 'team-dashboard'
 ? 'bg-brand text-white'
 : 'text-content-secondary hover:bg-surface-secondary'
 }`}
 >
 Team Dashboard
 </button>
 <button
 onClick={() => setSelectedDashboardView('pi-dashboard')}
 className={`px-4 py-2 text-sm font-medium rounded-r-lg border-l border-outline transition-colors ${
 selectedDashboardView === 'pi-dashboard'
 ? 'bg-brand text-white'
 : 'text-content-secondary hover:bg-surface-secondary'
 }`}
            >
            {piLabel('Dashboard')}
            </button>
 </div>
 </div>
 
 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 {layoutDirty && (
 <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
 <svg className="w-4 h-4 text-yellow-600 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 <span className="text-xs font-medium text-yellow-800">Unsaved</span>
 </div>
 )}
 <button
 type="button"
 onClick={handleResetLayouts}
 disabled={layoutSaving || !layoutDirty}
 className={`px-4 py-2 text-sm rounded-md border ${
 layoutSaving || !layoutDirty
 ? 'border-outline text-content-muted cursor-not-allowed'
 : 'border-outline text-content-secondary hover:bg-surface-secondary'
 }`}
 >
 Reset
 </button>
 <button
 type="button"
 onClick={handleSaveLayouts}
 disabled={layoutSaving || !layoutDirty}
 className={`px-4 py-2 text-sm rounded-md text-white shadow-sm ${
 layoutSaving || !layoutDirty
 ? 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
 : 'bg-brand hover:bg-brand-hover'
 }`}
 >
 {layoutSaving ? 'Saving...' : '💾 Save Layout'}
 </button>
 </div>
 </div>
 
 {layoutLoading ? (
 <div className="flex items-center justify-center h-48">
 <div className="flex flex-col items-center gap-2 text-content-tertiary text-sm">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 Loading dashboard layout...
 </div>
 </div>
 ) : (
 (() => {
 const view = selectedDashboardView;
 const selected = selectedReportsByView[view] ?? [];
 const selectedReports = Array.from(new Set(selected));
 
 // Use existing layout or build default
 let currentLayout = dashboardLayouts[view];
 
 if (!currentLayout || currentLayout.rows.length === 0) {
 // Build default layout from current selection (2 per row)
 const rows: { id: string; reportIds: string[] }[] = [];
 for (let i = 0; i < selectedReports.length; i += 2) {
 rows.push({
 id: `row-${i / 2 + 1}`,
 reportIds: selectedReports.slice(i, i + 2),
 });
 }
 currentLayout = { 
 rows: rows.length > 0 ? rows : [{ id: 'row-1', reportIds: [] }] 
 };
 }
 
 // Filter out removed reports (like pi-metrics-summary-by-team)
 const reportsForView = availableReports.filter((report) => 
 isReportAllowedForView(report, view) && report.report_id !== 'pi-metrics-summary-by-team'
 );
 const selectedReportsForView = reportsForView.filter((report) =>
 selectedReports.includes(report.report_id)
 );

 return (
 <div className="bg-surface rounded-lg shadow-sm border-2 border-outline p-6 flex flex-col flex-1 min-h-0">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
 {/* Left: Report Selection List */}
 <div className="lg:col-span-3 flex flex-col min-h-0">
 <div className="flex items-center justify-between mb-3 flex-shrink-0">
 <h4 className="text-sm font-semibold text-content-secondary">Available Reports</h4>
 <span className="text-xs text-content-tertiary">{selectedReports.length} selected</span>
 </div>
 
 <div className="border border-outline rounded-md divide-y divide-gray-200 overflow-auto flex-1">
 {reportsForView.length === 0 ? (
 <div className="p-3 text-sm text-content-tertiary">
 No reports available for this dashboard.
 </div>
 ) : (
 reportsForView.map((report) => {
 const checked = selectedReports.includes(report.report_id);
 return (
 <label
 key={`${view}-${report.report_id}`}
 className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
 >
 <input
 type="checkbox"
 className="mt-0.5 h-4 w-4 text-brand focus:ring-brand border-outline rounded"
 checked={checked}
 onChange={() => handleToggleReport(view, report.report_id)}
 disabled={layoutSaving}
 />
 <div>
 <div className="font-medium text-content-primary">{report.report_name}</div>
 {report.description && (
 <div className="text-xs text-content-tertiary">{report.description}</div>
 )}
 </div>
 </label>
 );
 })
 )}
 </div>
 </div>
 
 {/* Right: Layout Preview */}
 <div className="lg:col-span-9 flex flex-col min-h-0">
 <h4 className="text-sm font-semibold text-content-secondary mb-3 flex-shrink-0">Layout Preview</h4>
 <div className="flex-1 overflow-auto min-h-0">
 {selectedReports.length === 0 ? (
 <div className="border-2 border-dashed border-outline rounded-lg p-12 text-center text-content-tertiary h-full flex flex-col items-center justify-center">
 <svg className="w-16 h-16 mb-4 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <div className="text-sm">Select reports from the left to preview the layout</div>
 </div>
 ) : (
 <DashboardLayoutArranger
 view={view}
 availableReports={selectedReportsForView}
 layout={currentLayout}
 onLayoutChange={(newLayout) => {
 setDashboardLayouts((prev) => ({
 ...prev,
 [view]: newLayout,
 }));
 setLayoutDirty(true);
 }}
 onReportRemoved={(reportId) => {
 // Uncheck the report in the list
 setSelectedReportsByView((prev) => ({
 ...prev,
 [view]: (prev[view] || []).filter((id) => id !== reportId),
 }));
 setLayoutDirty(true);
 }}
 onCancel={() => {}}
 />
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })()
 )}
 </div>
 );
 case 'prompts':
 return <PromptsTab />;
 case 'insight-types':
 return <InsightTypesTab />;
 case 'config-thresholds':
 return <ConfigAndThresholdsTab />;
 case 'build-report':
 return <BuildReportTab />;
 
 default:
 return (
 <div className="bg-surface rounded-lg shadow-sm p-6 text-center">
 <div className="text-3xl mb-3">🚧</div>
 <h2 className="text-sm font-semibold mb-2">Coming Soon</h2>
 <p className="text-xs text-content-tertiary">
 {settingsTabs.find(tab => tab.id === activeTab)?.label} settings are under development.
 </p>
 </div>
 );
 }
 };

 return (
 <div className="h-full flex flex-col px-4 md:px-6">
 {/* Settings Header */}
 <div className="flex-shrink-0 mt-4">
 <div className="px-4 md:pl-0 md:pr-6">
 {/* Mobile: 3 tabs per row grid */}
 <nav className="grid grid-cols-3 gap-1 md:hidden">
 {settingsTabs.map((tab) => {
 const isActive = activeTab === tab.id;
 const isDisabled = (tab as { disabled?: boolean }).disabled;
 return (
 <button
 key={tab.id}
 type="button"
 disabled={isDisabled}
 onClick={() => !isDisabled && handleTabChange(tab.id)}
 className={`
 flex flex-col items-center justify-center px-2 py-2 text-xs font-medium rounded-t-lg border transition-colors
 ${isDisabled ? 'opacity-50 cursor-not-allowed border border-outline' : ''}
 ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : isDisabled ? 'bg-surface-elevated/50 text-content-tertiary' : 'bg-surface-elevated/50 text-content-tertiary border border-outline hover:bg-surface-secondary'}
 `}
 >
 <span className="mb-1">{tab.icon}</span>
 <span className="truncate text-center leading-tight">{tab.label}</span>
 </button>
 );
 })}
 </nav>

 {/* Desktop: single row */}
 <nav className="hidden md:flex md:flex-nowrap gap-1 md:justify-start">
 {settingsTabs.map((tab) => {
 const isActive = activeTab === tab.id;
 const isDisabled = (tab as { disabled?: boolean }).disabled;
 return (
 <button
 key={tab.id}
 type="button"
 disabled={isDisabled}
 onClick={() => !isDisabled && handleTabChange(tab.id)}
 className={`
 flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
 ${isDisabled ? 'opacity-50 cursor-not-allowed border border-outline' : ''}
 ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : isDisabled ? 'bg-surface-elevated/50 text-content-tertiary' : 'bg-surface-elevated/50 text-content-tertiary border border-outline hover:bg-surface-secondary'}
 `}
 >
 <span className="mr-2">{tab.icon}</span>
 <span>{tab.label}</span>
 </button>
 );
 })}
 </nav>
 </div>
 </div>

 {/* Tab Content */}
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-surface border border-outline-strong rounded-tr-lg rounded-b-lg shadow-sm mb-4">
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 md:p-6">
 {renderTabContent()}
 </div>
 </div>

 <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />

 {/* Unsaved Changes Warning Modal */}
 {showUnsavedWarning && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
 <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
 <div className="flex items-start gap-3 mb-4">
 <svg className="w-6 h-6 text-yellow-600 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 <div>
 <h3 className="text-lg font-semibold text-content-primary">Unsaved Changes</h3>
 <p className="text-sm text-content-tertiary mt-2">
 You have unsaved changes to the dashboard layout. If you leave now, your changes will be lost.
 </p>
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <button
 onClick={cancelTabChange}
 className="px-4 py-2 border border-outline-strong text-content-secondary rounded-lg hover:bg-surface-elevated transition-colors text-sm font-medium"
 >
 Stay Here
 </button>
 <button
 onClick={confirmTabChange}
 className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 hover:bg-red-600 transition-colors text-sm font-medium"
 >
 Leave Without Saving
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
