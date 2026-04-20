/**
 * Admin: Reject a pending poem
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
    
    // Mark as rejected
    const result = await env.DB.prepare(
      'UPDATE pending_poems SET status = ? WHERE id = ? AND status = ?'
    ).bind('rejected', id, 'pending').run();
    
    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Poem not found or already processed' }, 404);
    }
    
    return jsonResponse({
      success: true,
      message: 'Poem rejected'
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