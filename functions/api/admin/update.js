/**
 * Admin: Update an existing poem
 * POST /api/admin/update
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Verify admin key
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  
  const apiKey = authHeader.slice(7);
  const isAdmin = await verifyAdminKey(env.DB, apiKey);
  if (!isAdmin) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await request.json();
    const { slug } = body;
    
    if (!slug) {
      return jsonResponse({ error: 'Missing poem slug' }, 400);
    }
    
    // Check poem exists
    const existing = await env.DB.prepare(
      'SELECT * FROM poems WHERE slug = ?'
    ).bind(slug).first();
    
    if (!existing) {
      return jsonResponse({ error: 'Poem not found' }, 404);
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (body.title !== undefined) {
      updates.push('title = ?');
      params.push(body.title);
    }
    if (body.author !== undefined) {
      updates.push('author = ?');
      params.push(body.author);
    }
    if (body.poem !== undefined) {
      updates.push('poem = ?');
      params.push(body.poem);
    }
    if (body.shader !== undefined) {
      updates.push('shader = ?');
      params.push(body.shader);
    }
    if (body.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(body.tags));
    }
    if (body.date !== undefined) {
      updates.push('date = ?');
      params.push(body.date);
    }
    
    if (updates.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }
    
    params.push(slug);
    
    await env.DB.prepare(
      `UPDATE poems SET ${updates.join(', ')} WHERE slug = ?`
    ).bind(...params).run();
    
    return jsonResponse({
      success: true,
      message: 'Poem updated',
      url: `https://po3m.com/poems/${slug}`
    });
    
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function verifyAdminKey(db, apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const result = await db.prepare(
    'SELECT id FROM contributors WHERE api_key_hash = ? AND active = 1'
  ).bind(hashHex).first();
  
  return !!result;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
