# Elementor map

How each part of the prototype is rebuilt in WordPress with Elementor. Nothing in the design needs a
custom widget, a page builder hack or CSS Grid. Every row is a Flexbox container.

Existing stack on `marketing.beautycrib.ug`: Hello Elementor, Elementor 4.2 with PRO Elements,
WooCommerce 11.1. That is everything required below.

---

## 1. Site Settings (the global kit)

Set these once under **Elementor → Site Settings**. They mirror `website/assets/css/tokens.css`.

### Global colours

| Elementor slot | Value | Used for |
|---|---|---|
| Primary | `#000000` | Text, buttons, rules |
| Secondary | `#111111` | Inverted chapters, footer |
| Text | `#666666` | Small secondary text (passes AA on white) |
| Accent | `#F7F7F5` | Product image wells, alternate sections |
| Custom: Light Gray | `#E8E8E5` | Borders and dividers |
| Custom: Mid Gray | `#777777` | Large secondary text only |
| Custom: White | `#FFFFFF` | Page background |

### Global fonts

Upload the four files in `website/assets/fonts/` under **Elementor → Custom Fonts**, then:

| Slot | Family | Weight | Notes |
|---|---|---|---|
| Primary | Instrument Serif | 400 | Display headings, `letter-spacing: -0.02em`, `line-height: 1.02` |
| Secondary | Instrument Sans | 400–700 | Navigation, body, UI |
| Text | Instrument Sans | 400 | Body, `line-height: 1.62` |
| Accent | Instrument Sans | 500 | Eyebrows: 11px, uppercase, `letter-spacing: 0.14em` |

Heading sizes use `clamp()`. Paste the `--fs-*` values from `tokens.css` into
**Site Settings → Custom CSS** and reference them, or set per-device sizes at
Desktop / Tablet / Mobile using the min and max of each clamp.

### Layout

- Content width **1440px**, widget spacing **0**
- Breakpoints: Mobile 767, Tablet 1024, Laptop 1366 (Elementor defaults, which the CSS already matches)
- Page padding: `clamp(20px, 4vw, 64px)` left and right

### Custom CSS to carry over

Copy these from the prototype into **Site Settings → Custom CSS**, since they are effects Elementor
controls do not express directly:

- `.line-reveal` masked headline reveal
- `.reveal-media` clip-path image reveal
- `.product-card` hover crossfade to the second image
- `.nav__link` underline draw
- Focus styles (`:focus-visible`)

---

## 2. Theme Builder templates

| Template | Type | Built from |
|---|---|---|
| Header | Header | `src/partials/header.html` |
| Header, checkout | Header (condition: Checkout page) | Logo and "Secure checkout" only |
| Footer | Footer | `src/partials/footer.html` |
| Single Product | Product | `src/templates/product.html` |
| Product Archive | Product Archive | `src/templates/category.html` |
| Single Post | Single Post | `src/templates/article.html` |
| Post Archive | Archive | `src/pages/journal.html` |
| Search Results | Search Results | `src/pages/search.html` |
| 404 | Single | `src/pages/not-found.html` |
| Product card | Loop Item | `.product-card` markup |
| Article card | Loop Item | `.article-card` markup |

---

## 3. Header

| Element | Widget | Settings |
|---|---|---|
| Announcement bar | Container + Text Editor | Full width, black background, 11px uppercase |
| Header container | Container (flex, row, space-between) | Sticky, "Change styles when sticky" on |
| Logo | Site Logo | `website/assets/img/logo/wordmark.svg`, max width 148px |
| Menu | Nav Menu (Pro) | Centre, uppercase 14px, underline on hover |
| Shop mega menu | Mega Menu or Nav Menu dropdown | Two link columns plus one promo container |
| Search | Search Form (Pro), full screen | Serif input, live results are optional |
| Account | Icon linking to `/my-account/` | |
| Wishlist | Icon linking to `/wishlist/` | Counter comes from the wishlist plugin |
| Bag | Menu Cart (Pro) | Off-canvas, "Open cart automatically" on |
| Mobile menu | Nav Menu, full-screen overlay | Serif links, staggered entrance |

Transparent-over-hero behaviour: set the header to transparent with white text, enable sticky, and
use "Change styles when sticky" for the white background and black text.

---

## 4. Home page, section by section

