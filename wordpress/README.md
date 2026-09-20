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

## theme/

`additional-css.css` is the Customizer's Additional CSS: brand overrides that
force black, square buttons across WooCommerce, Astra and the block editor,
plus the product card and form field fixes.

## settings.json

The handful of options worth recording: WooCommerce image sizes, the enabled
payment gateways, Astra's layout keys for posts, the Elementor display
conditions, and the WhatsApp alert settings (credentials are never exported).

## Still open

- WhatsApp API credentials (Cloud API or Twilio) so alerts send automatically.
- Instagram feed needs @beautycrib_256 connected in the WordPress admin.
- Delivery rates, physical address, opening hours and the payment provider
  are still the placeholders noted in `src/data/site.json`.
