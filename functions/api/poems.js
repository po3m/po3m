/**
 * List published poems for gallery
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const results = await env.DB.prepare(
      'SELECT slug, title, author, date, tags, shader FROM poems WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    
    const poems = (results.results || []).map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      url: `https://po3m.com/poems/${p.slug}`
    }));
    
    return new Response(JSON.stringify({ poems }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, poems: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}