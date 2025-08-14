# Problem Page Loading Fixes

## Issues Fixed

### 1. ✅ Problem Content Not Loading
**Root Cause**: Frontend was calling the wrong API endpoint for problem details.

**Problem**: 
- Frontend called `/api/problems/:id` which only returns basic metadata (`problem_id`, `problem_name`, `difficulty`)
- This endpoint doesn't include `pdfFileName`, `statement`, `solution`, or other detailed content
- Result: "PDF Problem Statement Not Found" message

**Fix**: Updated API client to call the correct endpoint
```typescript
// Before (broken)
getById: (id: string) => apiClient.get(`/api/problems/${id}`)

// After (fixed) 
getById: (id: string) => apiClient.get(`/api/problems/details-from-storage/${id}`)
```

### 2. ✅ JavaScript Runtime Error
**Root Cause**: `slugifyTaskName()` was being called with `undefined` when `problem.id` was not available.

**Error**: `Cannot read properties of undefined (reading 'toLowerCase')`

**Fix**: Added null safety check
```typescript
// Before (error-prone)
problemId: slugifyTaskName(problem.id)

// After (safe)
problemId: problem?.id ? slugifyTaskName(problem.id) : ''
```

## API Endpoint Comparison

### `/api/problems/:id` (Basic Info)
Returns:
```json
{
  "problem_id": "dynamicprogrammingkevinadventure",
  "problem_name": "dynamicprogrammingkevinadventure", 
  "difficulty": 800,
  "is_tagged": true,
  "tags": ["dynamic-programming", "array"],
  "embedding": "[...]"
}
```

### `/api/problems/details-from-storage/:id` (Full Details)
Returns:
```json
{
  "id": "dynamicprogrammingkevinadventure",
  "name": "DynamicProgrammingKevinAdventure",
  "statement": "...",
  "solution": "...", 
  "difficulty": 1000,
  "timeLimit": 1000,
  "memoryLimit": 64,
  "tags": [],
  "pdfFileName": "dynamicprogrammingkevinadventure.pdf"
}
```

## Problem Page Flow

### 1. **URL Parameter Extraction**
```typescript
const rawProblemId = searchParams.get("id");
const problemId = rawProblemId ? slugifyTaskName(rawProblemId) : null;
```

### 2. **API Call for Problem Details**
```typescript
const problemRes = await api.problems.getById(problemId);
// Now calls: /api/problems/details-from-storage/problemId
```

### 3. **PDF Display Logic**
```typescript
const pdfUrl = problem.pdfFileName
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problems/${problem.id}/Problems/${problem.pdfFileName}`
  : null;
```

### 4. **Conditional Rendering**
- If `pdfUrl` exists: Display PDF in iframe
- If no PDF: Show "PDF Problem Statement Not Found" message

## Expected Results

After the fix:
- ✅ Problem page loads correctly with proper problem details
- ✅ PDF problems display in the left panel via iframe 
- ✅ Problem metadata (name, difficulty, etc.) shows correctly
- ✅ Code submission form works without JavaScript errors
- ✅ No more `toLowerCase` runtime errors

## File Changes Made

1. **`packages/frontend/lib/api-client.ts`**
   - Updated `problems.getById()` to use `details-from-storage` endpoint

2. **`packages/frontend/app/problem/page.tsx`**
   - Added null safety check for `problem.id` in submission handler

3. **Rebuilt and restarted frontend**
   - Applied changes to production environment

## Testing

To verify the fix:
1. Navigate to a problem page: `http://34.143.158.179/problem?id=dynamicprogrammingkevinadventure`
2. Verify PDF loads in left panel
3. Verify no JavaScript console errors
4. Test code submission functionality

The problem page should now load and display content correctly without the previous errors.