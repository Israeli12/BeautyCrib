# The live site: beautycrib.ug

A copy of everything custom on the WordPress install, so the site can be
rebuilt or reviewed without logging in. Exported 20 September 2026.

The stack is WordPress + WooCommerce (HPOS) on Hostinger, with the Astra
theme, Elementor + PRO Elements, and Xpro Theme Builder for the header and
footer.

## mu-code/

PHP that lives in `wp-content/novamira-sandbox/` on the server, where every
file is loaded on each request.

| File | What it does |
| --- | --- |
| `bc-product-tabs.php` | Adds Benefits, Key ingredients and How to use tabs to a product page, read from the `bc_*` product meta. Also strips the "Category:" prefix from archive titles. |
| `bc-whatsapp-notifications.php` | Sends every WooCommerce event (new order, status change, refund, low stock) and every contact form entry to WhatsApp, via the Meta Cloud API or Twilio. With no provider connected it logs the alert and emails it instead, so nothing is lost. New-order alerts carry the product photos. Settings live under WooCommerce → WhatsApp Alerts. |
| `bc-whatsapp-checkout.php` | The customer side. When "Place order" succeeds, WhatsApp opens with the order written out and addressed to Beauty Crib; the thank-you page keeps a button for browsers that block the automatic window. |
| `bc-journal.php` | Journal helpers: reading time per post, the products an article recommends, and the `bc_post_products` query that fills "Shop the story". |
| `bc-fonts.php` | Serves Instrument Serif and Instrument Sans from this server and preloads them, instead of fetching every weight from Google on each visit. |
| `bc-front-stability.php` | Stops the page reflowing after it has painted: loads the header's widget styles in `<head>`, and leaves out the product filter's assets on pages that do not use it. |
| `bc-product-shipping-tab.php` | Adds the Shipping and returns tab to a product page, and drops the duplicate Additional information tab now that skin type, concern and format sit in the summary. |
| `bc-mega-menu.php` | The Shop mega menu: a three-column panel under Shop in the header, with the top-level shelves, the skincare shelves and an editorial card for Cleansers. Every column is read from WooCommerce, and empty shelves are left out, so it follows the catalogue instead of being written by hand. |
| `bc-shop-match.php` | Brings the WooCommerce shop in line with the prototype: the toolbar reads "63 products" and "Featured" instead of WooCommerce's own wording, the wishlist heart moves onto the photograph and the add-to-cart button waits for a hover, a product with no price says "Price on request" and offers to ask on WhatsApp rather than showing a bare "Read more", and the filter opens as a drawer. |
| `bc-shop-filter.php` | The shop filter: shorter group headings than WooCommerce's taxonomy labels (Brand, Skin type, Concern, Format), the assets HUSKY declines to load because the filter lives in a template, and the `[bc_shop_filter]` wrapper that `bc-shop-match.php` turns into a drawer. Original note follows:  shorter group headings than WooCommerce's taxonomy labels, the assets HUSKY declines to load because the filter lives in a template, and the `[bc_shop_filter]` wrapper that folds the panel behind a tap on a phone. |

## elementor/

One JSON per page and template: the Elementor content, its display
conditions and page settings. `kit-8.json` holds the global colours and the
type scale that everything else references.

Templates: `single-post-214` (blog post), `post-archive-216` (category and
tag archives), `single-product-155`, `product-archive-153`,
`header-72`/`footer-74` (Xpro).

## elementor-build/

The scripts that generated those templates, kept because they are easier to
edit than raw JSON. Each one builds a layout, checks every setting key
against the widget's real controls, then saves and registers the template.
They are PHP fragments, run on the server with `eval()`, and every value
they set points at a global colour or type style rather than a hex code.

## fonts/

The self-hosted webfont files, the same ones Google serves (SIL Open Font
License). They live in `wp-content/uploads/bc-fonts/` on the server.

## theme/

`additional-css.css` is the Customizer's Additional CSS: brand overrides that
force black, square buttons across WooCommerce, Astra and the block editor,
plus the product card and form field fixes.

## settings.json

The handful of options worth recording: WooCommerce image sizes, the enabled
payment gateways, Astra's layout keys for posts, the Elementor display
conditions, and the WhatsApp alert settings (credentials are never exported).

## The October 2026 intake

97 products were added from the `Products/` folder: 26 moisturisers, 38
serums, 27 toners, 4 masks, a scrub, a soap, a sunscreen and one scalp
treatment. Each carries its description, benefits, key ingredients, how to
use, any caution, its brand, its shelf and the skin type, concern and format
attributes the shop filter reads, plus every photograph as featured image
and gallery.

They sit as **drafts**, and only because none of them has a price: the
packaging does not print one. Prices are the owner's to set, after which the
drafts can be published as they are.

The same intake added two shelves: `sun-care` under Skincare and `hair-care`
at the top level.

## Still open

- Prices for the 97 drafts, then publish them.
- WhatsApp API credentials (Cloud API or Twilio) so alerts send automatically.
- Instagram feed needs @beautycrib_256 connected in the WordPress admin.
- Delivery rates, physical address, opening hours and the payment provider
  are still the placeholders noted in `src/data/site.json`.
