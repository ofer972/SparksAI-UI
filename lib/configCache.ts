/**
 * Configuration Cache Module
 * 
 * Provides session-level caching for dashboard configurations and report definitions
 * to prevent duplicate API calls when navigating between dashboards.
 */

import type { ReportDefinition, DashboardViewConfig } from './config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ConfigCache {
  private reportDefinitionsCache: CacheEntry<ReportDefinition[]> | null = null;
  private dashboardConfigsCache: CacheEntry<DashboardViewConfig[]> | null = null;
  private pendingReportDefinitions: Promise<ReportDefinition[]> | null = null;
  private pendingDashboardConfigs: Promise<DashboardViewConfig[]> | null = null;

  private isExpired(entry: CacheEntry<any> | null): boolean {
    if (!entry) return true;
    return Date.now() - entry.timestamp > CACHE_DURATION;
  }

  /**
   * Get cached report definitions or fetch them
   */
  async getReportDefinitions(
    fetcher: () => Promise<ReportDefinition[]>
  ): Promise<ReportDefinition[]> {
    const now = Date.now();
    
    // Return cached data if valid
    if (this.reportDefinitionsCache && !this.isExpired(this.reportDefinitionsCache)) {
      const age = ((now - this.reportDefinitionsCache.timestamp) / 1000).toFixed(1);
      console.log(`[ConfigCache] ✅ Returning cached report definitions (age: ${age}s)`);
      return this.reportDefinitionsCache.data;
    }

    // If a fetch is already in progress, wait for it
    if (this.pendingReportDefinitions) {
      console.log('[ConfigCache] ⏳ Waiting for pending report definitions fetch (preventing duplicate call)');
      return this.pendingReportDefinitions;
    }

    // Start new fetch
    console.log('[ConfigCache] 🌐 Fetching report definitions from API');
    this.pendingReportDefinitions = fetcher()
      .then((data) => {
        console.log(`[ConfigCache] ✅ Report definitions fetched successfully (${data.length} items)`);
        this.reportDefinitionsCache = {
          data,
          timestamp: Date.now(),
        };
        this.pendingReportDefinitions = null;
        return data;
      })
      .catch((error) => {
        console.error('[ConfigCache] ❌ Failed to fetch report definitions:', error);
        this.pendingReportDefinitions = null;
        throw error;
      });

    return this.pendingReportDefinitions;
  }

  /**
   * Get cached dashboard configs or fetch them
   */
  async getDashboardConfigs(
    fetcher: () => Promise<DashboardViewConfig[]>
  ): Promise<DashboardViewConfig[]> {
    const now = Date.now();
    
    // Return cached data if valid
    if (this.dashboardConfigsCache && !this.isExpired(this.dashboardConfigsCache)) {
      const age = ((now - this.dashboardConfigsCache.timestamp) / 1000).toFixed(1);
      console.log(`[ConfigCache] ✅ Returning cached dashboard configs (age: ${age}s)`);
      return this.dashboardConfigsCache.data;
    }

    // If a fetch is already in progress, wait for it
    if (this.pendingDashboardConfigs) {
      console.log('[ConfigCache] ⏳ Waiting for pending dashboard configs fetch (preventing duplicate call)');
      return this.pendingDashboardConfigs;
    }

    // Start new fetch
    console.log('[ConfigCache] 🌐 Fetching dashboard configs from API');
    this.pendingDashboardConfigs = fetcher()
      .then((data) => {
        console.log(`[ConfigCache] ✅ Dashboard configs fetched successfully (${data.length} items)`);
        this.dashboardConfigsCache = {
          data,
          timestamp: Date.now(),
        };
        this.pendingDashboardConfigs = null;
        return data;
      })
      .catch((error) => {
        console.error('[ConfigCache] ❌ Failed to fetch dashboard configs:', error);
        this.pendingDashboardConfigs = null;
        throw error;
      });

    return this.pendingDashboardConfigs;
  }

  /**
   * Clear all cached data
   */
  clear() {
    console.log('[ConfigCache] Clearing all caches');
    this.reportDefinitionsCache = null;
    this.dashboardConfigsCache = null;
    this.pendingReportDefinitions = null;
    this.pendingDashboardConfigs = null;
  }

  /**
   * Clear only report definitions cache
   */
  clearReportDefinitions() {
    console.log('[ConfigCache] Clearing report definitions cache');
    this.reportDefinitionsCache = null;
    this.pendingReportDefinitions = null;
  }

  /**
   * Clear only dashboard configs cache
   */
  clearDashboardConfigs() {
    console.log('[ConfigCache] Clearing dashboard configs cache');
    this.dashboardConfigsCache = null;
    this.pendingDashboardConfigs = null;
  }
}

// Export singleton instance
export const configCache = new ConfigCache();

