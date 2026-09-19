# WooCommerce setup

What to configure so the prototype becomes a working shop. Written against the existing install at
`marketing.beautycrib.ug` (WordPress 7.1, WooCommerce 11.1, Elementor 4.2 + PRO Elements,
Hello Elementor).

Nothing in this document has been applied to that site. It is a plan, in order.

---

## 1. Settings to correct first

| Setting | Current | Should be | Where |
|---|---|---|---|
| Currency decimals | 2 (`UGX 70,000.00`) | **0** | WooCommerce → Settings → General |
| Currency position | — | Left with a space (`UGX 70,000`) | same |
| Thousand separator | — | `,` | same |
| Post permalinks | `/2026/09/15/post-name/` | `/journal/%postname%/` | Settings → Permalinks |
| Product permalinks | default | `/product/` (already correct) | same |
| Shop page | Shop | keep | WooCommerce → Settings → Products |
| Selling location | — | Uganda only, or add countries you ship to | same |

### Demo content to clear

The store currently holds 20 draft products priced 260–400 (an import leftover) and seven published
products with no images. Decide per product: delete, or complete with photography and UGX pricing.
Categories such as "Toothpaste & Oral Care" and "Cream Blush" do not appear in this design and can go.

---

## 2. Catalogue structure

### Categories

```
Skincare
  Cleansers            <- the 17 products live here
  Serums & Treatments
  Moisturisers
  Sun Care
  Masks & Exfoliants
Makeup
  Face / Eyes / Lips
Hair Care
  Shampoo & Conditioner / Treatments / Styling
Body Care
  Wash / Lotions & Oils / Scrubs
Fragrance
  Perfume / Body Mist
Beauty Tools
  Brushes / Sponges / Devices
```

Give every category a description and an image; the category template uses both.
Categories without products show an editorial "arriving soon" page with a notify form, exactly as in
the prototype, so the navigation never leads anywhere dead.

### Brands

WooCommerce's built-in brand taxonomy is already enabled. Create: Anua, APRILSKIN, COSRX, Isntree,
K-SECRET, Medicube, Nineless, PanOxyl, SKIN1004, SOME BY MI.

### Global attributes (Products → Attributes)

| Attribute | Used for | Values in use |
|---|---|---|
| Skin type | Filter, product page chips | All, Dry, Oily, Combination, Normal, Sensitive, Acne-prone |
| Concern | Filter, product page chips | Acne & breakouts, Pores & blackheads, Dryness, Dullness & uneven tone, Sensitivity, Makeup removal, Oil control, Texture |
| Format | Product page | Foam, Cleansing oil, Balm, Powder, Gel, Cream wash |
| Size | Variations | Fill in from the cartons |
| Shade | Variations, for makeup later | |

### Product fields (ACF free plugin)

The design shows four accordions that WooCommerce has no native home for. Add an ACF field group
attached to Products:

| Field name | Type | Feeds |
|---|---|---|
| `benefits` | Repeater (text) | "Benefits" accordion |
| `key_ingredients` | Repeater (text) | "Key ingredients" accordion |
| `full_ingredients` | Textarea | Optional, once transcribed from cartons |
| `how_to_use` | Repeater (text) | "How to use" accordion |
| `caution` | Text | Warning line (PanOxyl bleaches fabric, for example) |

The product description goes in the main editor, and the one-line benefit in the short description.

### Importing the 17 products

`src/data/products.json` holds every field already written: name, brand, price in UGX, skin types,
concerns, format, SKU, description, benefits, key ingredients and directions. Convert it to a
WooCommerce CSV, or paste it in by hand in about an hour. Images are in
`website/assets/img/products/` at 1500px, ready to upload as the main and second gallery image.

---

## 3. Shipping

WooCommerce ships a Uganda district list, which it calls "State". Relabel it "District" at checkout.

| Zone | Region | Methods |
|---|---|---|
| Kampala | Uganda → Kampala | Flat rate "Kampala delivery"; Free shipping above a threshold; Local pickup |
| Wakiso and Entebbe | Uganda → Wakiso | Flat rate "Wakiso delivery"; Flat rate "Entebbe delivery"; Local pickup |
| Upcountry | Uganda (everything else) | Flat rate "Upcountry courier"; Local pickup |

