/**
 * Beauty Crib static build.
 *
 *   node src/build.js
 *
 * Every page in website/ is plain HTML written by this script from:
 *   src/layout.html      the shell (head, header, main, footer, drawers)
 *   src/partials/*.html  header, footer, cart drawer, search overlay, newsletter
 *   src/pages/*.html     one file per unique page, containing only its sections
 *   src/templates/*.html product, category and article templates
 *   src/data/*.json      catalogue, categories, journal, site settings, image manifest
 *
 * The structure mirrors how the site is rebuilt in WordPress: one header template,
 * one footer template, one product template, one article template, many entries.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const ROOT = path.resolve(SRC, '..');
const OUT = path.join(ROOT, 'website');

const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const site = readJson('data/site.json');
const products = readJson('data/products.json');
const categories = readJson('data/categories.json');
const articles = readJson('data/articles.json');
const images = fs.existsSync(path.join(SRC, 'data/images.json')) ? readJson('data/images.json') : {};

const BUILD_DATE = new Date().toISOString().slice(0, 10);
const missingImages = new Set();

/* ------------------------------------------------------------------ helpers */

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const money = (n) => `UGX ${Number(n).toLocaleString('en-US')}`;
const productUrl = (p) => `/product/${p.slug}/`;
const articleUrl = (a) => `/journal/${a.slug}/`;
const categoryUrl = (c, parent) => (parent ? `/product-category/${parent}/${c.slug}/` : `/product-category/${c.slug}/`);

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/** Largest rendered width at or below `cap` that actually exists on disk. */
function bestWidth(base, cap) {
  const entry = images[base];
  if (!entry) return null;
  const within = entry.widths.filter((w) => w <= cap);
  return within.length ? within[within.length - 1] : entry.widths[0];
}

/** Absolute URL for a share or preload image, never pointing at a width we did not generate. */
function imageUrl(base, cap = 1200) {
  const width = bestWidth(base, cap);
  if (!width) return `${site.domain}/assets/img/editorial/hero-home-1200.jpg`;
  return `${site.domain}/assets/img/${base}-${width}.jpg`;
}

/** Trim to a sentence-safe length for meta descriptions. */
function clampText(text, max = 158) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '.';
}

/**
 * Responsive <picture> from the image manifest, so srcset only ever lists
 * files that exist and nothing is upscaled.
 */
function picture(base, o = {}) {
  const entry = images[base];
  if (!entry) {
    missingImages.add(base);
    return `<div class="media media--missing ${o.className || ''}" role="img" aria-label="${attr(o.alt || '')}"></div>`;
  }
  const widths = entry.widths;
  const largest = widths[widths.length - 1];
  const fallback = widths.includes(700) ? 700 : widths.includes(600) ? 600 : widths[0];
  const set = (ext) => widths.map((w) => `/assets/img/${base}-${w}.${ext} ${w}w`).join(', ');
  const sizes = o.sizes || '100vw';
  const height = Math.round(largest * (entry.ratio || 1));
  const priority = o.priority
    ? ' fetchpriority="high"'
    : '';
  const loading = o.priority ? 'eager' : 'lazy';
  return `<picture class="${o.className || 'media'}">
            <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
            <img src="/assets/img/${base}-${fallback}.jpg" srcset="${set('jpg')}" sizes="${sizes}"
                 width="${largest}" height="${height}" alt="${attr(o.alt || '')}"
                 loading="${loading}" decoding="async"${priority}>
          </picture>`;
}

/**
 * Art-directed hero: a landscape crop on desktop, a portrait crop on phones.
 * Elementor reproduces this with a container background image plus a
 * mobile-specific background image.
 */
function heroPicture(landscape, portrait, alt) {
  const set = (base, ext) => images[base].widths.map((w) => `/assets/img/${base}-${w}.${ext} ${w}w`).join(', ');
  const fallback = images[landscape].widths[images[landscape].widths.length - 1];
  return `<picture class="hero__picture">
      <source media="(max-width: 767px)" type="image/webp" srcset="${set(portrait, 'webp')}" sizes="100vw">
      <source media="(max-width: 767px)" srcset="${set(portrait, 'jpg')}" sizes="100vw">
      <source type="image/webp" srcset="${set(landscape, 'webp')}" sizes="100vw">
      <img src="/assets/img/${landscape}-${fallback}.jpg" srcset="${set(landscape, 'jpg')}" sizes="100vw"
           alt="${attr(alt)}" width="1376" height="774" fetchpriority="high" decoding="async">
    </picture>`;
}

/** Star row. Ratings come from real reviews only, so new products show an honest empty state. */
function rating(product) {
  const reviews = product.reviews || [];
  if (!reviews.length) {
    return `<p class="rating rating--empty"><span class="rating__stars" aria-hidden="true">${'&#9734;'.repeat(5)}</span> <span>No reviews yet</span></p>`;
  }
  const avg = reviews.reduce((s, r) => s + r.score, 0) / reviews.length;
  const full = Math.round(avg);
  return `<p class="rating"><span class="rating__stars" aria-hidden="true">${'&#9733;'.repeat(full)}${'&#9734;'.repeat(5 - full)}</span>
          <span>${avg.toFixed(1)} from ${reviews.length} review${reviews.length === 1 ? '' : 's'}</span></p>`;
}

function priceBlock(p, className = 'price') {
  if (p.salePrice) {
    return `<p class="${className}"><span class="price__was">${money(p.price)}</span> <span class="price__now">${money(p.salePrice)}</span> <span class="price__tag">Sale</span></p>`;
  }
  return `<p class="${className}">${money(p.price)}</p>`;
}

