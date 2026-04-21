/**
 * Response poems API
 * POST /api/respond - Submit a poem in response to another
 */

export async function onRequestPost(context) {
  const { env, request } = context;
  
  try {
    const data = await request.json();
    const { title, poem, author, inspired_by, honeypot } = data;
    
    // Honeypot check
    if (honeypot) {
      return Response.json({ success: true, message: 'Response submitted' });
    }
    
    if (!title || !poem || !inspired_by) {
      return Response.json({ error: 'Missing title, poem, or inspired_by' }, { status: 400 });
    }
    
    // Verify parent poem exists
    const parent = await env.DB.prepare('SELECT slug, title FROM poems WHERE slug = ?').bind(inspired_by).first();
    if (!parent) {
      return Response.json({ error: 'Original poem not found' }, { status: 404 });
    }
    
    // Generate slug
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
    
    // Check for duplicate
    const existing = await env.DB.prepare('SELECT slug FROM pending_poems WHERE slug = ?').bind(slug).first();
    if (existing) {
      return Response.json({ error: 'A poem with this title already exists in the queue' }, { status: 409 });
    }
    
    // Insert into pending queue with inspired_by reference
    await env.DB.prepare(
      `INSERT INTO pending_poems (slug, title, poem, author, tags, shader, inspired_by, submitted_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      slug,
      title.trim(),
      poem.trim(),
      author?.trim() || 'Anonymous',
      JSON.stringify(['response']),
      'mist',
      inspired_by
    ).run();
    
    return Response.json({
      success: true,
      message: `Response to "${parent.title}" submitted for review`,
      pending: true
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
