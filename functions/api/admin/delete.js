/**
 * Admin endpoint to delete poems
 */

export async function onRequestDelete(context) {
  const { request, env } = context;
  
  // Check authorization
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const token = authHeader.substring(7);
  if (token !== env.API_KEY) {
    return new Response('Invalid token', { status: 401 });
  }
  
  const url = new URL(request.url);
  const slug = url.pathname.split('/').pop();
  
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