/** Data attributes shared by every add-to-cart and wishlist control. */
function productData(p) {
  const img = `/assets/img/products/${p.slug}-1-400.jpg`;
  return `data-slug="${attr(p.slug)}" data-name="${attr(p.name)}" data-brand="${attr(p.brand)}" ` +
    `data-price="${p.salePrice || p.price}" data-image="${attr(img)}" data-url="${attr(productUrl(p))}"`;
}

const heartSvg = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z"/></svg>`;

function productCard(p, o = {}) {
  const sizes = o.sizes || '(min-width: 1025px) 25vw, (min-width: 768px) 33vw, 50vw';
  const cls = ['product-card', o.modifier ? `product-card--${o.modifier}` : ''].filter(Boolean).join(' ');
  return `<article class="${cls}" ${productData(p)} data-category="${attr(p.category)}" data-subcategory="${attr(p.subcategory || '')}"
           data-brand-slug="${attr(p.brandSlug)}" data-skin="${attr((p.skinTypes || []).join('|'))}"
           data-concern="${attr((p.concerns || []).join('|'))}" data-stock="${attr(p.stock)}">
      <div class="product-card__media">
        <a class="product-card__link" href="${productUrl(p)}" aria-label="${attr(`${p.brand} ${p.name}`)}">
          ${picture(`products/${p.slug}-1`, { alt: `${p.brand} ${p.name}`, sizes, className: 'product-card__image' })}
          ${images[`products/${p.slug}-2`] ? picture(`products/${p.slug}-2`, { alt: `${p.brand} ${p.name} with its carton`, sizes, className: 'product-card__image product-card__image--alt' }) : ''}
        </a>
        <button class="wishlist-toggle" type="button" data-wishlist ${productData(p)}
                aria-label="${attr(`Save ${p.brand} ${p.name} to your wishlist`)}" aria-pressed="false">${heartSvg}</button>
        <div class="product-card__quick">
          <button class="btn btn--solid btn--block btn--sm" type="button" data-add-to-cart ${productData(p)}>Quick add</button>
        </div>
      </div>
      <div class="product-card__body">
        <p class="eyebrow product-card__brand">${esc(p.brand)}</p>
        <h3 class="product-card__name"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        ${priceBlock(p, 'price product-card__price')}
        ${o.withRating ? rating(p) : ''}
      </div>
    </article>`;
}

function categoryTile(c) {
  const url = c.comingSoon ? categoryUrl(c) : categoryUrl(c);
  return `<a class="category-tile" href="${url}">
      <div class="category-tile__media">
        ${picture(c.image, { alt: c.imageAlt, sizes: '(min-width: 1025px) 33vw, (min-width: 768px) 50vw, 80vw', className: 'category-tile__image' })}
      </div>
      <div class="category-tile__body">
        <span class="category-tile__index eyebrow">${c.index}</span>
        <h3 class="category-tile__name">${esc(c.name)}</h3>
        <span class="category-tile__note">${c.comingSoon ? 'Arriving soon' : `${products.filter((p) => p.category === c.slug).length} products`}</span>
      </div>
    </a>`;
}

function articleCard(a, o = {}) {
  const sizes = o.sizes || '(min-width: 1025px) 33vw, (min-width: 768px) 50vw, 90vw';
  return `<article class="article-card ${o.modifier ? `article-card--${o.modifier}` : ''}">
      <a class="article-card__link" href="${articleUrl(a)}">
        <div class="article-card__media">${picture(a.image, { alt: a.imageAlt, sizes, className: 'article-card__image' })}</div>
        <p class="eyebrow article-card__category">${esc(a.category)}</p>
        <h3 class="article-card__title">${esc(a.title)}</h3>
        <p class="article-card__excerpt">${esc(a.excerpt)}</p>
        <p class="article-card__meta">${esc(a.dateDisplay)} &middot; ${esc(a.readTime)}</p>
      </a>
    </article>`;
}

