/**
 * Beauty Crib image pipeline.
 *
 * Source photography lives in the project root and is never modified.
 * This script writes optimised, responsive copies into website/assets/img/.
 *
 *   node tools/images.js
 *
 * Products  : auto-detects the subject, crops to 4:5, emits 400/700/1000/1500px
 * Editorial : fixed crops per usage, emits 600/900/1200/1600px (never upscaled)
 * Formats   : WebP (q78) + JPEG (q80, progressive) for every width
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_PRODUCTS = path.join(ROOT, 'Products');
const OUT = path.join(ROOT, 'website', 'assets', 'img');

const PRODUCT_WIDTHS = [400, 700, 1000, 1500];
const EDITORIAL_WIDTHS = [400, 600, 900, 1200, 1600];

/** base name -> widths actually written, consumed by src/build.js to write srcset. */
const MANIFEST = {};

/* Source filename fragment -> product slug, taken from src/data/products.json
   so a new product only has to be added in one place. */
const PRODUCT_MATCHES = require('../src/data/products.json')
  .filter((p) => p.match)
  .map((p) => [p.match.toLowerCase(), p.slug]);

/**
 * Editorial usage map.
 * crop: {left, top, width, height} in source pixels, applied before resizing.
 * ratio: [w, h] centre-crop applied after any explicit crop.
 */
const EDITORIAL = [
  // Home hero - Beauty Crib bottle, stone courtyard
  { src: 'a_high_fashion_editorial_style_hero_image_for_beauty_crib_skincare._a_stunning.png', out: 'editorial/hero-home', ratio: [16, 9] },
  { src: 'a_high_fashion_editorial_style_hero_image_for_beauty_crib_skincare._a_stunning.png', out: 'editorial/hero-home-portrait', crop: { left: 420, top: 0, width: 760, height: 768 }, ratio: [4, 5] },
  // Philosophy - warm interior. Cropped to exclude the other brand's bottle on the right.
  { src: 'a_high_fashion_editorial_style_hero_image_for_a_premium_skincare_brand._a.png', out: 'editorial/philosophy-hero', crop: { left: 0, top: 0, width: 980, height: 768 } },
  { src: 'premium_skincare_product_photography_for_beauty_crib._a_frosted_glass_bottle_of.png', out: 'editorial/still-life-serum', ratio: [4, 3] },
  // Campaigns
  { src: 'Glass-Skin-Look-for-a-Natural-Glow.jpg', out: 'editorial/campaign-double-cleanse', ratio: [4, 5] },
  { src: 'skincare-content-ideas-glowing-legs.jpg', out: 'editorial/campaign-body', ratio: [4, 5] },
  // Category tiles
  { src: 'Glowing-skin.jpg', out: 'editorial/category-skincare', ratio: [3, 4] },
  { src: 'download-2.jpg', out: 'editorial/category-makeup', ratio: [3, 4] },
  { src: 'Christabel-Arinze.jpg', out: 'editorial/category-hair-care', ratio: [3, 4] },
  { src: 'Natural-Skin-Care-Secrets-for-Glowing-Body-Skin.jpg', out: 'editorial/category-body-care', ratio: [3, 4] },
  { src: '@yvonnecartier_-on-ig.jpg', out: 'editorial/category-fragrance', ratio: [3, 4] },
  { src: 'download.jpg', out: 'editorial/category-beauty-tools', ratio: [3, 4] },
  // Journal
  { src: 'Dewy-Skin-Glow-_-Hyper-Realistic-Beauty-Close-Up.jpg', out: 'editorial/journal-double-cleanse', ratio: [3, 2] },
  { src: 'Why-Your-Skin-Is-Still-Dry-Even-After-Moisturising-And-How-to-Fix-It.jpg', out: 'editorial/journal-choose-cleanser', ratio: [3, 2] },
  { src: 'a-striking-portrait-featuring-a-person-with-highly-moisturized-or-wet-skin-captured-in-a-close-crop.jpg', out: 'editorial/journal-humidity', ratio: [3, 2] },
  { src: 'download-1.jpg', out: 'editorial/journal-spot-fakes', ratio: [3, 2] },
  { src: '🍹.jpg', out: 'editorial/journal-skin-prep', crop: { left: 0, top: 120, width: 545, height: 700 }, ratio: [3, 2] },
  { src: 'Glass-Skin-Look-for-a-Natural-Glow.jpg', out: 'editorial/journal-body-glow', ratio: [3, 2] },
  // Gallery (native aspect, lightly capped)
  { src: 'Glowing-skin.jpg', out: 'gallery/gallery-01' },
  { src: 'Dewy-Skin-Glow-_-Hyper-Realistic-Beauty-Close-Up.jpg', out: 'gallery/gallery-02' },
  { src: 'premium_skincare_product_photography_for_beauty_crib._a_frosted_glass_bottle_of.png', out: 'gallery/gallery-03' },
  { src: 'Christabel-Arinze.jpg', out: 'gallery/gallery-04' },
  { src: 'skincare-content-ideas-glowing-legs.jpg', out: 'gallery/gallery-05' },
  { src: 'a-striking-portrait-featuring-a-person-with-highly-moisturized-or-wet-skin-captured-in-a-close-crop.jpg', out: 'gallery/gallery-06' },
  { src: 'Natural-Skin-Care-Secrets-for-Glowing-Body-Skin.jpg', out: 'gallery/gallery-07' },
  { src: 'download-2.jpg', out: 'gallery/gallery-08' },
  { src: 'Glass-Skin-Look-for-a-Natural-Glow.jpg', out: 'gallery/gallery-09' },
  { src: '@yvonnecartier_-on-ig.jpg', out: 'gallery/gallery-10' },
  { src: 'download.jpg', out: 'gallery/gallery-11' },
  { src: 'Why-Your-Skin-Is-Still-Dry-Even-After-Moisturising-And-How-to-Fix-It.jpg', out: 'gallery/gallery-12' },
  { src: 'a_high_fashion_editorial_style_hero_image_for_beauty_crib_skincare._a_stunning.png', out: 'gallery/gallery-13', ratio: [4, 5], crop: { left: 420, top: 0, width: 760, height: 768 } },
  { src: 'download-1.jpg', out: 'gallery/gallery-14' }
];

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

