# Po3m.com API Reference

## Base URL

```
https://po3m.com/api
```

## Authentication

All requests require an API key in the header:

```
Authorization: Bearer <API_KEY>
```

---

## Endpoints

### Submit Poem

**POST** `/api/submit`

Submit a new poem for publication.

#### Request Body

```json
{
  "title": "The Armor Shed",
  "poem": "What would it take to lie like this again—\nA happy baby, rocking side to side...",
  "shader": "aurora",
  "tags": ["freedom", "vulnerability", "yoga"],
  "date": "2026-04-20"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Poem title |
| poem | string | Yes | Full poem text (newlines preserved) |
| shader | string | No | Visual style (default: "aurora") |
| tags | array | No | Categorization tags |
| date | string | No | Composition date (ISO format, default: today) |

#### Response

**Success (201)**
```json
{
  "success": true,
  "slug": "the-armor-shed",
  "url": "https://po3m.com/poems/the-armor-shed",
  "message": "Poem published successfully"
}
```

**Error (400)**
```json
{
  "success": false,
  "error": "Missing required field: title"
}
```

**Error (401)**
```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**Error (429)**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 3600 seconds."
}
```

---

### List Poems

**GET** `/api/poems`

Retrieve published poems.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| author | string | Filter by contributor ID |
| tag | string | Filter by tag |
| limit | integer | Max results (default: 20, max: 100) |
| offset | integer | Pagination offset |

#### Response

```json
{
  "poems": [
    {
      "slug": "the-armor-shed",
      "title": "The Armor Shed",
      "author": "donutree",
      "date": "2026-04-20",
      "tags": ["freedom", "vulnerability"],
      "url": "https://po3m.com/poems/the-armor-shed"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### Get Poem

**GET** `/api/poems/{slug}`

Retrieve a single poem by slug.

#### Response

```json
{
  "slug": "the-armor-shed",
  "title": "The Armor Shed",
  "author": "donutree",
  "poem": "What would it take to lie like this again—\n...",
  "shader": "aurora",
  "tags": ["freedom", "vulnerability"],
  "date": "2026-04-20",
  "url": "https://po3m.com/poems/the-armor-shed"
}
```

---

## Shaders

Available visual styles:

| Shader | Description |
|--------|-------------|
| aurora | Northern lights, flowing colors |
| waves | Gentle ocean waves |
| mist | Ethereal fog effect |
| stars | Night sky with particles |
| ink | Flowing ink in water |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/submit | 10 requests/hour |
| GET /api/poems | 100 requests/hour |
| GET /api/poems/{slug} | 100 requests/hour |

---

## Example: Submit from CLI

```bash
curl -X POST https://po3m.com/api/submit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Armor Shed",
    "poem": "What would it take to lie like this again—\nA happy baby, rocking side to side...",
    "shader": "aurora",
    "tags": ["freedom", "vulnerability"]
  }'
```

---

*Last updated: 2026-04-20*
