export async function onRequestGet(context) {
  const { env } = context;

  const result = await env.DB.prepare(
    "SELECT slug, date FROM poems WHERE published = 1 ORDER BY date DESC"
  ).all();

  const staticUrls = [
    { loc: "https://po3m.com/", priority: "1.0", changefreq: "daily" },
    { loc: "https://po3m.com/about/", priority: "0.8", changefreq: "monthly" },
    { loc: "https://po3m.com/terms/", priority: "0.3", changefreq: "yearly" },
    { loc: "https://po3m.com/submit/", priority: "0.5", changefreq: "monthly" },
  ];

  const poemUrls = (result.results || []).map(poem => ({
    loc: "https://po3m.com/poems/" + poem.slug,
    lastmod: poem.date,
    priority: "0.9",
    changefreq: "monthly",
  }));

  const allUrls = [...staticUrls, ...poemUrls];

  const urlEntries = allUrls.map(u => {
    const lastmod = u.lastmod ? "\n    <lastmod>" + u.lastmod + "</lastmod>" : "";
    return "  <url>\n    <loc>" + u.loc + "</loc>" + lastmod + "\n    <changefreq>" + u.changefreq + "</changefreq>\n    <priority>" + u.priority + "</priority>\n  </url>";
  }).join("\n");

  const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + urlEntries + "\n</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
