// robots.js
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://env-guardd.vercel.app/sitemap.xml',
  };
}