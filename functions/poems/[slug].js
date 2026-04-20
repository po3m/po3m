/**
 * Dynamic poem page renderer
 */

export async function onRequestGet(context) {
  const { params, env } = context;
  const slug = params.slug;
  
  try {
    const poem = await env.DB.prepare(
      'SELECT * FROM poems WHERE slug = ? AND published = 1'
    ).bind(slug).first();
    
    if (!poem) {
      return new Response('Poem not found', { status: 404 });
    }
    
    const tags = JSON.parse(poem.tags || '[]');
    const html = renderPoem(poem, tags);
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

function renderPoem(poem, tags) {
  const shaderColors = {
    aurora: ['#1a0a2e', '#16213e', '#0f3460', '#1a1a2e'],
    waves: ['#0a1628', '#0d2137', '#0f3460', '#1a3a5c'],
    mist: ['#1a1a1a', '#2d2d2d', '#1f1f2e', '#252530'],
    stars: ['#000010', '#0a0a1a', '#050515', '#0a0a20'],
    ink: ['#0a0a0a', '#1a0a1a', '#0a0a15', '#150a15']
  };
  
  const colors = shaderColors[poem.shader] || shaderColors.aurora;
  const poemHtml = escapeHtml(poem.poem).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(poem.title)} — Po3m</title>
    <meta name="description" content="A poem by ${escapeHtml(poem.author)}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Georgia', serif;
            min-height: 100vh;
            color: #e8e8e8;
            line-height: 1.8;
            overflow-x: hidden;
        }
        
        .bg {
            position: fixed;
            inset: 0;
            z-index: -1;
            background: linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]});
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 4rem 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .back {
            position: fixed;
            top: 2rem;
            left: 2rem;
            color: rgba(255,255,255,0.4);
            text-decoration: none;
            font-size: 0.9rem;
        }
        .back:hover { color: rgba(255,255,255,0.7); }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }
        
        .meta {
            color: rgba(255,255,255,0.5);
            font-size: 0.95rem;
            margin-bottom: 2.5rem;
        }
        
        .poem {
            font-size: 1.15rem;
            line-height: 2;
            text-shadow: 0 1px 10px rgba(0,0,0,0.3);
        }
        
        .poem p {
            margin-bottom: 1.5rem;
        }
        
        .tags {
            margin-top: 3rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .tag {
            font-size: 0.75rem;
            background: rgba(255,255,255,0.08);
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            color: rgba(255,255,255,0.5);
        }
        
        footer {
            margin-top: 4rem;
            text-align: center;
            color: rgba(255,255,255,0.3);
            font-size: 0.85rem;
        }
        
        footer a { color: rgba(255,255,255,0.4); }
    </style>
</head>
<body>
    <div class="bg"></div>
    <a href="/" class="back">← Po3m</a>
    
    <div class="container">
        <h1>${escapeHtml(poem.title)}</h1>
        <div class="meta">by ${escapeHtml(poem.author)} · ${poem.date}</div>
        
        <div class="poem">
            <p>${poemHtml}</p>
        </div>
        
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        
        <footer>
            <p><a href="/">Po3m.com</a></p>
        </footer>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}