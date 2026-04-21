/**
 * Comments API
 * GET /api/comments?poem=slug - Get approved comments for a poem
 * POST /api/comments - Submit a new comment (goes to approval queue)
 */

const TELEGRAM_BOT_TOKEN = '8700018763:AAGtgEyJs-A7nSSXuVMp0IZAO3Zdsq6WL0o';
const TELEGRAM_CHAT_ID = '1595370867'; // Dr Gi's chat ID

async function notifyTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.log('Telegram notification failed:', e);
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const poemSlug = url.searchParams.get('poem');
  
  if (!poemSlug) {
    return Response.json({ error: 'Missing poem parameter' }, { status: 400 });
  }
  
  const comments = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE poem_slug = ? AND approved = 1 ORDER BY created_at ASC'
  ).bind(poemSlug).all();
  
  return Response.json({ 
    success: true, 
    comments: comments.results,
    count: comments.results.length
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  
  try {
    const data = await request.json();
    const { poem_slug, author_name, body, honeypot } = data;
    
    // Honeypot check
    if (honeypot) {
      return Response.json({ success: true, message: 'Comment submitted' }); // Silent fail for bots
    }
    
    if (!poem_slug || !body || body.trim().length < 2) {
      return Response.json({ error: 'Missing poem_slug or body' }, { status: 400 });
    }
    
    if (body.length > 2000) {
      return Response.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 });
    }
    
    // Verify poem exists
    const poem = await env.DB.prepare('SELECT slug, title FROM poems WHERE slug = ?').bind(poem_slug).first();
    if (!poem) {
      return Response.json({ error: 'Poem not found' }, { status: 404 });
    }
    
    // Insert comment (pending approval)
    await env.DB.prepare(
      'INSERT INTO comments (poem_slug, author_name, body, approved) VALUES (?, ?, ?, 0)'
    ).bind(poem_slug, author_name?.trim() || 'Anonymous', body.trim()).run();
    
    // Send Telegram notification
    const authorDisplay = author_name?.trim() || 'Anonymous';
    const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;
    await notifyTelegram(
      `💬 <b>New comment on Po3m</b>\n\n` +
      `On: <i>${poem.title}</i>\n` +
      `From: ${authorDisplay}\n\n` +
      `"${preview}"\n\n` +
      `<a href="https://po3m.com/admin">Review →</a>`
    );
    
    return Response.json({ 
      success: true, 
      message: 'Comment submitted for review',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