function breadcrumbs(items) {
  const links = items
    .map((i, idx) =>
      idx === items.length - 1
        ? `<li aria-current="page">${esc(i.name)}</li>`
        : `<li><a href="${i.url}">${esc(i.name)}</a></li>`
    )
    .join('');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((i, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: i.name,
      item: `${site.domain}${i.url}`
    }))
  };
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${links}</ol></nav>${jsonLd(ld)}`;
}

function accordion(items, o = {}) {
  // Heading level follows the surrounding page outline: h2 straight after the
  // page h1 (product page), h3 under a section heading (FAQ, article).
  const h = o.level || 3;
  return `<div class="accordion" data-accordion>
    ${items
      .map(
        (item, i) => `<div class="accordion__item">
        <h${h} class="accordion__heading">
          <button type="button" class="accordion__trigger" aria-expanded="${i === 0 && o.openFirst ? 'true' : 'false'}" aria-controls="${o.idPrefix}-${i}">
            <span>${esc(item.title)}</span><span class="accordion__icon" aria-hidden="true"></span>
          </button>
        </h${h}>
        <div class="accordion__panel" id="${o.idPrefix}-${i}" ${i === 0 && o.openFirst ? '' : 'hidden'}>
          <div class="accordion__content">${item.content}</div>
        </div>
      </div>`
      )
      .join('')}
  </div>`;
}

/* ------------------------------------------------------------- template core */

const partialCache = {};
function partial(name) {
  if (!partialCache[name]) partialCache[name] = read(path.join('partials', `${name}.html`));
  return partialCache[name];
}

function render(tpl, vars) {
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partial(name));
  // Includes may themselves include, so resolve until stable.
  let guard = 0;
  while (/\{\{>\s*[\w-]+\s*\}\}/.test(out) && guard++ < 5) {
    out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partial(name));
  }
  return out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const value = key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
    return value == null ? '' : String(value);
  });
}

const layout = read('layout.html');

function writePage(outPath, vars) {
  const html = render(layout, { site, buildDate: BUILD_DATE, ...slots, ...vars });
  const file = path.join(OUT, outPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return { url: '/' + outPath.replace(/index\.html$/, '').replace(/\\/g, '/'), noindex: !!vars.noindex, priority: vars.sitemapPriority };
}

const sitemap = [];

/** Pull the JSON front matter out of a page file. */
function frontMatter(source) {
  const match = source.match(/^<!--\s*meta\s*([\s\S]*?)-->\s*/);
  if (!match) return [{}, source];
  return [JSON.parse(match[1]), source.slice(match[0].length)];
}

function pageVars(meta, content, extra = {}) {
  const canonical = `${site.domain}${meta.path}`;
  const ogImage = meta.ogImage ? imageUrl(meta.ogImage) : imageUrl('editorial/hero-home');
  return {
    title: meta.title,
    description: meta.description,
    canonical,
    ogImage,
    ogType: meta.ogType || 'website',
    robots: meta.noindex ? 'noindex, follow' : 'index, follow',
    noindex: !!meta.noindex,
    bodyClass: meta.bodyClass || '',
    headerVariant: meta.header || 'solid',
    headExtra: meta.preload && images[meta.preload]
      ? `<link rel="preload" as="image" href="/assets/img/${meta.preload}-${bestWidth(meta.preload, 1200)}.jpg" imagesrcset="${images[meta.preload].widths
          .map((w) => `/assets/img/${meta.preload}-${w}.jpg ${w}w`)
          .join(', ')}" imagesizes="100vw">`
      : '',
    pageScripts: (meta.scripts || []).map((s) => `<script src="/assets/js/${s}.js" defer></script>`).join('\n  '),
    structuredData: '',
    content,
    ...extra
  };
}

/* ------------------------------------------------------------------- content */

const featuredLarge = products.find((p) => p.featuredLarge);
const featuredSmall = products.filter((p) => p.featured && !p.featuredLarge).slice(0, 4);
const bestSellers = products.filter((p) => p.bestSeller).slice(0, 4);
const cleansers = products.filter((p) => p.subcategory === 'cleansers');
const featuredArticle = articles.find((a) => a.featured) || articles[0];
const otherArticles = articles.filter((a) => a.slug !== featuredArticle.slug);

const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
const skinTypes = [...new Set(products.flatMap((p) => p.skinTypes || []))].sort();
const concerns = [...new Set(products.flatMap((p) => p.concerns || []))].sort();

const filterGroup = (title, name, values, counts) => `
  <fieldset class="filter-group">
    <legend class="filter-group__legend">${esc(title)}</legend>
    <div class="filter-group__options">
      ${values
        .map(
          (v) => `<label class="checkbox">
            <input type="checkbox" name="${name}" value="${attr(v)}">
            <span class="checkbox__box" aria-hidden="true"></span>
            <span class="checkbox__label">${esc(v)}${counts ? ` <span class="checkbox__count">(${counts[v]})</span>` : ''}</span>
          </label>`
        )
        .join('')}
    </div>
  </fieldset>`;

const countBy = (list, key) =>
  list.reduce((acc, p) => {
    const values = Array.isArray(p[key]) ? p[key] : [p[key]];
    values.forEach((v) => {
      if (v) acc[v] = (acc[v] || 0) + 1;
    });
    return acc;
  }, {});

const filtersHtml = `
  ${filterGroup('Brand', 'brand', brands, countBy(products, 'brand'))}
  ${filterGroup('Skin type', 'skin', skinTypes, countBy(products, 'skinTypes'))}
  ${filterGroup('Concern', 'concern', concerns, countBy(products, 'concerns'))}
  <fieldset class="filter-group">
    <legend class="filter-group__legend">Price</legend>
    <div class="filter-group__options">
      ${[
        ['0-70000', 'Under UGX 70,000'],
        ['70000-80000', 'UGX 70,000 to 80,000'],
        ['80000-999999999', 'UGX 80,000 and above']
      ]
        .map(
          ([value, label]) => `<label class="checkbox">
            <input type="checkbox" name="price" value="${value}">
            <span class="checkbox__box" aria-hidden="true"></span>
            <span class="checkbox__label">${label}</span>
          </label>`
        )
        .join('')}
    </div>
  </fieldset>`;

const navCategories = categories
  .map((c) => `<li><a href="${categoryUrl(c)}">${esc(c.name)}${c.comingSoon ? ' <span class="nav__soon">soon</span>' : ''}</a></li>`)
  .join('\n');

/** The shots a product actually has, in order. Not every product has a carton shot. */
const productShots = (p) => [1, 2, 3, 4].filter((n) => images[`products/${p.slug}-${n}`]);
const shotAlt = (p, n) => (n === 1 ? `${p.brand} ${p.name}` : n === 2 ? `${p.brand} ${p.name} with its carton` : `${p.brand} ${p.name} shown from another angle`);

const galleryImages = Object.keys(images)
  .filter((k) => k.startsWith('gallery/'))
  .sort();

/* Alt text describes the picture; the caption is the editorial label beside it.
   They must differ, or a screen reader hears the same words twice. */
