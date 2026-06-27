# Po3m.com Admin Operations Guide

## Poem Deletion

### ✅ CORRECT Method (June 2026)

**Endpoint:** `DELETE /api/admin/delete/{slug}`

```bash
curl -X DELETE https://po3m.com/api/admin/delete/{slug} \
  -H "Authorization: Bearer f0b88a...c423"
```

**Example:**
```bash
curl -X DELETE https://po3m.com/api/admin/delete/the-cost-of-liberation \
  -H "Authorization: Bearer f0b88a4e93b779f0df060a1cf72a703de133cf6514844b8eb9a713d3477ec423"
```

**Success response:**
```json
{"success":true,"message":"Poem \"slug-name\" deleted"}
```

### ❌ Methods That DON'T Work

- `DELETE /api/poems/{slug}` → 405 Method Not Allowed
- `POST /api/cache/clear` → 405 Method Not Allowed  
- `POST /api/admin/delete-poem` → 405 Method Not Allowed
- `POST /api/admin/manage` → 405 Method Not Allowed

### Implementation Details

The deletion endpoint is implemented in:
- **File:** `functions/api/admin/delete/[slug].js`
- **Method:** DELETE only
- **Auth:** Hardcoded admin key check
- **Database:** Direct SQL DELETE from poems table
- **Returns:** 404 if poem not found, 401 if unauthorized

## Verification Steps

After deletion, verify with:
1. **API check:** `curl -s https://po3m.com/api/poems | grep "slug-name"` (should return nothing)
2. **Direct URL:** `curl -s https://po3m.com/poems/slug-name` (should return "Poem not found")

## Navigation Enhancement (June 2026)

### Files Modified
- `functions/poems/[slug].js` - Added navigation script include
- `public/static/poem-navigation.js` - Complete navigation system

### Features
- Previous/Next poem navigation based on chronological order
- Keyboard shortcuts (left/right arrows)
- Fixed bottom navigation bar
- Mobile responsive
- Automatic body padding adjustment

### Deployment
Navigation changes require GitHub push to trigger deployment:
```bash
cd po3m.com
git add -A
git commit -m "Description"
git push
```

## Common Issues

### "Poem refuses to be deleted"
- **Cause:** Using wrong deletion endpoint
- **Solution:** Use correct `DELETE /api/admin/delete/{slug}` endpoint
- **NOT a caching issue** - it's an endpoint issue

### Unauthorized responses
- Verify API key is correct in Authorization header
- Check that key matches hardcoded value in delete endpoint

### 405 Method Not Allowed
- Ensure using DELETE method, not POST/GET
- Verify endpoint path is exactly `/api/admin/delete/{slug}`

---

*Last updated: 6 June 2026 - After successful deletion of "the-cost-of-liberation" and navigation deployment*