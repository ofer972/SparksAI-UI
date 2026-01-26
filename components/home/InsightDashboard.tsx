'use client';

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { AICard } from '@/lib/config';
import ReportPanel from '@/components/ReportPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useUser } from '@/contexts/UserContext';

export type InsightDashboardProps = {
  card: AICard;
  onBack: () => void;
};

function priorityBadgeClass(priority: string, priorityColor?: string) {
  const color = (priorityColor || '').toLowerCase();
  const p = (priority || '').toLowerCase();

  if (color === 'red' || p === 'critical') return 'bg-red-100 text-red-700 dark:text-content-primary border-red-300 dark:border-brand';
  if (color === 'yellow' || p === 'high') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
  if (color === 'green' || p === 'low') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
  if (p === 'medium') return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
  return 'bg-surface-elevated text-content-secondary border-outline';
}

// Interface for information items (header/text pairs)
interface InformationItem {
  header: string;
  text: string;
}

// Parse information_json for non-Sprint Goal cards (header/text format)
function parseInformationJson(jsonString: string | undefined): InformationItem[] | null {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Handle direct array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // Handle object - only extract DashboardSummary (or variations)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Look for DashboardSummary with flexible key matching
      const keys = Object.keys(parsed);
      const dashboardSummaryKey = keys.find(key => 
        key.toLowerCase().replace(/[_\s]/g, '') === 'dashboardsummary'
      );
      
      if (dashboardSummaryKey && Array.isArray(parsed[dashboardSummaryKey])) {
        return parsed[dashboardSummaryKey] as InformationItem[];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing information_json:', error);
    return null;
  }
}

