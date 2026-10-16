# The product data template

What every Beauty Crib product carries, and what has to be true before it
can be published rather than left as a draft.

## Required to publish

A product missing any of these stays a draft. No exceptions, and nothing in
this list is ever guessed or filled in from a similar product.

| Field | Where it goes | Rule |
| --- | --- | --- |
| **Price** | WooCommerce regular price, UGX | Supplied by the business. Never inferred from another product, another size, or a retail price found elsewhere. A product without one is not purchasable and stays a draft. |
| **Title** | Product title | The product name as printed, without the brand. "Heartleaf Pore Control Cleansing Oil", not "Anua Heartleaf Pore Control Cleansing Oil". |
| **Brand** | `product_brand` | Must match an existing brand term exactly, or be a deliberate new one. Case and spelling follow the brand's own styling. |
| **Category** | `product_cat` | The parent shelf plus one sub-shelf from the tree below. A product that fits none of them is flagged, not forced. |
| **Main image** | Featured image | The clearest shot of the product itself. |
| **Short description** | Excerpt | One sentence, under about 20 words, saying who it is for or what it does. |
| **Description** | Long description | Two short paragraphs. What it is and who it suits; then the thing worth knowing that the label does not say outright. |

## Expected where the packaging shows it

Recorded when legible on the carton or bottle, left out when not. Never
invented, and never carried over from a similar product.

| Field | Where it goes |
| --- | --- |
| Key ingredients | `bc_key_ingredients` meta, one per line |
| Benefits | `bc_benefits` meta, one per line |
| How to use | `bc_how_to_use` meta, one per line |
| Caution | `bc_caution` meta — required whenever the formula carries an acid, a retinoid or a high-strength active |
| Size / volume | In the description, exactly as printed (`50 ml`, `1.69 fl. oz.`) |
| Skin type | `pa_skin-type` |
| Concern | `pa_concern` |
| Format | `pa_format` |
| Gallery | Remaining shots, in order, after the featured image |
| Image alt text | `<product name> by <brand>` on the main shot; the angle named on the rest |

## The category tree

```
skincare
  cleansers
  toners            (Toners & Essence)
  serums-treatments
  moisturisers
  sun-care
  masks
  scrubs
  soap
hair-care
```

## What is never done

- No price is invented, rounded, or copied from a similar product.
- No ingredient, size, or specification is written down unless it is legible
  on the packaging.
- No medical claim, and no promise of a result. Descriptions say what a
  formula is built around, not what it will cure.
- No existing product, order, or customer record is edited while new
  products are being added.
- A product is not reported as published until its live URL has been
  fetched and checked.
