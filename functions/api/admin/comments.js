/**
 * Admin comments management
 * GET /api/admin/comments - List pending comments
 * POST /api/admin/comments - Approve/reject a comment
 */

const ADMIN_KEY = 'f0b88a4e93b779f0df060a1cf72a703de133cf6514844b8eb9a713d3477ec423';

function checkAuth(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  const key = auth.replace('Bearer ', '');
  return key === ADMIN_KEY;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  
  if (!checkAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const pending = await env.DB.prepare(
    `SELECT c.*, p.title as poem_title 
     FROM comments c 
     LEFT JOIN poems p ON c.poem_slug = p.slug 
     WHERE c.approved = 0 
     ORDER BY c.created_at DESC`
  ).all();
  
  return Response.json({ 
    success: true, 
    comments: pending.results,
    count: pending.results.length
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  
  if (!checkAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { id, action } = await request.json();
    
    if (!id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Missing id or invalid action' }, { status: 400 });
    }
    
    if (action === 'approve') {
      await env.DB.prepare('UPDATE comments SET approved = 1 WHERE id = ?').bind(id).run();
      return Response.json({ success: true, message: 'Comment approved' });
    } else {
      await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
      return Response.json({ success: true, message: 'Comment deleted' });
    }
    
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
