import { useEffect, useRef } from 'react';
import type { NavItemId } from '@/lib/nav';
import { VALID_NAV_ITEMS } from '@/lib/nav';

interface NavigationState {
  navItem: NavItemId;
  customDashboardId?: string | null;
  _sparksNav: true;
}

function isOurState(state: unknown): state is NavigationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    '_sparksNav' in state &&
    (state as NavigationState)._sparksNav === true
  );
}

function buildHash(state: NavigationState): string {
  if (state.navItem === 'custom-dashboard-editor' && state.customDashboardId) {
    return `#custom-dashboard-editor:${state.customDashboardId}`;
  }
  return `#${state.navItem}`;
}

function parseHash(hash: string): Omit<NavigationState, '_sparksNav'> | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;

  if (raw.startsWith('custom-dashboard-editor:')) {
    const dashboardId = raw.slice('custom-dashboard-editor:'.length);
    if (dashboardId) {
      return { navItem: 'custom-dashboard-editor', customDashboardId: dashboardId };
    }
  }

  if (VALID_NAV_ITEMS.has(raw)) {
    return { navItem: raw as NavItemId };
  }

  return null;
}

export function useNavigationHistory(
  activeNavItem: NavItemId,
  setActiveNavItem: (navItem: NavItemId) => void,
  setMobileSidebarOpen: (open: boolean) => void,
  customDashboardId: string | null,
  setCustomDashboardId: (id: string | null) => void,
) {
  const isPopstateNavRef = useRef(false);
  const replaceNextRef = useRef(true);
  const prevStateRef = useRef<NavigationState | null>(null);

  // B) Initialize from URL hash on mount (deep linking).
  // Must run before Effect A so we don't overwrite the URL with #home before parsing.
  useEffect(() => {
    const parsed = parseHash(window.location.hash);
    if (parsed) {
      replaceNextRef.current = true;
      setActiveNavItem(parsed.navItem);
      if (parsed.customDashboardId) {
        setCustomDashboardId(parsed.customDashboardId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A) Sync activeNavItem (and customDashboardId) changes to browser history + URL hash.
  // Skip on initial mount when URL has a deep-link hash - let Effect B parse it first.
  useEffect(() => {
    const state: NavigationState = { navItem: activeNavItem, customDashboardId, _sparksNav: true };

    if (isPopstateNavRef.current) {
      isPopstateNavRef.current = false;
      prevStateRef.current = state;
      return;
    }

    const prev = prevStateRef.current;
    if (prev && prev.navItem === state.navItem && prev.customDashboardId === state.customDashboardId) {
      return;
    }

    // Deep link: URL has a different dest than current state - don't overwrite yet
    if (replaceNextRef.current && prev === null) {
      const parsed = parseHash(window.location.hash);
      if (parsed && (parsed.navItem !== activeNavItem || (parsed.customDashboardId ?? null) !== customDashboardId)) {
        return;
      }
    }

    const method = replaceNextRef.current ? 'replaceState' : 'pushState';
    replaceNextRef.current = false;
    window.history[method](state, '', buildHash(state));
    prevStateRef.current = state;
  }, [activeNavItem, customDashboardId]);

  // C) Handle browser back/forward buttons.
  // Registered on the capture phase so it fires before Next.js's popstate handler.
  // Stops propagation for our entries to prevent Next.js from interfering.
  // Fallback: when event.state is null (e.g. after Next.js reload), parse the URL hash.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (isOurState(event.state)) {
        event.stopImmediatePropagation();
        isPopstateNavRef.current = true;
        setActiveNavItem(event.state.navItem);
        setCustomDashboardId(event.state.customDashboardId ?? null);
        setMobileSidebarOpen(false);
        return;
      }
      // Fallback: Next.js may trigger a full reload on back, losing our state.
      // When state is null, parse the hash (we store nav in URL) and restore.
      const parsed = parseHash(window.location.hash);
      if (parsed) {
        isPopstateNavRef.current = true;
        setActiveNavItem(parsed.navItem);
        if (parsed.customDashboardId) {
          setCustomDashboardId(parsed.customDashboardId);
        } else {
          setCustomDashboardId(null);
        }
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState, true);
    return () => window.removeEventListener('popstate', onPopState, true);
  }, [setActiveNavItem, setCustomDashboardId, setMobileSidebarOpen]);
}