const galleryAlts = {
  'gallery/gallery-01': 'Portrait of a woman with hydrated, glowing skin',
  'gallery/gallery-02': 'Close-up of dewy skin after cleansing',
  'gallery/gallery-03': 'A Beauty Crib serum bottle beside raw shea butter and volcanic stone',
  'gallery/gallery-04': 'Black and white studio portrait with sculpted finger waves',
  'gallery/gallery-05': 'Smooth, moisturised skin on the legs',
  'gallery/gallery-06': 'Beauty portrait with water across the face',
  'gallery/gallery-07': 'Warm daylight portrait of well-cared-for skin',
  'gallery/gallery-08': 'Low-light beauty portrait with a glossy lip',
  'gallery/gallery-09': 'Close portrait showing a glass-skin finish',
  'gallery/gallery-10': 'Editorial beauty portrait photographed in water',
  'gallery/gallery-11': 'Close-up of a hand resting against the cheek',
  'gallery/gallery-12': 'Portrait of calm, freshly moisturised skin',
  'gallery/gallery-13': 'Beauty Crib campaign photograph in a stone courtyard',
  'gallery/gallery-14': 'A woman applying moisturiser to her cheek'
};

const galleryCaptions = {
  'gallery/gallery-01': 'Glow, unfiltered',
  'gallery/gallery-02': 'After the double cleanse',
  'gallery/gallery-03': 'Still life, Kampala studio',
  'gallery/gallery-04': 'Form and finish',
  'gallery/gallery-05': 'Below the neck',
  'gallery/gallery-06': 'Water, light, skin',
  'gallery/gallery-07': 'The body edit',
  'gallery/gallery-08': 'Lip, close',
  'gallery/gallery-09': 'Glass skin',
  'gallery/gallery-10': 'Campaign study',
  'gallery/gallery-11': 'Hands and texture',
  'gallery/gallery-12': 'Moisture, held',
  'gallery/gallery-13': 'The Crib, in colour',
  'gallery/gallery-14': 'Morning routine'
};

