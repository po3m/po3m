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
    
    // Password protection (hardcoded for specific poems)
    const protectedPoems = {
      'youre-the-virgo': 'bunnychu'
    };
    
    if (protectedPoems[slug]) {
      const url = new URL(request.url);
      const providedPassword = url.searchParams.get('key');
      
      if (providedPassword !== protectedPoems[slug]) {
        return new Response(renderPasswordPage(poem.title, poem.slug), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
    
    // For custom shader poems, redirect to static animation page
    if (poem.shader === 'custom') {
      const staticMap = {
        'the-echoing-moment': '/static/echoing-moment-animation',
        'the-armor-shed': '/static/armor-shed-animation'
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
    
    // Get comments count
    const commentsResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE poem_slug = ? AND approved = 1'
    ).bind(slug).first();
    const commentsCount = commentsResult?.count || 0;
    
    // Get response poems count
    const responsesResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM poems WHERE inspired_by = ? AND published = 1'
    ).bind(slug).first();
    const responsesCount = responsesResult?.count || 0;
    
    let tags = [];
    try {
      tags = poem.tags ? JSON.parse(poem.tags) : [];
      if (!Array.isArray(tags)) tags = [];
    } catch (e) {
      tags = [];
    }
    const html = renderPoem(poem, tags, commentsCount, responsesCount);
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

function renderPoem(poem, tags, commentsCount, responsesCount) {
  const excerpt = escapeHtml(poem.poem.replace(/<[^>]+>/g, "").replace(/\n/g, " ").replace(/\*/g, "").trim().slice(0, 160));
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
  // Process poem to enable HTML links while preserving formatting.
  // Capture each <a> into an array behind an ASCII sentinel, escape the rest,
  // then restore. Safe for hrefs with underscores, query strings, etc.
  // (the previous placeholder regex broke on any '_' in the URL).
  const links = [];
  let processedPoem = poem.poem.replace(
    /<a\s+[^>]*?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (m, href, text) => '@@LINK' + (links.push({ href, text }) - 1) + 'LINK@@'
  );

  // Now escape all remaining HTML
  processedPoem = escapeHtml(processedPoem);

  // Convert markdown italic *text* to <em>
  processedPoem = processedPoem.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Restore the captured links (href and text both safely escaped)
  processedPoem = processedPoem.replace(/@@LINK(\d+)LINK@@/g, (m, i) => {
    const { href, text } = links[Number(i)];
    return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a>';
  });

  const poemHtml = processedPoem.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  const slug = poem.slug;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(poem.title)} — Po3m</title>
    <meta name="description" content="${excerpt}">
    <meta property="og:title" content="${escapeHtml(poem.title)} — Po3m">
    <meta property="og:description" content="${excerpt}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://po3m.com/poem/${poem.slug}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(poem.title)}">
    <meta name="twitter:description" content="${excerpt}">
    <link rel="canonical" href="https://po3m.com/poem/${poem.slug}">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": "${escapeHtml(poem.title)}",
      "author": { "@type": "Person", "name": "${escapeHtml(poem.author)}" },
      "datePublished": "${poem.date}",
      "description": "${excerpt}",
      "url": "https://po3m.com/poem/${poem.slug}"
    }
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; min-height: 100vh; color: #e8e8e8; line-height: 1.8; overflow-x: hidden; padding-bottom: 80px; }
        canvas { position: fixed; inset: 0; z-index: -1; }
        .container { max-width: 700px; margin: 0 auto; padding: 4rem 2rem; position: relative; z-index: 1; }
        .back { position: fixed; top: 2rem; left: 2rem; color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.9rem; z-index: 10; }
        .back:hover { color: rgba(255,255,255,0.7); }
        h1 { font-size: 2.5rem; font-weight: 300; margin-bottom: 0.5rem; text-shadow: 0 2px 20px rgba(0,0,0,0.5); }
        .meta { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin-bottom: 2.5rem; }
        .poem { font-size: 1.15rem; line-height: 2; text-shadow: 0 1px 10px rgba(0,0,0,0.3); }
        .poem p { margin-bottom: 1.5rem; }
        .tags { margin-top: 3rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .tag { font-size: 0.75rem; background: rgba(255,255,255,0.08); padding: 0.3rem 0.8rem; border-radius: 20px; color: rgba(255,255,255,0.5); }
        
        /* Interaction section */
        .interact { margin-top: 4rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2rem; }
        .interact h2 { font-size: 1.2rem; font-weight: 400; margin-bottom: 1.5rem; color: rgba(255,255,255,0.7); }
        .interact-buttons { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .interact-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #e8e8e8; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.9rem; transition: all 0.2s; }
        .interact-btn:hover { background: rgba(255,255,255,0.15); }
        .interact-btn.active { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.3); }
        
        /* Comment form */
        .comment-form { display: none; margin-bottom: 2rem; }
        .comment-form.visible { display: block; }
        .comment-form textarea { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: #e8e8e8; padding: 1rem; border-radius: 6px; font-family: inherit; font-size: 1rem; min-height: 100px; resize: vertical; }
        .comment-form input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: #e8e8e8; padding: 0.8rem 1rem; border-radius: 6px; font-family: inherit; font-size: 0.95rem; margin-top: 0.8rem; }
        .comment-form button { margin-top: 1rem; background: rgba(100,200,150,0.3); border: 1px solid rgba(100,200,150,0.5); color: #e8e8e8; padding: 0.7rem 1.5rem; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.95rem; }
        .comment-form button:hover { background: rgba(100,200,150,0.5); }
        .honey { position: absolute; left: -9999px; }
        
        /* Response form */
        .response-form { display: none; margin-bottom: 2rem; }
        .response-form.visible { display: block; }
        .response-form textarea { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: #e8e8e8; padding: 1rem; border-radius: 6px; font-family: inherit; font-size: 1rem; min-height: 200px; resize: vertical; }
        .response-form input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: #e8e8e8; padding: 0.8rem 1rem; border-radius: 6px; font-family: inherit; font-size: 0.95rem; margin-top: 0.8rem; }
        .response-form button { margin-top: 1rem; background: rgba(150,100,200,0.3); border: 1px solid rgba(150,100,200,0.5); color: #e8e8e8; padding: 0.7rem 1.5rem; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.95rem; }
        .response-form button:hover { background: rgba(150,100,200,0.5); }
        
        /* Comments list */
        .comments-list { margin-top: 2rem; }
        .comment { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1rem; }
        .comment-author { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem; }
        .comment-body { font-size: 0.95rem; line-height: 1.6; }
        .no-comments { color: rgba(255,255,255,0.4); font-style: italic; }
        
        .status-msg { padding: 0.8rem 1rem; border-radius: 6px; margin-top: 1rem; font-size: 0.9rem; }
        .status-msg.success { background: rgba(100,200,150,0.2); color: rgba(100,200,150,1); }
        .status-msg.error { background: rgba(200,100,100,0.2); color: rgba(200,100,100,1); }
        
        footer { margin-top: 4rem; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem; padding-bottom: 2rem; }
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
        
        <div class="interact">
            <h2>Join the conversation</h2>
            <div class="interact-buttons">
                <button class="interact-btn" onclick="toggleForm('comment')">💬 Comment${commentsCount > 0 ? ` (${commentsCount})` : ''}</button>
                <button class="interact-btn" onclick="toggleForm('response')">✍️ Write a response${responsesCount > 0 ? ` (${responsesCount})` : ''}</button>
            </div>
            
            <div id="comment-form" class="comment-form">
                <textarea id="comment-body" placeholder="Share your thoughts on this poem..."></textarea>
                <input type="text" id="comment-name" placeholder="Your name (optional)">
                <input type="text" class="honey" id="comment-honey" tabindex="-1" autocomplete="off">
                <button onclick="submitComment()">Submit comment</button>
                <div id="comment-status"></div>
            </div>
            
            <div id="response-form" class="response-form">
                <input type="text" id="response-title" placeholder="Title of your response poem">
                <textarea id="response-body" placeholder="Write your response poem here..."></textarea>
                <input type="text" id="response-name" placeholder="Your name (optional)">
                <input type="text" class="honey" id="response-honey" tabindex="-1" autocomplete="off">
                <button onclick="submitResponse()">Submit response poem</button>
                <div id="response-status"></div>
            </div>
            
            <div id="comments-list" class="comments-list"></div>
        </div>
        
        <footer><p><a href="/">Po3m.com</a></p></footer>
    </div>
    
    <script>
        const POEM_SLUG = '${slug}';
        
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
        
        // Interaction functions
        function toggleForm(type) {
            document.getElementById('comment-form').classList.toggle('visible', type === 'comment');
            document.getElementById('response-form').classList.toggle('visible', type === 'response');
        }
        
        async function submitComment() {
            const body = document.getElementById('comment-body').value.trim();
            const name = document.getElementById('comment-name').value.trim();
            const honey = document.getElementById('comment-honey').value;
            const status = document.getElementById('comment-status');
            
            if (!body) { status.innerHTML = '<div class="status-msg error">Please write a comment</div>'; return; }
            
            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ poem_slug: POEM_SLUG, body, author_name: name, honeypot: honey })
                });
                const data = await res.json();
                if (data.success) {
                    status.innerHTML = '<div class="status-msg success">Comment submitted for review — thank you!</div>';
                    document.getElementById('comment-body').value = '';
                } else {
                    status.innerHTML = '<div class="status-msg error">' + (data.error || 'Error submitting') + '</div>';
                }
            } catch (e) {
                status.innerHTML = '<div class="status-msg error">Network error</div>';
            }
        }
        
        async function submitResponse() {
            const title = document.getElementById('response-title').value.trim();
            const poem = document.getElementById('response-body').value.trim();
            const author = document.getElementById('response-name').value.trim();
            const honey = document.getElementById('response-honey').value;
            const status = document.getElementById('response-status');
            
            if (!title || !poem) { status.innerHTML = '<div class="status-msg error">Please add a title and poem</div>'; return; }
            
            try {
                const res = await fetch('/api/respond', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, poem, author, inspired_by: POEM_SLUG, honeypot: honey })
                });
                const data = await res.json();
                if (data.success) {
                    status.innerHTML = '<div class="status-msg success">Response poem submitted for review — thank you!</div>';
                    document.getElementById('response-title').value = '';
                    document.getElementById('response-body').value = '';
                } else {
                    status.innerHTML = '<div class="status-msg error">' + (data.error || 'Error submitting') + '</div>';
                }
            } catch (e) {
                status.innerHTML = '<div class="status-msg error">Network error</div>';
            }
        }
        
        async function loadComments() {
            try {
                const res = await fetch('/api/comments?poem=' + POEM_SLUG);
                const data = await res.json();
                const container = document.getElementById('comments-list');
                if (data.comments && data.comments.length > 0) {
                    container.innerHTML = data.comments.map(c => 
                        '<div class="comment"><div class="comment-author">' + escapeHtml(c.author_name) + ' · ' + new Date(c.created_at).toLocaleDateString() + '</div><div class="comment-body">' + escapeHtml(c.body) + '</div></div>'
                    ).join('');
                } else {
                    container.innerHTML = '<p class="no-comments">No comments yet — be the first!</p>';
                }
            } catch (e) {
                console.log('Failed to load comments');
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        loadComments();
    </script>
    
    <!-- Po3m Navigation Enhancement -->
    <script src="/static/poem-nav-v3.js"></script>
</body>
</html>`;
}

function escapeHtml(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderPasswordPage(title, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Po3m</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; min-height: 100vh; background: #0a0a0f; color: #e8e8e8; display: flex; align-items: center; justify-content: center; }
        .container { text-align: center; padding: 2rem; }
        h1 { font-size: 2rem; font-weight: 300; margin-bottom: 0.5rem; }
        p { color: #888; margin-bottom: 2rem; }
        input { padding: 0.8rem 1.2rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #e8e8e8; font-size: 1rem; width: 250px; text-align: center; }
        button { margin-top: 1rem; padding: 0.8rem 2rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #e8e8e8; cursor: pointer; font-size: 1rem; }
        button:hover { background: rgba(255,255,255,0.15); }
        .back { position: fixed; top: 2rem; left: 2rem; color: rgba(255,255,255,0.4); text-decoration: none; }
    </style>
</head>
<body>
    <a href="/" class="back">← Po3m</a>
    <div class="container">
        <h1>${escapeHtml(title)}</h1>
        <p>This poem is password protected.</p>
        <form onsubmit="go(event)">
            <input type="password" id="pw" placeholder="Enter password" autofocus>
            <br>
            <button type="submit">Unlock</button>
        </form>
    </div>
    <script>
        function go(e) {
            e.preventDefault();
            const pw = document.getElementById('pw').value;
            window.location.href = '/poem/${slug}?key=' + encodeURIComponent(pw);
        }
    </script>
</body>
</html>`;
}