/** Distance between two RGB triples. */
function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/**
 * Find the bounding box of the product against the studio backdrop.
 * The backdrop colour is sampled from the left and right edge of each row, so this
 * works whether the product is white, blue or green and whatever the sweep's shading.
 */
async function subjectBox(file) {
  const W = 240;
  const { data, info } = await sharp(file).resize({ width: W }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const colHits = new Array(width).fill(0);
  const rowHits = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    // Studio sweeps shade from top to bottom, so compare each row with its own edge pixels
    // rather than with the corners; otherwise whole rows of backdrop count as product.
    const edge = [1, 2, 3, width - 4, width - 3, width - 2].map((x) => px(x, y));
    const bg = [0, 1, 2].map((c) => edge.reduce((s, p) => s + p[c], 0) / edge.length);
    for (let x = 0; x < width; x++) {
      if (dist(px(x, y), bg) > 34) {
        colHits[x]++;
        rowHits[y]++;
      }
    }
  }
  const firstIdx = (arr, limit) => arr.findIndex((v) => v > limit);
  const lastIdx = (arr, limit) => arr.length - 1 - [...arr].reverse().findIndex((v) => v > limit);
  const left = Math.max(0, firstIdx(colHits, height * 0.02));
  const right = Math.min(width - 1, lastIdx(colHits, height * 0.02));
  const top = Math.max(0, firstIdx(rowHits, width * 0.02));
  const bottom = Math.min(height - 1, lastIdx(rowHits, width * 0.02));

  return {
    left: left / width,
    right: right / width,
    top: top / height,
    bottom: bottom / height,
    spread: (right - left) / width
  };
}

/** Write one source buffer out at every width, as WebP and JPEG. */
async function emit(pipeline, outBase, widths, sourceWidth, sourceHeight) {
  const written = [];
  // Never upscale. If the source is smaller than every requested width, or leaves a
  // meaningful gap above the largest one that fits, use its own width as well.
  const fits = widths.filter((w) => w <= sourceWidth * 1.02);
  const planned = fits.length ? [...fits] : [Math.round(sourceWidth)];
  // For a source smaller than the largest requested width, also emit its own
  // width so small photography still has a sharp top end. Never emit anything
  // larger than the requested maximum.
  const requestedMax = Math.max(...widths);
  if (fits.length && sourceWidth < requestedMax && sourceWidth - Math.max(...fits) > 60) {
    planned.push(Math.round(sourceWidth));
  }

  for (const w of planned) {
    const file = path.join(OUT, `${outBase}-${w}`);
    ensureDir(file);
    const base = pipeline.clone().resize({ width: w, withoutEnlargement: true });
    await base.clone().webp({ quality: 78 }).toFile(`${file}.webp`);
    await base.clone().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(`${file}.jpg`);
    written.push(w);
  }
  MANIFEST[outBase] = { widths: written, ratio: Number((sourceHeight / sourceWidth).toFixed(4)) };
  return written;
}

