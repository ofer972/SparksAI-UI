# Investigation: verifyAdmin URL Issue

## Timeline of Changes

### Commit dcfd0268 (Oct 30): Initial Rewrite Setup
**next.config.js BEFORE:**
```javascript
// No rewrites - direct API calls
```

**next.config.js AFTER:**
```javascript
{
  source: '/api/:path*',
  destination: `${target}/:path*`,  // REMOVES /api prefix
}
```

### Commit 705be710 (Nov 2): Fix Double /api Prefix
**next.config.js BEFORE:**
```javascript
destination: `${target}/:path*`,  // Removed /api
```

**next.config.js AFTER:**
```javascript
destination: `${target}/api/:path*`,  // PRESERVES /api prefix for gateway
```

### Commit 3e7878f3 (Nov 2): Router/Builder Pattern
**What Changed:**
- Removed `/api/v1` prefix from endpoint definitions
- `buildApiUrl()` now automatically adds `/v1` and `/api` prefix
- Changed endpoint format from `/api/v1/teams/getNames` → `/teams/getNames`

**verifyAdmin BEFORE (commit 3e7878f3^):**
```typescript
export async function verifyAdmin(): Promise<boolean> {
  const res = await fetch(buildApiUrl('/users/verify-admin'));
  // But buildApiUrl probably didn't exist yet, or endpoints were different
}
```

**verifyAdmin AFTER (commit 3e7878f3):**
```typescript
export async function verifyAdmin(): Promise<boolean> {
  const res = await fetch(buildApiUrl('/users/verify-admin'));
  // buildApiUrl('/users/verify-admin') → /api/v1/users/verify-admin
  // ❌ WRONG: Gateway route is /api/users/verify-admin (no /v1)
}
```

## The Problem

### Current State:
1. **buildApiUrl()** function (lib/config.ts:101):
   ```typescript
   const versionedPath = `/${version}${cleanEndpoint}`;  // Adds /v1
   // '/users/verify-admin' → '/v1/users/verify-admin'
   return `${baseUrl}${versionedPath}`;  // Adds /api → '/api/v1/users/verify-admin'
   ```

2. **Gateway Route** (routes.go:40):
   ```go
   protected.HandleFunc("/users/verify-admin", authSvc.VerifyAdminHandler)
   // Full path: /api/users/verify-admin (NOT /api/v1/users/verify-admin)
   ```

3. **Next.js Rewrite** (next.config.js:16):
   ```javascript
   destination: `${target}/api/:path*`
   // /api/v1/users/verify-admin → gateway/api/api/v1/users/verify-admin
   // This causes 404 because gateway route is /api/users/verify-admin
   ```

### Root Cause:
- `verifyAdmin()` uses `buildApiUrl()` which adds `/v1`
- But `/users/verify-admin` is a **gateway endpoint** (not a v1 backend endpoint)
- Gateway routes are at `/api/*`, backend routes are at `/api/v1/*`

## Solution Options

### Option 1: Don't use buildApiUrl for gateway endpoints (CURRENT FIX)
```typescript
export async function verifyAdmin(): Promise<boolean> {
  const baseUrl = API_CONFIG.baseUrl;
  const url = `${baseUrl}/users/verify-admin`;  // /api/users/verify-admin
  const res = await authFetch(url);
  // ...
}
```

### Option 2: Add a flag to buildApiUrl to skip /v1
```typescript
export const buildApiUrl = (endpoint: string, skipVersion: boolean = false): string => {
  // ...
  if (skipVersion) {
    return `${baseUrl}${cleanEndpoint}`;  // No /v1
  }
  // ... normal logic with /v1
}
```

### Option 3: Separate function for gateway endpoints
```typescript
export const buildGatewayUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;  // No /v1
}
```

## Other Affected Endpoints

All user management endpoints use `buildApiUrl()` but are gateway endpoints:
- `/api/users` (not `/api/v1/users`)
- `/api/users/{id}/roles` (not `/api/v1/users/{id}/roles`)
- `/api/roles` (not `/api/v1/roles`)
- `/api/allowlist` (not `/api/v1/allowlist`)

These may have the same issue.

