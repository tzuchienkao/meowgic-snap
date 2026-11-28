import { getRequestURL, setResponseHeader } from 'h3';

/**
 * robots.txt: keep crawlers on the public home page (member pages and the login callback are not
 * for search results) and point them at the sitemap on the requested origin.
 */
const DISALLOWED_PATHS = ['/auth/', '/dashboard', '/logs', '/settings'];

export default defineEventHandler((event) => {
  const { origin } = getRequestURL(event);
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return [
    'User-Agent: *',
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
});
