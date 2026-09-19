/**
 * Static QA pass over the built site.
 *
 *   node tools/audit.js
 *
 * Checks every page for SEO basics, heading structure, image alt text,
 * unresolved template tokens, and internal links that go nowhere.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'website');
const problems = [];
const stats = { pages: 0, links: 0, images: 0 };

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const pages = walk(ROOT);

/** Resolve an internal href to a file on disk. */
function resolveHref(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return path.join(ROOT, 'index.html');
  const asFile = path.join(ROOT, clean);
  if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return asFile;
  const asDir = path.join(ROOT, clean, 'index.html');
  if (fs.existsSync(asDir)) return asDir;
  return null;
}

for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  stats.pages++;

  const add = (message) => problems.push(`${rel}: ${message}`);

  // Template tokens
  const leftovers = html.match(/\{\{[^}]{1,60}\}\}/g);
  if (leftovers) add(`unresolved token ${[...new Set(leftovers)].slice(0, 3).join(', ')}`);

  // Title and description
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title) add('missing <title>');
  else if (title.length > 65) add(`title ${title.length} chars (over 65): ${title}`);

  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!desc) add('missing meta description');
  else if (desc.length > 165) add(`meta description ${desc.length} chars (over 165)`);
  else if (desc.length < 50) add(`meta description only ${desc.length} chars`);

  if (!/rel="canonical"/.test(html)) add('missing canonical');
  if (!/property="og:image"/.test(html)) add('missing og:image');
  if (!/<html lang="en-UG">/.test(html)) add('missing or wrong lang attribute');

  // Headings
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length === 0) add('no h1');
  if (h1s.length > 1) add(`${h1s.length} h1 elements`);

  // Images
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  imgs.forEach((img) => {
    stats.images++;
    if (!/\balt=/.test(img)) add(`img without alt: ${img.slice(0, 80)}`);
    if (!/\bwidth=/.test(img) || !/\bheight=/.test(img)) add(`img without dimensions: ${img.slice(0, 80)}`);
  });

  // Internal links
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  hrefs.forEach((href) => {
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('data:')) return;
    stats.links++;
    if (href.endsWith('.css') || href.endsWith('.woff2') || href.endsWith('.png')) {
      if (!fs.existsSync(path.join(ROOT, href.split('?')[0]))) add(`missing asset ${href}`);
      return;
    }
    if (!resolveHref(href)) add(`dead link ${href}`);
  });

  // Scripts, stylesheets and every responsive source referenced
  [...html.matchAll(/src="(\/assets\/[^"]+)"/g)].forEach((m) => {
    if (!fs.existsSync(path.join(ROOT, m[1]))) add(`missing asset ${m[1]}`);
  });

  [...html.matchAll(/srcset="([^"]+)"/g)].forEach((m) => {
    m[1]
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter((url) => url.startsWith('/assets/'))
      .forEach((url) => {
        const width = Number((url.match(/-(\d+)\.(jpg|webp)$/) || [])[1]);
        if (width > 1800) add(`srcset image wider than 1800px: ${url}`);
        if (!fs.existsSync(path.join(ROOT, url))) add(`missing srcset image ${url}`);
      });
  });

  // Buttons should have a label
  const buttons = html.match(/<button\b[^>]*>\s*<\/button>/g) || [];
  if (buttons.length) add(`${buttons.length} empty button(s)`);
}

console.log(`Audited ${stats.pages} pages, ${stats.links} internal links, ${stats.images} images.`);
if (!problems.length) {
  console.log('No problems found.');
} else {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 60).forEach((p) => console.log('  - ' + p));
  if (problems.length > 60) console.log(`  ... and ${problems.length - 60} more`);
}
