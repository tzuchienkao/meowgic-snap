import { getRequestURL, setResponseHeader } from 'h3';

/**
 * Pages for search engines: only the public home page (the other pages are for members).
 * URLs use the requested origin, so the sitemap is right on the custom domain and on *.pages.dev.
 */
const PUBLIC_PATHS = ['/'];

export default defineEventHandler((event) => {
  const { origin } = getRequestURL(event);
  const urls = PUBLIC_PATHS.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n');

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
});