async function buildProducts() {
  const files = [];
  for (const entry of fs.readdirSync(SRC_PRODUCTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(SRC_PRODUCTS, entry.name);
    for (const f of fs.readdirSync(dir)) {
      if (/\.jpe?g$/i.test(f)) files.push(path.join(dir, f));
    }
  }
  const groups = new Map();

  for (const file of files) {
    const lower = path.basename(file).toLowerCase();
    const hit = PRODUCT_MATCHES.find(([fragment]) => lower.includes(fragment));
    if (!hit) {
      console.warn('  ! no slug match:', file);
      continue;
    }
    if (!groups.has(hit[1])) groups.set(hit[1], []);
    groups.get(hit[1]).push(file);
  }

  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [slug, sources] of groups) {
    if (only && !only.includes(slug)) continue;
    const measured = [];
    for (const src of sources) measured.push({ src, box: await subjectBox(src) });
    // The shot that includes the carton spreads wider, so it becomes image 2.
    measured.sort((a, b) => a.box.spread - b.box.spread);

    for (let i = 0; i < measured.length; i++) {
      const { src, box } = measured[i];
      const meta = await sharp(src).metadata();
      // Crop to the subject with breathing room, then square off to 4:5.
      const padX = 0.1;
      const padY = 0.08;
      let left = Math.max(0, box.left - padX) * meta.width;
      let right = Math.min(1, box.right + padX) * meta.width;
      let top = Math.max(0, box.top - padY) * meta.height;
      let bottom = Math.min(1, box.bottom + padY) * meta.height;
      let w = right - left;
      let h = bottom - top;
      const target = 5 / 4; // height / width
      if (h / w < target) {
        const need = w * target;
        const cy = (top + bottom) / 2;
        top = Math.max(0, cy - need / 2);
        bottom = Math.min(meta.height, top + need);
        top = Math.max(0, bottom - need);
      } else {
        const need = h / target;
        const cx = (left + right) / 2;
        left = Math.max(0, cx - need / 2);
        right = Math.min(meta.width, left + need);
        left = Math.max(0, right - need);
      }
      const region = {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top)
      };
      let pipeline = sharp(src).extract(region);
      // The photo does not always leave room for a 4:5 crop: a tall bottle runs out
      // of width, a flat-lay runs out of height. Extend the backdrop on whichever
      // side is short so every product image comes out exactly 4:5.
      let outWidth = region.width;
      let outHeight = region.height;
      const needWidth = Math.round(region.height / target) - region.width;
      const needHeight = Math.round(region.width * target) - region.height;
      if (needWidth > 0) {
        const padLeft = Math.floor(needWidth / 2);
        pipeline = sharp(await pipeline.extend({ left: padLeft, right: needWidth - padLeft, extendWith: 'copy' }).toBuffer());
        outWidth += needWidth;
      } else if (needHeight > 0) {
        const padTop = Math.floor(needHeight / 2);
        pipeline = sharp(await pipeline.extend({ top: padTop, bottom: needHeight - padTop, extendWith: 'copy' }).toBuffer());
        outHeight += needHeight;
      }
      const widths = await emit(pipeline, `products/${slug}-${i + 1}`, PRODUCT_WIDTHS, outWidth, outHeight);
      console.log(`  ${slug}-${i + 1}  spread ${box.spread.toFixed(2)}  ${region.width}x${region.height}  [${widths}]`);
    }
  }
}

async function buildEditorial() {
  for (const item of EDITORIAL) {
    const src = path.join(ROOT, item.src);
    if (!fs.existsSync(src)) {
      console.warn('  ! missing source:', item.src);
      continue;
    }
    let pipeline = sharp(src);
    let meta = await pipeline.metadata();
    let width = meta.width;
    let height = meta.height;

    if (item.crop) {
      pipeline = pipeline.extract(item.crop);
      width = item.crop.width;
      height = item.crop.height;
    }
    if (item.ratio) {
      const [rw, rh] = item.ratio;
      let cw = width;
      let ch = Math.round((width * rh) / rw);
      if (ch > height) {
        ch = height;
        cw = Math.round((height * rw) / rh);
      }
      const buf = await pipeline.toBuffer();
      pipeline = sharp(buf).resize({ width: cw, height: ch, fit: 'cover', position: 'attention' });
      width = cw;
      height = ch;
    }
    const widths = await emit(pipeline, item.out, EDITORIAL_WIDTHS, width, height);
    console.log(`  ${item.out}  [${widths}]`);
  }
}

(async () => {
  console.log('Products:');
  await buildProducts();
  console.log('Editorial:');
  const manifestFile = path.join(ROOT, 'src', 'data', 'images.json');
  // ONLY=slug,slug re-renders just those products and keeps every other manifest entry.
  if (process.env.ONLY) {
    const previous = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    Object.assign(MANIFEST, { ...previous, ...MANIFEST });
  } else {
    await buildEditorial();
  }
  fs.writeFileSync(manifestFile, JSON.stringify(MANIFEST, null, 2));
  console.log(`Manifest: ${Object.keys(MANIFEST).length} images -> src/data/images.json`);
  console.log('Done.');
})();
