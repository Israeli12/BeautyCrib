// Folds tools/newdata/*.json into src/data/products.json.
// Run: node tools/merge-new-products.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const products = read('src/data/products.json');
const indexMap = read('tools/newdata/index-map.json');

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// How to use, written once per format rather than repeated per product.
const HOW = {
  Toner: [
    'Press onto clean skin with your hands or a cotton pad.',
    'Use morning and evening, straight after cleansing.',
    'Layer a second pass over dry areas.',
    'Follow with your serum and moisturiser.',
  ],
  Essence: [
    'Press onto clean, slightly damp skin after toner.',
    'Use morning and evening.',
    'Pat until it has sunk in rather than rubbing.',
    'Follow with your serum and moisturiser.',
  ],
  Serum: [
    'Apply to clean skin after toner, before moisturiser.',
    'Three to four drops is enough for the whole face.',
    'Press in rather than rubbing.',
    'Seal with a moisturiser, and sunscreen in the morning.',
  ],
  Ampoule: [
    'Apply after toner, before your moisturiser.',
    'Two or three drops, pressed into the skin.',
    'Use morning and evening unless the caution says otherwise.',
    'Follow with a moisturiser and daily sunscreen.',
  ],
  Cream: [
    'Apply to clean, slightly damp skin as the last step.',
    'Use morning and evening.',
    'Press a second layer onto dry patches.',
    'Follow with sunscreen in the morning.',
  ],
  'Gel cream': [
    'Smooth over clean skin as the final step of your routine.',
    'Use morning and evening.',
    'A small amount is enough - it spreads further than a cream.',
    'Follow with sunscreen in the morning.',
  ],
  'Spot treatment': [
    'Dab onto the spot after your serum, before moisturiser.',
    'Use at night to begin with.',
    'Keep it on the spot rather than spreading it.',
    'Wear sunscreen the following day.',
  ],
  'Treatment liquid': [
    'Wipe over clean skin, avoiding the eye area.',
    'Start two or three nights a week and build up.',
    'Use the textured side on areas that need more.',
    'Follow with a moisturiser, and sunscreen the next morning.',
  ],
  Mask: [
    'Apply an even layer to clean skin as the last step.',
    'Leave on overnight, or for the time on the pack.',
    'Rinse with lukewarm water.',
    'Use two or three times a week.',
  ],
  Soap: [
    'Wet the skin and work the bar into a lather.',
    'Leave the lather on for a minute or two.',
    'Rinse thoroughly with clean water.',
    'Follow with a body moisturiser.',
  ],
  Scrub: [
    'Massage onto damp skin in small circles.',
    'Avoid broken or irritated skin.',
    'Rinse thoroughly with lukewarm water.',
    'Use once or twice a week.',
  ],
};

const skuPrefix = (brand) =>
  'BC-' +
  brand
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');

const skuTaken = new Set(products.map((p) => p.sku));
const nextSku = (brand) => {
  const pre = skuPrefix(brand);
  let n = 1;
  while (skuTaken.has(pre + '-' + String(n).padStart(3, '0'))) n += 1;
  const sku = pre + '-' + String(n).padStart(3, '0');
  skuTaken.add(sku);
  return sku;
};

const slugTaken = new Set(products.map((p) => p.slug));

const build = (spec, defaultFolder) => {
  const folder = spec.folder || defaultFolder;
  const files = (spec.idx || []).map((i) => {
    const f = indexMap[folder][i];
    if (!f) throw new Error('no file at ' + folder + '[' + i + '] for ' + spec.n);
    return f;
  });
  if (spec.extraFolder) {
    for (const i of spec.extraIdx) files.push(indexMap[spec.extraFolder][i]);
  }
  const brandSlug = slugify(spec.b);
  let slug = slugify(spec.b + ' ' + spec.n);
  if (slugTaken.has(slug)) slug = slug + '-' + slugify(spec.fmt);
  slugTaken.add(slug);
  const howToUse = HOW[spec.fmt];
  if (!howToUse) throw new Error('no howToUse template for format ' + spec.fmt);
  const out = {
    slug,
    sku: nextSku(spec.b),
    name: spec.n,
    brand: spec.b,
    brandSlug,
    price: null,
    salePrice: null,
    category: 'skincare',
    subcategory: spec.sub,
    format: spec.fmt,
    skinTypes: spec.st,
    concerns: spec.cn,
    keyIngredients: spec.ki,
    match: '\u0000no-fragment-match\u0000',
    matchFiles: files,
    featured: false,
    featuredLarge: false,
    bestSeller: false,
    stock: 'in-stock',
    excerpt: spec.ex,
    description: spec.d,
    benefits: spec.bn,
    howToUse,
  };
  if (spec.caution) out.caution = spec.caution;
  return out;
};

const added = [];
for (const [file, folder] of [
  ['tools/newdata/creams2.json', 'Creams'],
  ['tools/newdata/serums2.json', 'Serums'],
  ['tools/newdata/toners2.json', 'Toners'],
  ['tools/newdata/other2.json', null],
]) {
  for (const spec of read(file)) added.push(build(spec, folder));
}

// Extra photographs that belong to products already in the store.
const EXTRA = {
  'aplb-glutathione-niacinamide-face-cream': ['Creams', [20, 22, 23]],
  'anua-3-ceramide-panthenol-moisture-barrier-cream': ['Creams', [27, 28]],
  'anua-heartleaf-70-daily-lotion': ['Creams', [64]],
};
for (const [slug, [folder, idx]] of Object.entries(EXTRA)) {
  const p = products.find((x) => x.slug === slug);
  if (!p) throw new Error('existing product not found: ' + slug);
  p.matchFiles = [...new Set([...(p.matchFiles || []), ...idx.map((i) => indexMap[folder][i])])];
}

const all = [...products, ...added];
fs.writeFileSync(path.join(root, 'src/data/products.json'), JSON.stringify(all, null, 2) + '\n');

const byCat = {};
for (const p of all) byCat[p.subcategory] = (byCat[p.subcategory] || 0) + 1;
console.log('added ' + added.length + ' products, total ' + all.length);
console.log(byCat);
console.log('unpriced: ' + all.filter((p) => p.price == null).length);
