<?php
/**
 * Beauty Crib: tidy labels for the shop filter.
 *
 * The filter panel takes its group headings from the taxonomy labels, which
 * WooCommerce registers as "Product brands", "Product Concern" and so on. These
 * are the headings a customer reads, so they are shortened here.
 */

if (!defined('ABSPATH')) { exit; }

foreach ([
    'pa_skin-type' => 'Skin type',
    'pa_concern'   => 'Concern',
    'pa_format'    => 'Format',
] as $taxonomy => $label) {
    add_filter('woocommerce_taxonomy_args_' . $taxonomy, function ($args) use ($label) {
        $args['label'] = $label;
        $args['labels']['name'] = $label;
        $args['labels']['singular_name'] = $label;
        return $args;
    });
}

add_filter('woocommerce_taxonomy_args_product_brand', function ($args) {
    $args['label'] = 'Brand';
    $args['labels']['name'] = 'Brand';
    $args['labels']['singular_name'] = 'Brand';
    return $args;
});

// The brand taxonomy is not registered through WooCommerce's attribute filters,
// so it is renamed where WordPress registers it.
add_filter('register_taxonomy_args', function ($args, $taxonomy) {
    if ('product_brand' === $taxonomy) {
        $args['label'] = 'Brand';
        $args['labels'] = array_merge((array) ($args['labels'] ?? []), ['name' => 'Brand', 'singular_name' => 'Brand']);
    }
    return $args;
}, 10, 2);

/**
 * HUSKY decides whether to load its scripts by looking for its shortcode in the
 * page content. Ours lives in the shop's Elementor template, so it never finds
 * it and the checkboxes do nothing. Load them where the filter is actually used.
 */
add_action('wp_enqueue_scripts', function () {
    if (is_admin() || !function_exists('is_shop')) { return; }
    if (!is_shop() && !is_product_taxonomy()) { return; }
    foreach (['woof_front', 'woof_url_parser', 'woof_qs_script', 'ion.range-slider', 'chosen', 'icheck'] as $handle) {
        if (wp_script_is($handle, 'registered') && !wp_script_is($handle, 'enqueued')) { wp_enqueue_script($handle); }
    }
}, 30);

/**
 * On a phone the filter is a tall stack of checkboxes sitting above the products,
 * so it is wrapped in a <details>: a tap to open, no JavaScript. On desktop the
 * summary is hidden and the panel is always shown (see Additional CSS).
 */
add_shortcode('bc_shop_filter', function () {
    $inner = do_shortcode('[woof]');
    if (trim($inner) === '') { return ''; }
    // bc-shop-match.php wraps this in the drawer's heading and its close button.
    $inner = apply_filters('bc_shop_filter_inner', $inner);
    return '<details class="bc-filter"><summary class="bc-filter__summary">Filter products</summary><div class="bc-filter__body">' . $inner . '</div></details>';
});
