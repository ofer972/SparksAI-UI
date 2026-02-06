/**
 * PI Terminology Utility
 * 
 * Provides functions to get and replace PI terminology based on environment variable.
 * This allows the UI to display "PI" or alternative terms (e.g., "Quarter") based on configuration.
 * 
 * IMPORTANT: This only affects user-facing display text. API parameters, variable names,
 * and internal identifiers should always remain "PI" to avoid breaking backend calls.
 */

/**
 * Get PI terminology from environment variable.
 * Defaults to "PI" if not set. Set NEXT_PUBLIC_PI_TERMINOLOGY="Quarter" to switch.
 */
export function getPITerminology(): string {
  return process.env.NEXT_PUBLIC_PI_TERMINOLOGY || 'PI';
}

/**
 * Convenience: get the plural form (e.g., "PIs" or "Quarters")
 */
export function getPITerminologyPlural(): string {
  const term = getPITerminology();
  if (term === 'PI') return 'PIs';
  // Simple English pluralization
  if (term.endsWith('s') || term.endsWith('x') || term.endsWith('z') || term.endsWith('ch') || term.endsWith('sh')) {
    return `${term}es`;
  }
  return `${term}s`;
}

/**
 * Build a display label using the configured PI terminology.
 * Example: piLabel('Dashboard') => "PI Dashboard" or "Quarter Dashboard"
 *          piLabel('Goals', 'Define') => "Define PI Goals" or "Define Quarter Goals"
 */
export function piLabel(suffix: string, prefix?: string): string {
  const term = getPITerminology();
  const base = suffix ? `${term} ${suffix}` : term;
  return prefix ? `${prefix} ${base}` : base;
}

/**
 * Replace "PI" in a string with the configured terminology.
 * Useful for backend data that contains "PI" in titles/headers/tooltips.
 * 
 * Uses word boundaries to avoid replacing "PI" inside other words (e.g., "API", "Epic")
 * 
 * @param text - The text to process
 * @returns Text with "PI" replaced by configured terminology
 */
export function replacePITerminology(text: string): string {
  const term = getPITerminology();
  if (term === 'PI') return text; // No replacement needed if explicitly set to PI
  
  // Use word boundaries to match whole word "PI" only
  // Case-insensitive replacement but preserve original case structure
  return text.replace(/\bPI\b/gi, (match) => {
    // Preserve case: if original was uppercase, use uppercase replacement
    if (match === 'PI') return term;
    if (match === 'pi') return term.toLowerCase();
    if (match === 'Pi') return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    return term;
  });
}

/**
 * Check if a category name is PI-related.
 * Handles both "PI Events"/"PI Status" and configured terminology versions.
 * 
 * @param category - Category name to check
 * @returns True if category is PI-related
 */
export function isPICategory(category: string): boolean {
  const piTerm = getPITerminology();
  const normalizedCategory = category.trim();
  
  // Check for original PI categories (always, since backend sends these)
  if (normalizedCategory === 'PI Events' || normalizedCategory === 'PI Status') {
    return true;
  }
  
  // Check for configured terminology categories (e.g., "Quarter Events", "Quarter Status")
  if (normalizedCategory === `${piTerm} Events` || normalizedCategory === `${piTerm} Status`) {
    return true;
  }
  
  return false;
}