| # | Section | Elementor build |
|---|---|---|
| 1 | Hero | Container, full height, background image (separate mobile image), Heading + Text + two Buttons. Motion Effects → Vertical Scroll, speed 1 for the parallax |
| 2 | Editorial statement | Container, Heading (serif, huge) + two Text Editors side by side |
| 3 | Featured, "Chosen this month" | Container + Loop Grid (Pro) filtered to Featured products. One large item plus four, or two nested containers |
| 4 | Promise strip | Container with four inner containers, Text Editor in each, borders top and bottom |
| 5 | Shop by category | Loop Grid over product categories, or six Image Box widgets. Horizontal scroll on mobile |
| 6 | Philosophy chapter | Container, Soft Black background, Heading + four Text columns + Button |
| 7 | Campaign one | Container (row): Image + Heading/Text/Buttons. Reverse direction for campaign two |
| 8 | Best sellers | Loop Grid ordered by total sales, four columns |
| 9 | Campaign two | As campaign one, `row-reverse` |
| 10 | Journal | Loop Grid over posts: one featured plus three compact |
| 11 | Gallery strip | Image Gallery or five Image widgets with staggered bottom margins |
| 12 | Newsletter | Form widget in the footer template |

Entrance animations: apply **Fade In Up**, 900ms, with 80–240ms delays for the stagger. Motion
Effects for the parallax on the hero and campaign images only.

---

## 5. Shop and category pages

| Element | Widget |
|---|---|
| Category intro | Container + Heading + Text + Image |
| Subcategory pills | Nav Menu or Icon List, inline |
| Filter drawer | Off-Canvas (Pro) containing the filter plugin's widget |
| Sort | WooCommerce Sorting |
| Product grid | WooCommerce Products, or Loop Grid with the product card Loop Item |
| Editorial interrupt tile | A full-width container placed in the Loop Grid's "Insert item" slot |
| Load more | Loop Grid pagination set to Load More |
| SEO text | Text Editor below the grid |
| Category FAQ | Accordion |

Columns: 4 desktop, 3 laptop and tablet, 2 mobile.

---

## 6. Product page

| Element | Widget |
|---|---|
| Breadcrumb | Breadcrumbs (Yoast/Rank Math/SiteSEO) |
| Gallery | Product Images, stacked, lightbox on |
| Brand | Product Meta or an ACF/brand dynamic tag |
| Title | Product Title |
| Rating | Product Rating |
| Price | Product Price |
| Short benefit line | Product Short Description |
| Skin type and concern chips | Product Meta, or ACF Repeater styled as chips |
| Quantity and Add to bag | Add To Cart |
| Wishlist | Wishlist plugin widget |
| Availability, delivery, payment, authenticity | Icon List inside a container |
| Description, Benefits, Ingredients, How to use, Shipping | Accordion, each panel a dynamic ACF field |
| Reviews | Product Data Tabs, or the Reviews widget |
| Journal guide link | Container + Heading + Button |
| Related products | Product Related |
| Mobile sticky bar | Container, fixed to bottom, visible on mobile only |

The right column is a container with **Sticky → Top** and "Stay in column" enabled.

---

## 7. Cart, checkout and account

| Page | Widget |
|---|---|
| Bag drawer | Menu Cart (Pro), off-canvas |
| Cart page | Cart (Pro) |
| Checkout | Checkout (Pro), single column with a sticky order summary container |
| Order confirmation | Purchase Summary (Pro) |
| My account | My Account (Pro), vertical tabs |
| Login and register | My Account, or a Login widget plus the registration form |
| Wishlist | Wishlist plugin page |

Style the Cart and Checkout widgets rather than the block checkout: the classic widgets are far
easier to match to this design and work with every Ugandan payment gateway.

---

## 8. Journal, gallery and content pages

| Element | Widget |
|---|---|
| Journal masthead | Heading + Text + Nav Menu of categories |
| Article grid | Posts or Loop Grid, alternating card sizes |
| Article header | Post Title, Post Info, Featured Image |
| Article body | Post Content, with a 720px container |
| Shop the story | Loop Grid inside the post, or a reusable template block |
| FAQ block | Accordion, with FAQ schema from the SEO plugin |
| Share links | Share Buttons (Pro) |
| Gallery | Gallery widget, masonry, lightbox on |
| Philosophy rows | Containers alternating `row` and `row-reverse` |
| Legal pages | Text Editor plus a sticky Table of Contents (Pro) |
| Contact | Form (Pro) plus an Icon List of details |

---

## 9. Class names worth keeping

If the Custom CSS is carried over, keeping these class names on the matching Elementor containers
means the prototype's styling transfers with almost no rewriting:

`hero`, `statement`, `promise`, `featured`, `categories__grid`, `chapter`, `campaign`,
`journal-teaser`, `gallery-strip`, `product-card`, `category-tile`, `article-card`, `filter-bar`,
`product-layout`, `product-info`, `summary`, `option-card`, `accordion`, `pill`, `chip`, `eyebrow`,
`display-xl`, `display-l`, `display-m`, `reveal`, `reveal-media`, `line-reveal`.
