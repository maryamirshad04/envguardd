const supabase = require('../config/supabase');

function maskEmail(email) {
  if (!email) return 'unknown';
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;
  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex);
  if (local.length <= 3) {
    return '***' + domain;
  }
  return local.substring(0, 3) + '***' + domain;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function generateUniqueSlug(base, table, column = 'slug') {
  const slug = slugify(base) || 'untitled';
  let unique = slug;
  let counter = 1;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, unique)
      .maybeSingle();
    if (error) throw error;
    if (!data) break;
    unique = `${slug}-${counter}`;
    counter++;
  }
  return unique;
}

module.exports = { maskEmail, slugify, generateUniqueSlug };