const slots = {
  navCategories,
  featuredLarge: featuredLarge ? productCard(featuredLarge, { modifier: 'feature', sizes: '(min-width: 768px) 50vw, 100vw' }) : '',
  featuredGrid: featuredSmall.map((p) => productCard(p)).join('\n'),
  bestSellers: bestSellers.map((p) => productCard(p, { withRating: true })).join('\n'),
  categoryTiles: categories.map(categoryTile).join('\n'),
  shopGrid: products.map((p) => productCard(p)).join('\n'),
  shopFilters: filtersHtml,
  productCount: String(products.length),
  brandCount: String(brands.length),
  journalFeatured: articleCard(featuredArticle, { modifier: 'feature', sizes: '(min-width: 768px) 60vw, 100vw' }),
  journalGrid: otherArticles.slice(0, 3).map((a) => articleCard(a)).join('\n'),
  journalAll: articles.map((a, i) => articleCard(a, { modifier: i % 5 === 0 ? 'wide' : '' })).join('\n'),
  galleryStrip: galleryImages
    .slice(0, 5)
    .map((g, i) => `<figure class="gallery-strip__item gallery-strip__item--${i + 1}">${picture(g, { alt: galleryAlts[g] || 'Beauty Crib editorial photograph', sizes: '(min-width: 768px) 20vw, 60vw' })}</figure>`)
    .join('\n'),
  galleryFull: galleryImages
    .map(
      (g, i) => `<figure class="gallery-grid__item">
        <button class="gallery-grid__button" type="button" data-lightbox="${i}" data-src="/assets/img/${g}-${images[g].widths[images[g].widths.length - 1]}.jpg" data-caption="${attr(galleryCaptions[g] || '')}">
          ${picture(g, { alt: galleryAlts[g] || 'Beauty Crib editorial photograph', sizes: '(min-width: 1025px) 32vw, (min-width: 768px) 48vw, 90vw', className: 'gallery-grid__image' })}
          <figcaption class="gallery-grid__caption">${esc(galleryCaptions[g] || '')}</figcaption>
        </button>
      </figure>`
    )
    .join('\n'),
  deliveryRows: site.delivery.methods
    .map(
      (m) => `<tr><th scope="row">${esc(m.label)}</th><td>${esc(m.eta)}</td><td>${m.cost === null ? 'Confirmed on order' : m.cost === 0 ? 'Free' : money(m.cost)}</td></tr>`
    )
    .join('\n'),
  paymentList: site.payments.map((p) => `<li><strong>${esc(p.label)}</strong><span>${esc(p.note)}</span></li>`).join('\n'),
  shippingOptions: site.delivery.methods
    .map(
      (m, i) => `<label class="option-card">
        <input type="radio" name="delivery" value="${attr(m.id)}" data-cost="${m.cost === null ? '' : m.cost}" ${i === 0 ? 'checked' : ''} required>
        <span class="option-card__body">
          <span class="option-card__title">${esc(m.label)}</span>
          <span class="option-card__note">${esc(m.eta)}</span>
        </span>
        <span class="option-card__price">${m.cost === null ? 'Confirmed on order' : m.cost === 0 ? 'Free' : money(m.cost)}</span>
      </label>`
    )
    .join('\n'),
  paymentOptions: site.payments
    .map(
      (p, i) => `<label class="option-card">
        <input type="radio" name="payment" value="${attr(p.id)}" ${i === 0 ? 'checked' : ''} required>
        <span class="option-card__body">
          <span class="option-card__title">${esc(p.label)}</span>
          <span class="option-card__note">${esc(p.note)}</span>
        </span>
      </label>`
    )
    .join('\n'),
  districtOptions: [
    'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbarara', 'Gulu', 'Lira', 'Mbale', 'Masaka', 'Fort Portal (Kabarole)',
    'Arua', 'Soroti', 'Hoima', 'Kasese', 'Mityana', 'Mubende', 'Luweero', 'Iganga', 'Tororo', 'Busia',
    'Kabale', 'Bushenyi', 'Ntungamo', 'Rukungiri', 'Isingiro', 'Kamuli', 'Kayunga', 'Buikwe', 'Entebbe (Wakiso)', 'Nakasongola',
    'Masindi', 'Kiryandongo', 'Apac', 'Kitgum', 'Moroto', 'Kotido', 'Adjumani', 'Moyo', 'Nebbi', 'Pakwach',
    'Zombo', 'Yumbe', 'Koboko', 'Maracha', 'Amuru', 'Nwoya', 'Oyam', 'Dokolo', 'Alebtong', 'Amolatar',
    'Kaberamaido', 'Serere', 'Kumi', 'Bukedea', 'Sironko', 'Kapchorwa', 'Bulambuli', 'Manafwa', 'Namisindwa', 'Butaleja',
    'Bugiri', 'Mayuge', 'Namayingo', 'Buyende', 'Luuka', 'Bugweri', 'Kaliro', 'Pallisa', 'Budaka', 'Kibuku',
    'Ngora', 'Katakwi', 'Amuria', 'Nakapiripirit', 'Amudat', 'Napak', 'Abim', 'Agago', 'Pader', 'Lamwo',
    'Omoro', 'Kole', 'Otuke', 'Kwania', 'Sembabule', 'Lyantonde', 'Rakai', 'Kyotera', 'Kalangala', 'Buvuma',
    'Gomba', 'Butambala', 'Kalungu', 'Bukomansimbi', 'Lwengo', 'Kyankwanzi', 'Kiboga', 'Nakaseke', 'Kagadi', 'Kakumiro',
    'Kibaale', 'Kikuube', 'Buliisa', 'Ntoroko', 'Bundibugyo', 'Kamwenge', 'Kitagwenda', 'Kyenjojo', 'Kyegegwa', 'Bunyangabu',
    'Rubirizi', 'Buhweju', 'Mitooma', 'Sheema', 'Rubanda', 'Kisoro', 'Kanungu', 'Kazo', 'Kiruhura', 'Rwampara',
    'Ibanda', 'Rukiga', 'Other district'
  ]
    .map((d) => `<option value="${attr(d)}">${esc(d)}</option>`)
    .join('\n'),
  year: String(new Date().getFullYear()),

  /* Social links come from site.json, so there is one source of truth. */
  socialLinks: site.social
    .map((s) => `<li><a href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>`)
    .join('\n'),
  socialContactLinks: site.social
    .map((s) => `<dd><a href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)} ${esc(s.handle)}</a></dd>`)
    .join('\n'),

  /* Editorial imagery used by the hand-written pages. */
  heroMedia: heroPicture('editorial/hero-home', 'editorial/hero-home-portrait', 'A woman seated beside a Beauty Crib fragrance bottle in warm afternoon light'),
  campaignCleanseMedia: picture('editorial/campaign-double-cleanse', { alt: 'Close portrait of clear, freshly cleansed skin', sizes: '(min-width: 768px) 46vw, 100vw' }),
  campaignBodyMedia: picture('editorial/campaign-body', { alt: 'Smooth, glowing skin on the legs after a body routine', sizes: '(min-width: 768px) 46vw, 100vw' }),
  philosophyHeroMedia: picture('editorial/philosophy-hero', { alt: 'A calm, sunlit interior with a skincare ritual in progress', sizes: '(min-width: 768px) 46vw, 100vw' }),
  stillLifeMedia: picture('editorial/still-life-serum', { alt: 'A frosted glass serum bottle beside raw shea butter and volcanic stone', sizes: '(min-width: 768px) 46vw, 100vw' }),
  philosophyRow1: picture('editorial/category-skincare', { alt: 'Portrait of a woman with hydrated, glowing skin', sizes: '(min-width: 768px) 42vw, 100vw' }),
  philosophyRow2: picture('gallery/gallery-09', { alt: 'Close portrait showing a glass-skin finish', sizes: '(min-width: 768px) 42vw, 100vw' }),
  philosophyRow3: picture('gallery/gallery-06', { alt: 'Editorial beauty portrait with water across the skin', sizes: '(min-width: 768px) 42vw, 100vw' }),
  philosophyRow4: picture('editorial/category-body-care', { alt: 'Warm portrait of well-cared-for skin', sizes: '(min-width: 768px) 42vw, 100vw' }),
  authMedia: picture('gallery/gallery-13', { alt: 'Beauty Crib campaign photograph', sizes: '(min-width: 768px) 42vw, 100vw', className: 'auth-media__image' }),
  shopInterruptMedia: picture('editorial/journal-double-cleanse', { alt: 'Skin after a double cleanse', sizes: '240px' }),
  contactMedia: picture('gallery/gallery-03', { alt: 'Beauty Crib product still life', sizes: '(min-width: 768px) 40vw, 100vw' })
};

/* --------------------------------------------------------------- page passes */

/* 1. Hand-written pages */
for (const file of fs.readdirSync(path.join(SRC, 'pages')).sort()) {
  if (!file.endsWith('.html')) continue;
  const [meta, body] = frontMatter(read(path.join('pages', file)));
  const content = render(body, { site, ...slots });
  const vars = pageVars(meta, content, { structuredData: (meta.jsonld || []).map(structuredFor).join('\n') });
  const outPath = meta.out ? meta.out : meta.path === '/' ? 'index.html' : `${meta.path.replace(/^\/|\/$/g, '')}/index.html`;
  sitemap.push(writePage(outPath, vars));
}