// Parse Sprint Goal JSON into table format (copied from AICardsInsight.tsx)
function parseSprintGoalJson(jsonString?: string): Record<string, any>[] | null {
  if (!jsonString || typeof jsonString !== 'string') return null;

  try {
    const parsed = JSON.parse(jsonString);

    // Handle direct array (already in table format)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Record<string, any>[];
    }

    // Handle object containing DashboardSummary or other arrays
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Check for DashboardSummary first (most common for Sprint Goals)
      if (parsed.DashboardSummary && Array.isArray(parsed.DashboardSummary) && parsed.DashboardSummary.length > 0) {
        // Transform from flat format to table format
        const flatArray = parsed.DashboardSummary;
        const tableRows: Record<string, any>[] = [];

        // Limit to 8 rows maximum (32 items)
        const maxItems = Math.min(flatArray.length, 32);
        for (let i = 0; i < maxItems; i += 4) {
          const goalItem = flatArray[i];
          const linkageItem = flatArray[i + 1];
          const progressItem = flatArray[i + 2];
          const alertItem = flatArray[i + 3];

          if (!goalItem || !linkageItem || !progressItem || !alertItem) {
            break;
          }

          // Normalize field names
          const getFieldName = (header: string): string => {
            return String(header || '').trim().replace(/ /g, '_');
          };

          const row: Record<string, any> = {};
          row[getFieldName(goalItem.header)] = String(goalItem.text || '').trim();
          row[getFieldName(linkageItem.header)] = String(linkageItem.text || '').trim();
          row[getFieldName(progressItem.header)] = String(progressItem.text || '').trim();
          row[getFieldName(alertItem.header)] = String(alertItem.text || '').trim();

          tableRows.push(row);
        }

        if (tableRows.length > 0) {
          return tableRows;
        }
      }

      // Check other common property names that might contain arrays
      const arrayKeys = ['items', 'data', 'goals', 'sprint_goals', 'rows', 'records'];
      for (const key of arrayKeys) {
        if (parsed[key] && Array.isArray(parsed[key]) && parsed[key].length > 0) {
          return parsed[key] as Record<string, any>[];
        }
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

export default function InsightDashboard({ card, onBack }: InsightDashboardProps) {
  const { preferences } = useUser();
  const reportIds = card.report_ids || [];
  const anyCard = card as any;

  // Horizontal resizing state
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [activeHorizontalResizer, setActiveHorizontalResizer] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [columnWidths, setColumnWidths] = useState<Record<number, number[]>>({});

  // Get user's default team from preferences
  const defaultTeamName = preferences?.default_team_or_group || '';
  const defaultIsGroup = preferences?.default_type === 'group';

  // Build base filters for all reports based on card flags and user preferences
  // This follows the same pattern as CustomDashboardEditor's reportPanelFilters
  const controlledFilters = useMemo(() => {
    const filters: Record<string, any> = {};
    
    // Use user's default team for all reports
    if (defaultTeamName) {
      filters.team_name = defaultTeamName;
      filters.isGroup = defaultIsGroup;
    } else if (card.team_name) {
      // Fallback to card's team if no user default
      filters.team_name = card.team_name;
      filters.isGroup = false;
    } else if (card.group_name) {
      filters.team_name = card.group_name;
      filters.isGroup = true;
    }
    
    // Only set PI filter if pi_insight is true
    if (card.pi_insight && card.pi) {
      filters.pi = card.pi;
      filters.pi_name = card.pi;
    }
    
    return filters;
  }, [defaultTeamName, defaultIsGroup, card.team_name, card.group_name, card.pi, card.pi_insight]);

  // Build initial filters for a specific report (includes report-specific filters like scope_type)
  const getInitialFiltersForReport = useMemo(() => {
    return (reportId: string): Record<string, any> => {
      const filters: Record<string, any> = { ...controlledFilters };
      
      // Check if this is a goals report
      const isGoalsReport = reportId.toLowerCase().includes('goal');
      
      if (isGoalsReport) {
        // For goals reports, set scope_type based on card flags
        if (card.sprint_insight) {
          filters.scope_type = 'sprint';
        } else if (card.pi_insight) {
          filters.scope_type = 'pi';
        }
      }
      
      return filters;
    };
  }, [controlledFilters, card.sprint_insight, card.pi_insight]);

  // Create rows of reports (1 per row for cleaner layout)
  const reportRows: string[][] = reportIds.map(id => [id]);

  // Initialize column widths for rows with 2 columns
  useEffect(() => {
    const initialWidths: Record<number, number[]> = {};
    reportRows.forEach((row, idx) => {
      if (row.length === 2) {
        initialWidths[idx] = [50, 50]; // Start with equal widths
      }
    });
    setColumnWidths(initialWidths);
  }, [reportIds.length]); // Only reset when number of reports changes

  // Horizontal resize handlers (same pattern as DraggableResizableGrid)
  const handleHorizontalMouseDown = useCallback((rowIdx: number, colIdx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHorizontal(true);
    setActiveHorizontalResizer({ rowIdx, colIdx });
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleHorizontalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingHorizontal || !activeHorizontalResizer) return;

      const { rowIdx, colIdx } = activeHorizontalResizer;
      const container = containerRefs.current[rowIdx];
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - 4; // Subtract splitter width
      const mouseX = e.clientX - containerRect.left;
      const mousePercent = (mouseX / containerWidth) * 100;

      setColumnWidths((prev) => {
        const widths = [...(prev[rowIdx] || [50, 50])];
        
        const leftIndex = colIdx;
        const rightIndex = colIdx + 1;
        
        const totalWidth = widths[leftIndex] + widths[rightIndex];
        
        const newLeftPercent = mousePercent;
        const newRightPercent = totalWidth - newLeftPercent;
        
        // Minimum width: 20%
        const minWidthPercent = 20;
        
        if (newLeftPercent >= minWidthPercent && newRightPercent >= minWidthPercent) {
          widths[leftIndex] = newLeftPercent;
          widths[rightIndex] = newRightPercent;
        }
        
        return { ...prev, [rowIdx]: widths };
      });
    },
    [isDraggingHorizontal, activeHorizontalResizer]
  );

  const handleHorizontalMouseUp = useCallback(() => {
    setIsDraggingHorizontal(false);
    setActiveHorizontalResizer(null);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isDraggingHorizontal) {
      document.addEventListener('mousemove', handleHorizontalMouseMove);
      document.addEventListener('mouseup', handleHorizontalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleHorizontalMouseMove);
        document.removeEventListener('mouseup', handleHorizontalMouseUp);
      };
    }
  }, [isDraggingHorizontal, handleHorizontalMouseMove, handleHorizontalMouseUp]);

  return (
    <div className="min-h-full space-y-4">
      {/* Insight Card - Full Width */}
      <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden">
        {/* Header with back button */}
        <div className="px-5 py-4 bg-gradient-to-r from-surface to-surface-elevated border-b border-outline">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border ${priorityBadgeClass(card.priority, card.priority_color)}`}>
                  {card.priority || 'Info'}
                </span>
                {card.insight_type && (
                  <span className="text-xs text-content-tertiary bg-surface-elevated px-2 py-1 rounded-md border border-outline">
                    {card.insight_type}
                  </span>
                )}
                {card.date && (
                  <span className="text-xs text-content-muted">
                    {new Date(card.date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold text-content-primary">
                {card.card_name || 'Insight'}
              </h1>
              {(card.team_name || card.group_name) && (
                <div className="mt-1 text-sm text-content-tertiary">
                  {card.group_name ? `Group: ${card.group_name}` : `Team: ${card.team_name}`}
                  {card.pi && ` • PI: ${card.pi}`}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-strong text-content-secondary hover:bg-surface-elevated transition-colors text-sm font-medium flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>

        {/* Insight Content */}
        <div className="p-5">
          {/* Short Summary */}
          {anyCard.short_summary && (
            <div className="mb-4 p-4 bg-surface-elevated rounded-xl border border-outline">
              <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-2">Summary</div>
              <div className="text-sm text-content-primary prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{anyCard.short_summary}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Full Description with proper table rendering */}
          <div className="p-4 bg-surface rounded-xl border border-outline">
            <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-2">Details</div>
            <div className="text-sm text-content-secondary max-w-none">
              {(() => {
                // Handle cards with JSON table format
                const cardType = card.insight_type || (card as any).card_type;
                const isSprintGoal = cardType === 'Sprint Goal';
                
                if ((card as any).information_json) {
                  // Sprint Goal: Parse and render as table
                  if (isSprintGoal) {
                    const items = parseSprintGoalJson((card as any).information_json);

                    if (items && items.length > 0) {
                      // Extract column names
                      let columns = Object.keys(items[0]);
                      
                      // Reorder columns: Goal first, Alert last
                      const goalColumn = columns.find(col => col.toLowerCase().includes('goal'));
                      const alertColumn = columns.find(col => col.toLowerCase().includes('alert'));
                      
                      // Build new column order
                      columns = columns.filter(col => col !== goalColumn && col !== alertColumn);
                      if (goalColumn) columns.unshift(goalColumn);
                      if (alertColumn) columns.push(alertColumn);

                      return (
                        <div className="w-full overflow-auto rounded-lg border border-outline shadow-sm">
                          <table className="text-sm border-collapse w-full">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {columns.map((column) => {
                                  const isGoalColumn = column.toLowerCase().includes('goal');
                                  const width = isGoalColumn ? '50%' : 'auto';
                                  return (
                                    <th
                                      key={column}
                                      className="px-3 py-2.5 text-left text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b border-outline bg-surface-elevated"
                                      style={{ width }}
                                    >
                                      {column.replace(/_/g, ' ')}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((row, idx) => (
                                <tr 
                                  key={idx} 
                                  className={`${
                                    idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/50'
                                  } hover:bg-surface-secondary transition-colors`}
                                >
                                  {columns.map((column) => {
                                    const isGoalColumn = column.toLowerCase().includes('goal');
                                    const isAlertColumn = column.toLowerCase().includes('alert');
                                    const value = row[column];
                                    return (
                                      <td
                                        key={column}
                                        className={`px-3 py-2.5 border-b border-outline ${
                                          isGoalColumn 
                                            ? 'font-medium text-content-primary' 
                                            : isAlertColumn 
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-content-secondary'
                                        }`}
                                      >
                                        {String(value)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  }
                  
                  // Non-Sprint Goal: Parse and render with header/text format (like AICardsInsight)
                  const informationItems = parseInformationJson((card as any).information_json);
                  
                  if (informationItems && informationItems.length > 0) {
                    return (
                      <div className="p-4 bg-gradient-to-r from-surface to-surface-elevated rounded-xl border border-outline shadow-sm">
                        <div className="space-y-0">
                          {informationItems.map((item, index) => (
                            <div 
                              key={index} 
                              className={`py-2.5 border-b border-outline last:border-b-0 hover:bg-surface-elevated/50 transition-colors rounded-md px-2 -mx-2 ${index === 0 ? 'border-t-0' : ''}`}
                            >
                              <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{item.header}:</span>
                              <span className="text-content-secondary text-sm leading-relaxed ml-2">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                }

                // Fallback to markdown for description - wrapped in card styling
                return (
                  <div className="p-4 bg-gradient-to-r from-surface to-surface-elevated rounded-xl border border-outline shadow-sm">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          p: ({ children }) => <p className="text-sm text-content-secondary mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-sm text-content-secondary space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-sm text-content-secondary space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm text-content-secondary">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-blue-600 dark:text-blue-400">{children}</strong>,
                          em: ({ children }) => <em className="italic text-content-secondary">{children}</em>,
                          code: ({ children }) => <code className="bg-surface-secondary px-1 py-0.5 rounded text-xs font-mono text-content-primary border border-outline">{children}</code>,
                          pre: ({ children }) => <pre className="bg-surface-secondary p-2 rounded text-sm overflow-x-auto border-2 border-outline">{children}</pre>,
                          h1: ({ children }) => <h1 className="text-base font-bold text-content-primary mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold text-content-primary mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-content-primary mb-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-400 pl-2 italic text-content-secondary text-sm">{children}</blockquote>,
                          table: ({ children }) => (
                            <div className="overflow-auto rounded-lg border-2 border-outline shadow-sm bg-surface mb-2">
                              <table className="w-full text-sm border-collapse">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-surface-elevated">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-outline hover:bg-surface-secondary transition-colors">{children}</tr>,
                          th: ({ children }) => (
                            <th className="px-3 py-2 text-left text-xs font-semibold text-content-primary uppercase tracking-wider border-b-2 border-outline bg-surface-elevated">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 text-content-secondary border-b border-outline">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {card.description || (card as any).full_information || 'No detailed information available.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Recommendations if available */}
          {card.recommendations && card.recommendations.length > 0 && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-outline">
              <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-3">Recommendations</div>
              <ul className="space-y-2">
                {card.recommendations.map((rec, idx) => (
                  <li key={rec.id || idx} className="flex gap-3 text-sm text-content-secondary">
                    <span className="text-brand font-bold">•</span>
                    <span>{rec.action_text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Related Reports */}
      {reportRows.length > 0 && (
        <div className="space-y-6">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-content-tertiary uppercase tracking-wider">Related Reports</h2>
          </div>
          <div className="space-y-6">
            {reportRows.map((row, rowIdx) => (
              <div 
                key={rowIdx}
                ref={(el) => { containerRefs.current[rowIdx] = el; }}
                className="bg-surface rounded-2xl border border-outline shadow-sm overflow-hidden" 
                style={{ height: '450px' }}
              >
                {row.map((reportId) => (
                  <div 
                    key={reportId}
                    className="h-full"
                  >
                    <ReportPanel
                      reportId={reportId}
                      initialFilters={getInitialFiltersForReport(reportId)}
                      controlledFilters={controlledFilters}
                      enabled={true}
                      componentProps={{
                        // Hide the entire header - reports are read-only in this view
                        hideHeader: true,
                        isDashboard: true,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No reports message */}
      {reportIds.length === 0 && (
        <div className="bg-surface border border-outline rounded-2xl shadow-sm p-6 text-center">
          <div className="text-content-tertiary text-sm">
            No related reports available for this insight.
          </div>
        </div>
      )}
    </div>
  );
}
