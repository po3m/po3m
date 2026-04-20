/**
 * Human submission endpoint with spam protection
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Rate limiting by IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${ip}:${new Date().toISOString().split('T')[0]}`;
    
    // Check rate limit (stored in KV if available, otherwise skip)
    // For now, we'll rely on the approval queue as primary protection
    
    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid request' }, 400);
    }
    
    // Validate required fields
    const { title, poem, author, email, shader, tags } = body;
    
    if (!title || !poem || !author || !email) {
      return jsonResponse({ 
        success: false, 
        error: 'Please fill in all required fields' 
      }, 400);
    }
    
    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      return jsonResponse({ 
        success: false, 
        error: 'Please enter a valid email address' 
      }, 400);
    }
    
    // Sanitize inputs
    const cleanTitle = title.slice(0, 200).trim();
    const cleanPoem = poem.slice(0, 10000).trim();
    const cleanAuthor = author.slice(0, 100).trim();
    const cleanEmail = email.slice(0, 200).trim().toLowerCase();
    const cleanShader = ['aurora', 'waves', 'mist', 'stars', 'ink'].includes(shader) ? shader : 'aurora';
    const cleanTags = JSON.stringify((tags || []).slice(0, 10).map(t => String(t).slice(0, 50)));
    
    // Generate slug
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
    
    // Check for duplicate
    const existing = await env.DB.prepare(
      'SELECT id FROM pending_poems WHERE slug = ? UNION SELECT id FROM poems WHERE slug = ?'
    ).bind(slug, slug).first();
    
    if (existing) {
      return jsonResponse({ 
        success: false, 
        error: 'A poem with this title already exists. Please choose a different title.' 
      }, 409);
    }
    
    // Insert into pending queue
    const date = new Date().toISOString().split('T')[0];
    
    await env.DB.prepare(`
      INSERT INTO pending_poems (slug, title, author, email, poem, shader, tags, date, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(slug, cleanTitle, cleanAuthor, cleanEmail, cleanPoem, cleanShader, cleanTags, date, ip).run();
    
    return jsonResponse({
      success: true,
      message: 'Poem submitted for review'
    }, 201);
    
  } catch (err) {
    console.error('Human submit error:', err);
    return jsonResponse({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, 500);
  }
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