/* 2. Product pages */
const productTemplate = read('templates/product.html');
for (const p of products) {
  const cat = categories.find((c) => c.slug === p.category);
  const sub = cat && (cat.subcategories || []).find((s) => s.slug === p.subcategory);
  const related = products
    .filter((r) => r.slug !== p.slug && r.subcategory === p.subcategory)
    .sort((a, b) => (b.concerns || []).filter((c) => (p.concerns || []).includes(c)).length - (a.concerns || []).filter((c) => (p.concerns || []).includes(c)).length)
    .slice(0, 4);
  const guide = articles.find((a) => (a.body || []).some((b) => b.type === 'products' && b.slugs.includes(p.slug))) || articles[0];

  const accordions = accordion(
    [
      { title: 'Description', content: p.description.map((d) => `<p>${esc(d)}</p>`).join('') },
      { title: 'Benefits', content: `<ul class="tick-list">${p.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` },
      {
        title: 'Key ingredients',
        content: `<ul class="tick-list">${p.keyIngredients.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
                  <p class="note">The full ingredient list is printed on the carton. Ask us for a photograph of it before you order and we will send one.</p>`
      },
      { title: 'How to use', content: `<ol class="step-list">${p.howToUse.map((b) => `<li>${esc(b)}</li>`).join('')}</ol>${p.caution ? `<p class="note note--caution">${esc(p.caution)}</p>` : ''}` },
      {
        title: 'Shipping and returns',
        content: `<p>Dispatched from Kampala. ${esc(site.delivery.cutOff)}</p>
                  <ul class="tick-list">${site.delivery.methods.map((m) => `<li>${esc(m.label)}: ${esc(m.eta)}</li>`).join('')}</ul>
                  <p>Unopened products can be returned within ${site.returns.window} days. <a href="/returns-refunds/">Read the returns policy</a>.</p>`
      }
    ],
    { idPrefix: `acc-${p.slug}`, openFirst: true, level: 2 }
  );

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brand} ${p.name}`,
    sku: p.sku,
    description: p.excerpt,
    brand: { '@type': 'Brand', name: p.brand },
    image: [`${site.domain}/assets/img/products/${p.slug}-1-1000.jpg`, `${site.domain}/assets/img/products/${p.slug}-2-1000.jpg`],
    category: cat ? cat.name : 'Beauty',
    offers: {
      '@type': 'Offer',
      url: `${site.domain}${productUrl(p)}`,
      priceCurrency: site.currency,
      price: String(p.salePrice || p.price),
      availability: p.stock === 'in-stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: site.name }
    }
  };

  // Titles carry the local search phrase where they fit inside Google's ~60
  // character display limit, and shorten gracefully when they do not.
  // The brand is the most valuable search term, so it is kept in every variant
  // and the product name is shortened last.
  const titleOptions = [
    `${p.brand} ${p.name} Price in Uganda | Beauty Crib`,
    `${p.brand} ${p.name} | Beauty Crib Uganda`,
    `${p.brand} ${p.name} | Beauty Crib`
  ];
  const nameBudget = 62 - p.brand.length - ' | Beauty Crib'.length - 1;
  const productTitle =
    titleOptions.find((t) => t.length <= 62) ||
    `${p.brand} ${clampText(p.name, nameBudget).replace(/\.$/, '')} | Beauty Crib`;

  const meta = {
    path: productUrl(p),
    title: productTitle,
    description: clampText(`${p.brand} ${p.name}, ${money(p.salePrice || p.price)}. ${p.excerpt} Delivered across Uganda.`),
    bodyClass: 'page-product',
    ogImage: `products/${p.slug}-1`,
    scripts: ['product']
  };

  const content = render(productTemplate, {
    site,
    ...slots,
    breadcrumbs: breadcrumbs([
      { name: 'Home', url: '/' },
      { name: cat ? cat.name : 'Shop', url: cat ? categoryUrl(cat) : '/shop/' },
      ...(sub ? [{ name: sub.name, url: categoryUrl(sub, cat.slug) }] : []),
      { name: p.name, url: productUrl(p) }
    ]),
    brand: esc(p.brand),
    brandSlug: attr(p.brandSlug),
    name: esc(p.name),
    excerpt: esc(p.excerpt),
    price: priceBlock(p, 'price price--large'),
    rating: rating(p),
    gallery: productShots(p)
      .map((n, i) => `<figure class="product-gallery__item" data-index="${i}">${picture(`products/${p.slug}-${n}`, { alt: shotAlt(p, n), sizes: '(min-width: 1025px) 55vw, 100vw', className: 'product-gallery__image', priority: i === 0 })}</figure>`)
      .join('\n'),
    thumbs: productShots(p)
      .map((n, i) => `<button class="product-gallery__thumb ${i === 0 ? 'is-active' : ''}" type="button" data-thumb="${i}" aria-label="Show image ${i + 1}">${picture(`products/${p.slug}-${n}`, { alt: '', sizes: '90px', className: 'product-gallery__thumb-image' })}</button>`)
      .join('\n'),
    productData: productData(p),
    skinTypes: (p.skinTypes || []).map((s) => `<li class="chip">${esc(s)}</li>`).join(''),
    concerns: (p.concerns || []).map((s) => `<li class="chip">${esc(s)}</li>`).join(''),
    format: esc(p.format),
    sku: esc(p.sku),
    stockLabel: p.stock === 'in-stock' ? 'In stock, dispatched from Kampala' : 'Out of stock',
    accordions,
    related: related.map((r) => productCard(r)).join('\n'),
    guideUrl: articleUrl(guide),
    guideTitle: esc(guide.title),
    guideExcerpt: esc(guide.excerpt),
    categoryName: cat ? esc(cat.name) : 'Shop',
    categoryUrl: cat ? categoryUrl(cat) : '/shop/'
  });

  sitemap.push(writePage(`product/${p.slug}/index.html`, pageVars(meta, content, { structuredData: jsonLd(ld) })));
}

/* 3. Category pages (top level and sub) */
const categoryTemplate = read('templates/category.html');
function buildCategory(c, parent) {
  const inCategory = parent
    ? products.filter((p) => p.category === parent.slug && p.subcategory === c.slug)
    : products.filter((p) => p.category === c.slug);
  const url = categoryUrl(c, parent && parent.slug);
  const subLinks = (c.subcategories || [])
    .map((s) => `<li><a class="pill ${s.comingSoon ? 'pill--muted' : ''}" href="${categoryUrl(s, c.slug)}">${esc(s.name)}${s.comingSoon ? ' <span class="pill__note">soon</span>' : ''}</a></li>`)
    .join('');
  // Prefer a Journal article filed under this category, then fall back to a guide.
  const guide =
    articles.find((a) => a.category.toLowerCase() === c.name.toLowerCase().replace(' care', '')) ||
    articles.find((a) => a.category.toLowerCase() === c.name.toLowerCase()) ||
    articles.find((a) => a.category === 'Guides');

  const meta = {
    path: url,
    title: c.title || `${c.name} in Uganda | Beauty Crib`,
    description: c.meta || `Shop ${c.name.toLowerCase()} at Beauty Crib. Authentic beauty products delivered across Uganda.`,
    bodyClass: 'page-category',
    ogImage: c.image || (parent && parent.image),
    scripts: inCategory.length ? ['shop'] : []
  };

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.name,
    description: c.meta || '',
    url: `${site.domain}${url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: inCategory.length,
      itemListElement: inCategory.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.domain}${productUrl(p)}`, name: `${p.brand} ${p.name}` }))
    }
  };

  const content = render(categoryTemplate, {
    site,
    ...slots,
    breadcrumbs: breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '/shop/' },
      ...(parent ? [{ name: parent.name, url: categoryUrl(parent) }] : []),
      { name: c.name, url }
    ]),
    categoryName: esc(c.name),
    categoryIndex: c.index || '',
    tagline: esc(c.tagline || ''),
    intro: esc(c.intro || ''),
    seoText: esc(c.seoText || ''),
    image: c.image ? picture(c.image, { alt: c.imageAlt || `${c.name} at Beauty Crib`, sizes: '(min-width: 768px) 45vw, 100vw', className: 'category-hero__image' }) : parent && parent.image ? picture(parent.image, { alt: parent.imageAlt, sizes: '(min-width: 768px) 45vw, 100vw', className: 'category-hero__image' }) : '',
    subLinks: subLinks ? `<ul class="pill-row">${subLinks}</ul>` : '',
    productCount: String(inCategory.length),
    grid: inCategory.map((p) => productCard(p)).join('\n'),
    hasProducts: inCategory.length ? 'has-products' : 'is-empty',
    emptyState: inCategory.length
      ? ''
      : `<div class="empty-state">
          <h2 class="empty-state__title">The ${esc(c.name.toLowerCase())} edit is on its way</h2>
          <p>We would rather open this shelf with products we can stand behind than fill it quickly. Leave your email and you will be the first to know when it lands.</p>
          <form class="form form--inline" data-newsletter novalidate>
            <div class="field">
              <label for="notify-${c.slug}">Email address</label>
              <input type="email" id="notify-${c.slug}" name="email" autocomplete="email" required placeholder="you@example.com">
            </div>
            <button class="btn btn--solid" type="submit">Notify me</button>
            <p class="form__status" role="status" aria-live="polite"></p>
          </form>
          <p class="empty-state__links">In the meantime, browse <a href="/product-category/skincare/cleansers/">cleansers</a> or read <a href="/journal/">the Journal</a>.</p>
        </div>`,
    guideUrl: guide ? articleUrl(guide) : '/journal/',
    guideTitle: guide ? esc(guide.title) : '',
    guideExcerpt: guide ? esc(guide.excerpt) : '',
    filters: filtersHtml
  });

  sitemap.push(writePage(`${url.replace(/^\/|\/$/g, '')}/index.html`, pageVars(meta, content, { structuredData: jsonLd(ld) })));
}

for (const c of categories) {
  buildCategory(c);
  for (const s of c.subcategories || []) buildCategory(s, c);
}

/* 4. Journal articles */
const articleTemplate = read('templates/article.html');
function renderBlocks(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
          return `<p>${esc(b.text)}</p>`;
        case 'h2':
          return `<h2>${esc(b.text)}</h2>`;
        case 'quote':
          return `<blockquote class="pull-quote"><p>${esc(b.text)}</p></blockquote>`;
        case 'list':
          return `<ul class="tick-list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
        case 'takeaways':
          // Plain containers rather than <aside>: a complementary landmark nested
          // inside the article is flagged as not top level by screen readers.
          return `<div class="takeaways"><h2 class="takeaways__title">In short</h2><ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
        case 'products': {
          const list = b.slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean);
          return `<div class="article-products">
            <h2 class="article-products__title">${esc(b.heading || 'Shop the story')}</h2>
            <div class="product-row">${list.map((p) => productCard(p, { sizes: '(min-width: 768px) 30vw, 60vw' })).join('')}</div>
          </div>`;
        }
        default:
          return '';
      }
    })
    .join('\n');
}

for (const a of articles) {
  const related = (a.related || []).map((s) => articles.find((x) => x.slug === s)).filter(Boolean);
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: a.excerpt,
      image: imageUrl(a.image),
      datePublished: a.date,
      dateModified: a.date,
      author: { '@type': 'Organization', name: site.name },
      publisher: { '@type': 'Organization', name: site.name, logo: { '@type': 'ImageObject', url: `${site.domain}/assets/img/logo/lockup.png` } },
      mainEntityOfPage: `${site.domain}${articleUrl(a)}`
    }
  ];
  if (a.faqs && a.faqs.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: a.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }

  const meta = {
    path: articleUrl(a),
    title: a.seoTitle || `${a.title} | Beauty Crib Journal`,
    description: a.meta,
    bodyClass: 'page-article',
    ogImage: a.image,
    ogType: 'article',
    preload: a.image
  };

  const shareUrl = encodeURIComponent(`${site.domain}${articleUrl(a)}`);
  const content = render(articleTemplate, {
    site,
    ...slots,
    breadcrumbs: breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Journal', url: '/journal/' },
      { name: a.title, url: articleUrl(a) }
    ]),
    title: esc(a.title),
    category: esc(a.category),
    standfirst: esc(a.standfirst),
    dateDisplay: esc(a.dateDisplay),
    readTime: esc(a.readTime),
    author: esc(a.author),
    hero: picture(a.image, { alt: a.imageAlt, sizes: '100vw', className: 'article-hero__image', priority: true }),
    body: renderBlocks(a.body),
    faqs: a.faqs && a.faqs.length ? accordion(a.faqs.map((f) => ({ title: f.q, content: `<p>${esc(f.a)}</p>` })), { idPrefix: `faq-${a.slug}` }) : '',
    related: related.map((r) => articleCard(r)).join('\n'),
    shareWhatsapp: `https://wa.me/?text=${shareUrl}`,
    shareFacebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    shareX: `https://twitter.com/intent/tweet?url=${shareUrl}`,
    shareUrlPlain: `${site.domain}${articleUrl(a)}`
  });

  sitemap.push(writePage(`journal/${a.slug}/index.html`, pageVars(meta, content, { structuredData: ld.map(jsonLd).join('\n') })));
}

