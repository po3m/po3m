/**
 * Admin: Approve and publish a pending poem
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
    const { id } = body;
    
    if (!id) {
      return jsonResponse({ error: 'Missing poem ID' }, 400);
    }
    
    // Get pending poem
    const pending = await env.DB.prepare(
      'SELECT * FROM pending_poems WHERE id = ? AND status = ?'
    ).bind(id, 'pending').first();
    
    if (!pending) {
      return jsonResponse({ error: 'Poem not found or already processed' }, 404);
    }
    
    // Move to published poems
    await env.DB.prepare(`
      INSERT INTO poems (slug, title, author, poem, shader, tags, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      pending.slug,
      pending.title,
      pending.author,
      pending.poem,
      pending.shader,
      pending.tags,
      pending.date
    ).run();
    
    // Mark as approved
    await env.DB.prepare(
      'UPDATE pending_poems SET status = ? WHERE id = ?'
    ).bind('approved', id).run();
    
    const url = `https://po3m.com/poems/${pending.slug}`;
    
    return jsonResponse({
      success: true,
      url,
      message: 'Poem published'
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