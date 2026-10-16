const fs = require('fs'), path = require('path');
const specs = ['a','b','c','d'].flatMap((k) => JSON.parse(fs.readFileSync(path.join(__dirname, 'intake-' + k + '.json'), 'utf8')));
const slugify = (s) => s.toLowerCase().replace(/\+/g,' plus ').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

// How to use, written once per format rather than repeated per product.
const HOW = {
  Sunscreen: ['Apply generously as the last step of your morning routine.','Wait a few minutes before makeup.','Reapply every two to three hours outdoors.'],
  Foam: ['Lather in wet hands and massage over damp skin.','Rinse with lukewarm water.','Use morning and evening.'],
  Balm: ['Massage over dry skin to dissolve makeup and sunscreen.','Add water to emulsify, then rinse.','Follow with a second cleanse in the evening.'],
  Toner: ['Press onto clean skin with your hands or a cotton pad.','Use morning and evening after cleansing.','Follow with your serum and moisturiser.'],
  Serum: ['Apply to clean skin after toner, before moisturiser.','Three to four drops covers the face.','Press in rather than rubbing.','Seal with a moisturiser, and sunscreen in the morning.'],
  Ampoule: ['Apply after toner, before your moisturiser.','Two or three drops, pressed into the skin.','Follow with a moisturiser and daily sunscreen.'],
  Cream: ['Apply to clean, slightly damp skin as the last step.','Use morning and evening.','Press a second layer onto dry patches.','Follow with sunscreen in the morning.'],
  Lotion: ['Smooth over clean skin as the final step.','Use morning and evening.','Follow with sunscreen in the morning.'],
  'Treatment liquid': ['Wipe or apply over clean skin, avoiding the eye area.','Start two or three nights a week and build up.','Follow with a moisturiser, and sunscreen the next morning.'],
  Mask: ['Apply an even layer to clean skin as the last step.','Leave on overnight, or for the time on the pack.','Rinse with lukewarm water.','Use two or three times a week.'],
  Mist: ['Hold about 20 cm away and mist over the skin.','Use any time through the day, over or under makeup.','Press in rather than letting it dry on its own.'],
  Soap: ['Wet the skin and work the bar into a lather.','Leave the lather on for a minute or two.','Rinse thoroughly.','Follow with a moisturiser.'],
  Scrub: ['Massage onto damp skin in small circles.','Avoid broken or irritated skin.','Rinse thoroughly.','Use once or twice a week.'],
  'Body wash': ['Work into a lather on wet skin.','Leave on for a minute where you want it to work hardest.','Rinse thoroughly and follow with a body lotion.'],
  Oil: ['Warm a few drops between the palms.','Smooth over damp skin after a shower.','Use as much as the skin will take.'],
  'Lip oil': ['Sweep over bare or made-up lips.','Reapply through the day as often as you like.','Can be worn overnight.'],
  'Lip tint': ['Apply to the centre of the lips and blend outwards.','Build a second layer for more colour.','Let it set for a moment before pressing the lips together.'],
  Supplement: ['Follow the serving directions printed on the pack.','Take consistently rather than occasionally.','Keep sealed, cool and out of direct sunlight.'],
  Set: ['Use the steps in the order printed on the box.','Each piece is a travel or starter size, meant to be finished.','Patch test anything new before using it on the whole face.']
};

const skuPrefix = (brand) => 'BC-' + (brand || 'XXX').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3).padEnd(3,'X');
const taken = {};
const nextSku = (brand) => { const p = skuPrefix(brand); taken[p] = (taken[p] || 400) + 1; return p + '-' + taken[p]; };

const out = specs.map((s) => {
  const slug = slugify((s.b ? s.b + ' ' : '') + s.n);
  const how = HOW[s.fmt];
  if (!how) throw new Error('no how-to-use template for format: ' + s.fmt);
  const desc = s.d.slice();
  if (s.size) desc.push('Size: ' + s.size + '.');
  return {
    slug, sku: nextSku(s.b), name: s.n, brand: s.b || '',
    category: s.cat, format: s.fmt,
    skinTypes: s.st || [], concerns: s.cn || [], keyIngredients: s.ki || [],
    excerpt: s.ex, description: desc, howToUse: how,
    caution: s.caution || null, flag: s.flag || null,
    shots: s.idx.length
  };
});
const slugs = new Set(); for (const p of out) { if (slugs.has(p.slug)) throw new Error('duplicate slug: ' + p.slug); slugs.add(p.slug); }
fs.writeFileSync(path.join(__dirname, 'intake-payload.json'), JSON.stringify(out));
console.log(out.length + ' products, ' + out.reduce((n,p)=>n+p.shots,0) + ' images, ' + out.filter(p=>p.flag).length + ' flagged');
