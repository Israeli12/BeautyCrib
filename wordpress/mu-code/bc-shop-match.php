<?php
/**
 * Beauty Crib: bring the WooCommerce shop in line with the prototype.
 *
 * The prototype at beautycrib.vercel.app is the design the shop is meant to
 * match. WooCommerce's own loop differs from it in four ways, and each one is
 * handled here:
 *
 *   1. The toolbar reads "Showing 1-24 of 63 results" and "Default sorting",
 *      where the design reads "63 products" and "Featured".
 *   2. The wishlist heart and the add-to-cart button sit stacked underneath the
 *      card. In the design the heart is on the photograph and the button only
 *      appears on hover.
 *   3. A product with no price shows nothing at all and an unexplained
 *      "Read more" button. The design says "Price on request" and offers to ask
 *      on WhatsApp.
 *   4. The filter is a panel above the grid. In the design it is a drawer.
 *
 * Everything visual is printed in <head> rather than enqueued late, for the
 * same reason as bc-front-stability.php: styles that arrive after the paint
 * move the page under the cursor.
 */

if (!defined('ABSPATH')) { exit; }

/** The shop and the category archives, and nothing else. */
function bc_is_catalogue_page() {
    return function_exists('is_shop') && (is_shop() || is_product_taxonomy());
}

/* ------------------------------------------------------------------ *
 * 1. The toolbar
 * ------------------------------------------------------------------ */

add_filter('woocommerce_result_count_params', '__return_empty_array', 20);

remove_action('woocommerce_before_shop_loop', 'woocommerce_result_count', 20);
add_action('woocommerce_before_shop_loop', function () {
    global $wp_query;
    $total = (int) $wp_query->found_posts;
    printf(
        '<p class="woocommerce-result-count bc-result-count">%s</p>',
        esc_html(sprintf(_n('%s product', '%s products', $total, 'beautycrib'), number_format_i18n($total)))
    );
}, 20);

add_filter('woocommerce_catalog_orderby', function ($options) {
    return [
        'menu_order' => __('Featured', 'beautycrib'),
        'price'      => __('Price, low to high', 'beautycrib'),
        'price-desc' => __('Price, high to low', 'beautycrib'),
        'title'      => __('Name, A to Z', 'beautycrib'),
        'date'       => __('Latest', 'beautycrib'),
    ];
});

add_filter('woocommerce_default_catalog_orderby', function () { return 'menu_order'; });

/* ------------------------------------------------------------------ *
 * 2. The card: heart on the photograph, button on hover
 * ------------------------------------------------------------------ */

// The wishlist plugin prints its button after the title. Lift it into the
// image wrapper instead, which is where the design puts it.
add_action('woocommerce_before_shop_loop_item', function () {
    echo '<div class="bc-card__media">';
}, 5);

add_action('woocommerce_before_shop_loop_item_title', function () {
    if (function_exists('tinv_get_option') && shortcode_exists('ti_wishlists_addtowishlist')) {
        echo '<div class="bc-card__wishlist">' . do_shortcode('[ti_wishlists_addtowishlist]') . '</div>';
    }
    echo '<div class="bc-card__quick">';
    woocommerce_template_loop_add_to_cart();
    echo '</div></div>';
}, 99);

// ...and stop it printing a second time in its usual place.
add_action('init', function () {
    if (class_exists('TInvWL_Public_AddToWishlist')) {
        remove_action('woocommerce_after_shop_loop_item', ['TInvWL_Public_AddToWishlist', 'htmlout'], 15);
    }
}, 20);

remove_action('woocommerce_after_shop_loop_item', 'woocommerce_template_loop_add_to_cart', 10);

/* ------------------------------------------------------------------ *
 * 3. Products the business has not priced yet
 * ------------------------------------------------------------------ */

/** The WhatsApp number the rest of the site already uses. */
function bc_whatsapp_number() { return '256784956653'; }

function bc_price_enquiry_url($product) {
    return 'https://wa.me/' . bc_whatsapp_number() . '?text=' . rawurlencode(
        'Hello Beauty Crib, what is the price of the ' . wp_strip_all_tags($product->get_name()) . '?'
    );
}

add_filter('woocommerce_get_price_html', function ($html, $product) {
    if ($product->get_price() === '' || $product->get_price() === null) {
        return '<span class="bc-price-on-request">' . esc_html__('Price on request', 'beautycrib') . '</span>';
    }
    return $html;
}, 10, 2);

// Without a price there is nothing to charge, so it must not reach the cart.
add_filter('woocommerce_is_purchasable', function ($purchasable, $product) {
    if ($product->get_price() === '' || $product->get_price() === null) { return false; }
    return $purchasable;
}, 10, 2);

// Replace the "Read more" WooCommerce falls back to with something that says
// what it is for.
add_filter('woocommerce_loop_add_to_cart_link', function ($html, $product) {
    if ($product->is_purchasable()) { return $html; }
    return sprintf(
        '<a href="%s" target="_blank" rel="noopener" class="button bc-ask-price">%s</a>',
        esc_url(bc_price_enquiry_url($product)),
        esc_html__('Ask for the price', 'beautycrib')
    );
}, 10, 2);

add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (!$product || $product->is_purchasable()) { return; }
    printf(
        '<p class="bc-ask-price-single"><a class="button alt" href="%s" target="_blank" rel="noopener">%s</a>'
        . '<span class="bc-ask-price-note">%s</span></p>',
        esc_url(bc_price_enquiry_url($product)),
        esc_html__('Ask for the price', 'beautycrib'),
        esc_html__('This one is in stock but not yet priced online. Message us and we will confirm it.', 'beautycrib')
    );
}, 30);

