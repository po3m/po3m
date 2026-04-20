/**
 * Po3m.com Submission API
 * Cloudflare Worker for poem submissions
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Verify API key
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Missing API key' }, 401);
    }
    
    const apiKey = authHeader.slice(7);
    const contributor = await verifyApiKey(env.DB, apiKey);
    if (!contributor) {
      return jsonResponse({ success: false, error: 'Invalid API key' }, 401);
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }
    
    // Validate required fields
    if (!body.title || !body.poem) {
      return jsonResponse({ 
        success: false, 
        error: 'Missing required fields: title and poem' 
      }, 400);
    }
    
    // Generate slug from title
    const slug = generateSlug(body.title);
    
    // Check for duplicate slug
    const existing = await env.DB.prepare(
      'SELECT id FROM poems WHERE slug = ?'
    ).bind(slug).first();
    
    if (existing) {
      return jsonResponse({ 
        success: false, 
        error: 'A poem with this title already exists' 
      }, 409);
    }
    
    // Insert poem
    const shader = body.shader || 'aurora';
    const tags = JSON.stringify(body.tags || []);
    const date = body.date || new Date().toISOString().split('T')[0];
    
    await env.DB.prepare(`
      INSERT INTO poems (slug, title, author, poem, shader, tags, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(slug, body.title, contributor.id, body.poem, shader, tags, date).run();
    
    const url = `https://po3m.com/poems/${slug}`;
    
    return jsonResponse({
      success: true,
      slug,
      url,
      message: 'Poem published successfully'
    }, 201);
    
  } catch (err) {
    return jsonResponse({ 
      success: false, 
      error: 'Internal error: ' + err.message 
    }, 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    
    // List poems
    const author = url.searchParams.get('author');
    const tag = url.searchParams.get('tag');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    let query = 'SELECT slug, title, author, date, tags FROM poems WHERE published = 1';
    const params = [];
    
    if (author) {
      query += ' AND author = ?';
      params.push(author);
    }
    
    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();
    
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM poems WHERE published = 1'
    ).first();
    
    const poems = (results.results || []).map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      url: `https://po3m.com/poems/${p.slug}`
    }));
    
    return jsonResponse({
      poems,
      total: countResult?.total || 0,
      limit,
      offset
    });
    
  } catch (err) {
    return jsonResponse({ 
      success: false, 
      error: 'Internal error: ' + err.message 
    }, 500);
  }
}

// Helper functions

async function verifyApiKey(db, apiKey) {
  try {
    // Hash the provided API key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const result = await db.prepare(
      'SELECT id, name, type FROM contributors WHERE api_key_hash = ? AND active = 1'
    ).bind(hashHex).first();
    
    return result;
  } catch (err) {
    console.error('verifyApiKey error:', err);
    return null;
  }
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}