/* 5. Client-side catalogue for search and quick add */
fs.mkdirSync(path.join(OUT, 'assets', 'data'), { recursive: true });
fs.writeFileSync(
  path.join(OUT, 'assets', 'data', 'products.json'),
  JSON.stringify(
    products.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.salePrice || p.price,
      wasPrice: p.salePrice ? p.price : null,
      url: productUrl(p),
      image: `/assets/img/products/${p.slug}-1-400.jpg`,
      category: p.category,
      subcategory: p.subcategory,
      excerpt: p.excerpt,
      skinTypes: p.skinTypes,
      concerns: p.concerns,
      keywords: [p.brand, p.name, p.format, ...(p.concerns || []), ...(p.skinTypes || []), ...(p.keyIngredients || [])].join(' ').toLowerCase()
    })),
    null,
    0
  )
);
fs.writeFileSync(
  path.join(OUT, 'assets', 'data', 'articles.json'),
  JSON.stringify(articles.map((a) => ({ slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, url: articleUrl(a), image: `/assets/img/${a.image}-600.jpg` })), null, 0)
);

/* 6. Runtime config, generated from site.json so rates live in one place */
fs.writeFileSync(
  path.join(OUT, 'assets', 'js', 'config.js'),
  `/* Generated by src/build.js from src/data/site.json. Do not edit by hand. */\nwindow.BC_CONFIG = ${JSON.stringify(
    {
      currency: site.currency,
      delivery: site.delivery,
      payments: site.payments,
      returnsWindow: site.returns.window
    },
    null,
    2
  )};\n`
);