/* ------------------------------------------------------------------ *
 * 4. The filter drawer, and the styling for all of the above
 * ------------------------------------------------------------------ */

add_action('wp_head', function () {
    if (!bc_is_catalogue_page()) { return; }
    ?>
<style id="bc-shop-match">
/* Toolbar */
.woocommerce .bc-result-count,.woocommerce-page .bc-result-count{float:none;margin:0;font-family:var(--e-global-typography-bcuil-font-family),sans-serif;font-size:13px;color:var(--e-global-color-bcmid)}
.woocommerce .woocommerce-ordering,.woocommerce-page .woocommerce-ordering{float:none;margin:0}
.woocommerce .woocommerce-ordering::before{content:'SORT';margin-right:12px;font-family:var(--e-global-typography-accent-font-family),sans-serif;font-size:11px;letter-spacing:1.6px;color:var(--e-global-color-bcmid)}
.woocommerce .woocommerce-ordering{display:flex;align-items:center}

/* Card: the heart sits on the photograph, the button waits for a hover */
.woocommerce ul.products li.product .bc-card__media{position:relative;overflow:hidden}
.woocommerce ul.products li.product .bc-card__wishlist{position:absolute;top:12px;right:12px;z-index:2}
.woocommerce ul.products li.product .bc-card__wishlist .tinv-wraper{min-height:0;margin:0}
.woocommerce ul.products li.product .bc-card__wishlist .tinvwl_add_to_wishlist_button{display:grid;place-items:center;width:36px;height:36px;margin:0;padding:0;background:rgba(255,255,255,.92)!important;border:0!important;font-size:0}
.woocommerce ul.products li.product .bc-card__wishlist .tinvwl_add_to_wishlist_button::before{font-size:15px;margin:0}
.woocommerce ul.products li.product .bc-card__wishlist .tinvwl-tooltip{display:none!important}
.woocommerce ul.products li.product .bc-card__quick{position:absolute;left:12px;right:12px;bottom:12px;z-index:2;opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease}
.woocommerce ul.products li.product:hover .bc-card__quick,.woocommerce ul.products li.product:focus-within .bc-card__quick{opacity:1;transform:none}
.woocommerce ul.products li.product .bc-card__quick .button{display:block;width:100%;margin:0;text-align:center;background:var(--e-global-color-primary)!important;color:#fff!important;border-radius:0!important;font-family:var(--e-global-typography-bcbtn-font-family),sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:12px 14px!important}
/* A touch screen has no hover, so the button simply stays put. */
@media (hover:none){.woocommerce ul.products li.product .bc-card__quick{position:static;opacity:1;transform:none;margin-top:12px}}

.bc-price-on-request{font-family:var(--e-global-typography-bcuil-font-family),sans-serif;color:var(--e-global-color-bcmid)}
.bc-ask-price-single{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bc-ask-price-note{font-size:13px;color:var(--e-global-color-bcmid)}

/* Filter: a drawer, the way the design has it */
.bc-filter__summary{position:relative}
@media (min-width:1025px){
  .bc-filter > .bc-filter__summary{display:flex;width:auto;margin:0;padding:0;border:0;gap:10px}
  .bc-filter > .bc-filter__summary::after{content:''}
  .bc-filter[open] > .bc-filter__body{position:fixed;top:0;left:0;z-index:9999;width:min(380px,92vw);height:100vh;overflow-y:auto;padding:28px 26px 110px;background:#fff;border-right:1px solid var(--e-global-color-bcline);box-shadow:0 0 60px rgba(0,0,0,.12);animation:bc-drawer .22s ease}
  .bc-filter:not([open]) > .bc-filter__body{display:none}
  .bc-filter[open]::after{content:'';position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.28)}
}
@keyframes bc-drawer{from{transform:translateX(-14px);opacity:.4}to{transform:none;opacity:1}}
.bc-drawer__head{display:flex;align-items:center;justify-content:space-between;margin:0 0 22px}
.bc-drawer__title{margin:0;font-family:var(--e-global-typography-accent-font-family),sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--e-global-color-bcmid)}
.bc-drawer__close{border:0;background:none;font-size:20px;line-height:1;cursor:pointer;color:var(--e-global-color-primary)}
.bc-drawer__done{position:sticky;bottom:0;margin:22px -26px -110px;padding:18px 26px 26px;background:#fff;border-top:1px solid var(--e-global-color-bcline)}
.bc-drawer__done .button{display:block;width:100%;text-align:center}
</style>
<?php
}, 2);

/**
 * The drawer needs a heading, a close control and a button that shuts it again;
 * the <details> element supplies the open and closed state, so the script only
 * has to toggle it and close on Escape or a click on the backdrop.
 */
add_filter('bc_shop_filter_inner', function ($inner) {
    $head = '<div class="bc-drawer__head"><p class="bc-drawer__title">Filter</p>'
          . '<button type="button" class="bc-drawer__close" data-bc-filter-close aria-label="Close filters">&times;</button></div>';
    $done = '<div class="bc-drawer__done"><button type="button" class="button" data-bc-filter-close>Show products</button></div>';
    return $head . $inner . $done;
});

add_action('wp_footer', function () {
    if (!bc_is_catalogue_page()) { return; }
    ?>
<script id="bc-shop-match-js">
(function () {
  var panel = document.querySelector('.bc-filter');
  if (!panel) { return; }
  function close() { panel.removeAttribute('open'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-bc-filter-close]')) { e.preventDefault(); close(); return; }
    // The backdrop is the panel's own ::after, so a click that lands on the
    // element itself rather than its contents means the backdrop was hit.
    if (panel.hasAttribute('open') && e.target === panel) { close(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
})();
</script>
<?php
}, 100);
