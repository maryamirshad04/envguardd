require('dotenv').config({ path: __dirname + '/../../.env' });

const supabase = require('../config/supabase');
const { generateUniqueSlug } = require('../utils/helpers');

async function backfillSlugs() {
  console.log(' Backfilling slugs for companies...');

  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select('id, name')
    .is('slug', null);

  if (cErr) {
    console.error(' Failed to fetch companies:', cErr.message);
    return;
  }

  for (const company of companies) {
    try {
      const slug = await generateUniqueSlug(company.name, 'companies');
      const { error: updateErr } = await supabase
        .from('companies')
        .update({ slug })
        .eq('id', company.id);
      if (updateErr) {
        console.error(` Failed for company "${company.name}" (${company.id}):`, updateErr.message);
      } else {
        console.log(` Company "${company.name}" → ${slug}`);
      }
    } catch (err) {
      console.error(` Error processing company "${company.name}":`, err.message);
    }
  }

  console.log('\n Backfilling slugs for projects...');
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('id, name')
    .is('slug', null);

  if (pErr) {
    console.error(' Failed to fetch projects:', pErr.message);
    return;
  }

  for (const project of projects) {
    try {
      const slug = await generateUniqueSlug(project.name, 'projects');
      const { error: updateErr } = await supabase
        .from('projects')
        .update({ slug })
        .eq('id', project.id);
      if (updateErr) {
        console.error(` Failed for project "${project.name}" (${project.id}):`, updateErr.message);
      } else {
        console.log(` Project "${project.name}" → ${slug}`);
      }
    } catch (err) {
      console.error(` Error processing project "${project.name}":`, err.message);
    }
  }

  console.log('\n Done!');
}

backfillSlugs().catch((err) => {
  console.error(' Fatal error:', err);
  process.exit(1);
});