/* 7. robots.txt and sitemap.xml */
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /cart/\nDisallow: /checkout/\nDisallow: /my-account/\nDisallow: /wishlist/\nDisallow: /search/\n\nSitemap: ${site.domain}/sitemap.xml\n`);

const urls = sitemap
  .filter((p) => p && !p.noindex)
  .map((p) => `  <url><loc>${site.domain}${p.url}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${p.priority || (p.url === '/' ? '1.0' : '0.7')}</priority></url>`)
  .join('\n');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

/* --------------------------------------------------------------- structured */
function structuredFor(name) {
  switch (name) {
    case 'organization':
      return STRUCTURED_ORGANIZATION();
    case 'website':
      return STRUCTURED_WEBSITE();
    case 'faq':
      return STRUCTURED_FAQ();
    default:
      return '';
  }
}

function STRUCTURED_ORGANIZATION() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: site.name,
    url: site.domain,
    logo: `${site.domain}/assets/img/logo/lockup.png`,
    description: 'Beauty Crib is an online beauty shop in Uganda, offering skincare, makeup, hair care, body care and fragrance with delivery countrywide.',
    areaServed: { '@type': 'Country', name: 'Uganda' },
    currenciesAccepted: site.currency,
    sameAs: site.social.map((s) => s.url)
  });
}
function STRUCTURED_WEBSITE() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.domain,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${site.domain}/search/?q={search_term_string}` },
      'query-input': 'required name=search_term_string'
    }
  });
}
function STRUCTURED_FAQ() {
  const faqs = articles.flatMap((a) => a.faqs || []).slice(0, 10);
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  });
}

console.log(`Built ${sitemap.length} pages into website/`);
if (missingImages.size) console.warn('Missing images:', [...missingImages].join(', '));
