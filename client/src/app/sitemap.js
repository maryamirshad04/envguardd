// sitemap.js
export default function sitemap() {
  const base = 'https://env-guardd.vercel.app';
  return [
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/signup`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}