Entebbe sits inside Wakiso district, so WooCommerce cannot separate it by zone. Offering it as a
second flat rate inside the Wakiso zone is the simplest answer; a town-level zones plugin is the
alternative if the rates differ a lot.

Set the rates in WooCommerce, then mirror them in `src/data/site.json` so the prototype shows the
same numbers.

---

## 4. Checkout fields

Use a checkout field editor plugin or a small snippet in the child theme:

- Relabel **State → District**, make it required
- Relabel **Address line 1 → Area, street and landmark**, and drop address line 2
- **Hide Postcode**: Uganda does not use postal codes
- **Hide Company** and lock **Country** to Uganda
- Make **Phone** required, and validate `+256XXXXXXXXX` or `07XXXXXXXX`
- Relabel **Order notes → Delivery instructions**, with the placeholder from the prototype

---

## 5. Payments

Card details must never touch WordPress. Use a gateway that hosts or tokenises the card form, which
keeps you in the lightest PCI bracket.

Gateways commonly used in Uganda that offer a WooCommerce plugin and advertise MTN Mobile Money,
Airtel Money and Visa/Mastercard support: **Flutterwave**, **Pesapal** and **DPO Pay**. Compare
current fees, settlement time to a Ugandan bank account, and support responsiveness before choosing.
Confirm each one's live status directly with the provider.

Also enable, from WooCommerce itself:

- **Direct bank transfer** (BACS) with your account details in the instructions
- **Cash on delivery**, restricted to the Kampala and Wakiso zones under the method settings

Order flow the prototype assumes: Pending payment (waiting for the Mobile Money prompt) → Processing
→ Completed. Consider a custom "Out for delivery" status once volumes justify it.

---

## 6. Plugins

| Need | Suggested | Note |
|---|---|---|
| Wishlist | TI WooCommerce Wishlist, or YITH Wishlist | The design expects a saved wishlist and a counter in the header |
| Product filters | HUSKY (already installed, inactive) or WooCommerce's own filter blocks | Brand, skin type, concern, price |
| Custom fields | ACF free | The four product accordions |
| SEO | SiteSEO (already installed) or Rank Math | Titles, meta, sitemap, schema |
| Forms | Elementor Pro Forms | WPForms then becomes redundant |
| Backups | Backuply (already installed) | Activate before launch |

### Plugins worth reviewing

Seven add-on plugins are active: ElementsKit Lite, Xpro Elementor Addons, Xpro Theme Builder,
aThemes Addons, Merchant, WPForms Lite and Angie. This design uses none of them. Each adds CSS and
JavaScript to every page. Deactivating the unused ones is the single cheapest performance win
available on the site.

---

## 7. SEO configuration

- Titles and meta descriptions for all 68 pages are in the prototype's `<head>`; copy them across
- Product title pattern: `{Brand} {Product} Price in Uganda | Beauty Crib`, shortened automatically
  when it would exceed 62 characters
- Product meta pattern: `{Brand} {Product}, {price}. {benefit} Delivered across Uganda.`
- Mark **Cart, Checkout, Order received, My account, Wishlist and Search** as `noindex, follow`
- Schema: Organization and WebSite on the home page, Product and Offer on products, Article on
  journal posts, FAQPage where FAQs appear, BreadcrumbList everywhere. Most SEO plugins emit these
  once the page types are set correctly
- Aggregate rating markup only once real reviews exist. The prototype deliberately shows
  "No reviews yet" rather than inventing ratings
- Submit `sitemap.xml` in Google Search Console, and set the canonical domain

---

## 8. Emails and order admin

- Set the email logo to `website/assets/img/logo/lockup.png`, base colour `#000000`, background
  `#FFFFFF`, body text `#111111`
- Turn on: New order (to you), Processing order, Completed order, Refunded order, Customer note
- Add a line to the Processing email about how Mobile Money confirmation works
- Enable stock management with low-stock notifications, and set SKUs from `products.json`

---

## 9. Security and launch checklist

- HTTPS across the site, with mixed content resolved
- Two-factor authentication on the administrator account, and unique roles for staff
- Limit login attempts, and rename or protect `wp-login.php`
- Keep WordPress, WooCommerce and plugins updated; take a Backuply snapshot before each update
- Never store card data; confirm the gateway's callback URLs use HTTPS
- Privacy Policy and Terms reviewed by a qualified adviser
- Test a real order end to end with a small amount before announcing the site
