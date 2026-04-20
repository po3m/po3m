/**
 * Dynamic poem page renderer with animated shader backgrounds
 */

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const slug = params.slug;
  
  // Let static assets pass through (like .jsx files)
  if (slug.includes('.')) {
    return env.ASSETS.fetch(request);
  }
  
  try {
    const poem = await env.DB.prepare(
      'SELECT * FROM poems WHERE slug = ? AND published = 1'
    ).bind(slug).first();
    
    if (!poem) {
      return new Response('Poem not found', { status: 404 });
    }
    
    // For custom shader poems, redirect to static animation page
    if (poem.shader === 'custom') {
      const staticMap = {
        'the-echoing-moment': '/static/echoing-moment-animation.html',
        'the-armor-shed': '/static/armor-shed-animation.html'
      };
      
      if (staticMap[slug]) {
        const staticUrl = new URL(request.url);
        staticUrl.pathname = staticMap[slug];
        const staticResponse = await env.ASSETS.fetch(new Request(staticUrl.toString()));
        if (staticResponse.status === 200) {
          return new Response(staticResponse.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      }
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
  const shaderConfigs = {
    aurora: { colors: ['#1a0a2e', '#16213e', '#0f3460', '#533483'], particleColor: '100, 200, 150' },
    waves: { colors: ['#0a1628', '#0d2137', '#0f3460', '#1a5276'], particleColor: '100, 180, 255' },
    mist: { colors: ['#1a1a2a', '#2d2d3d', '#1f1f3e', '#252540'], particleColor: '200, 200, 220' },
    stars: { colors: ['#000015', '#0a0a2a', '#050520', '#0a0a30'], particleColor: '255, 255, 255' },
    ink: { colors: ['#0a0a12', '#1a0a1a', '#0a0a20', '#150a20'], particleColor: '150, 100, 200' }
  };
  
  const config = shaderConfigs[poem.shader] || shaderConfigs.aurora;
  const colors = config.colors;
  const particleColor = config.particleColor;
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
        body { font-family: 'Georgia', serif; min-height: 100vh; color: #e8e8e8; line-height: 1.8; overflow-x: hidden; }
        canvas { position: fixed; inset: 0; z-index: -1; }
        .container { max-width: 700px; margin: 0 auto; padding: 4rem 2rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; position: relative; z-index: 1; }
        .back { position: fixed; top: 2rem; left: 2rem; color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.9rem; z-index: 10; }
        .back:hover { color: rgba(255,255,255,0.7); }
        h1 { font-size: 2.5rem; font-weight: 300; margin-bottom: 0.5rem; text-shadow: 0 2px 20px rgba(0,0,0,0.5); }
        .meta { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin-bottom: 2.5rem; }
        .poem { font-size: 1.15rem; line-height: 2; text-shadow: 0 1px 10px rgba(0,0,0,0.3); }
        .poem p { margin-bottom: 1.5rem; }
        .tags { margin-top: 3rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .tag { font-size: 0.75rem; background: rgba(255,255,255,0.08); padding: 0.3rem 0.8rem; border-radius: 20px; color: rgba(255,255,255,0.5); }
        footer { margin-top: 4rem; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem; }
        footer a { color: rgba(255,255,255,0.4); }
    </style>
</head>
<body>
    <canvas id="bg"></canvas>
    <a href="/" class="back">← Po3m</a>
    <div class="container">
        <h1>${escapeHtml(poem.title)}</h1>
        <div class="meta">by ${escapeHtml(poem.author)} · ${poem.date}</div>
        <div class="poem"><p>${poemHtml}</p></div>
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <footer><p><a href="/">Po3m.com</a></p></footer>
    </div>
    <script>
        const canvas = document.getElementById('bg'), ctx = canvas.getContext('2d');
        let w, h; const particles = [];
        const colors = ${JSON.stringify(colors)};
        const particleRGB = '${particleColor}';
        function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
        function createParticle() { return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, size: Math.random() * 3 + 1, alpha: Math.random() * 0.5 + 0.2 }; }
        function init() { resize(); for (let i = 0; i < 60; i++) particles.push(createParticle()); }
        let gradientAngle = 0;
        function draw() {
            gradientAngle += 0.002;
            const gx = Math.cos(gradientAngle) * w + w/2, gy = Math.sin(gradientAngle) * h + h/2;
            const gradient = ctx.createRadialGradient(gx, gy, 0, w/2, h/2, Math.max(w, h));
            colors.forEach((c, i) => gradient.addColorStop(i / (colors.length - 1), c));
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + particleRGB + ', ' + p.alpha + ')'; ctx.fill();
            });
            requestAnimationFrame(draw);
        }
        window.addEventListener('resize', resize); init(); draw();
    </script>
</body>
</html>`;
}

function escapeHtml(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
