# URL Routing Fix - Double API Path Issue

## Issue Fixed

**Error**: Frontend was making requests to `/api/api/...` instead of `/api/...`

**Root Cause**: The `buildApiUrl()` function in `packages/frontend/lib/config.ts` was prepending `/api` to endpoints that already started with `/api`, causing duplication.

**Example of broken URLs**:
- `/api/api/submissions/user/65fb2ba6-5d4c-497b-b3ff-47f6cfcb5893`
- `/api/api/progress/leaderboard`

## Fix Applied

Updated `packages/frontend/lib/config.ts`:

```typescript
// Before (broken)
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// After (fixed)
export const buildApiUrl = (endpoint: string): string => {
  // If endpoint already starts with /api, don't prepend base URL
  if (endpoint.startsWith('/api')) {
    return endpoint;
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
```

## Test Results

After fix:
- ✅ `/api/problems` → 200 OK
- ✅ `/api/progress/leaderboard` → 401 (correct auth required)
- ✅ `/api/submissions/user/test-id` → 401 (correct auth required)
- ✅ No more `/api/api/` double paths
- ✅ No 404 errors in browser console

## Steps Taken

1. Identified double API path issue in browser console
2. Located root cause in `buildApiUrl()` function
3. Applied conditional logic to prevent duplication
4. Rebuilt frontend with `pnpm build`
5. Restarted frontend with `pm2 restart frontend-prod`
6. Verified fix with endpoint testing

## Impact

This fix resolves:
- 404 errors for protected routes
- Browser console errors
- Broken API requests from frontend
- Authentication flow interruptions

All API endpoints now route correctly through NGINX to the backend.