/**
 * Admin endpoint to delete poems by slug
 */

const ADMIN_KEY = 'f0b88a4e93b779f0df060a1cf72a703de133cf6514844b8eb9a713d3477ec423';

function checkAuth(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  const key = auth.replace('Bearer ', '');
  return key === ADMIN_KEY;
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const slug = params.slug;
  
  if (!checkAuth(request)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  if (!slug) {
    return new Response('Slug required', { status: 400 });
  }
  
  try {
    const result = await env.DB.prepare(
      'DELETE FROM poems WHERE slug = ?'
    ).bind(slug).run();
    
    if (result.changes === 0) {
      return new Response('Poem not found', { status: 404 });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Poem "${slug}" deleted`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    return new Response('Server error', { status: 500 });
  }
}