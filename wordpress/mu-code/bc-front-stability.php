<?php
/**
 * Beauty Crib: stop the page reflowing after it has already painted.
 *
 * The header and footer are Elementor templates rendered inside <body> through
 * the theme's hooks. Elementor only enqueues a widget's stylesheet when that
 * widget renders, so by then <head> has been sent and the stylesheets land in
 * the body. The browser paints an unstyled header first, then jumps when the
 * CSS arrives.
 *
 * Enqueuing those few handles in <head> up front removes the jump. Each one is
 * a file the header, footer or a page already loads, so nothing new is added to
 * the page, it only arrives in time.
 */

if (!defined('ABSPATH')) { exit; }

function bc_front_head_styles() {
    return [
        'widget-nav-menu',                 // header menu
        'widget-woocommerce-menu-cart',    // header cart
        'widget-icon-list',                // header and footer lists
        'widget-social-icons',             // footer socials
        'widget-heading',
        'widget-image',
        'widget-text-editor',
        'widget-form',                     // contact and newsletter forms
        'e-apple-webkit',
    ];
}

add_action('wp_enqueue_scripts', function () {
    if (is_admin()) { return; }
    foreach (bc_front_head_styles() as $handle) {
        if (wp_style_is($handle, 'registered') && !wp_style_is($handle, 'enqueued')) {
            wp_enqueue_style($handle);
        }
    }
}, 20);

/**
 * HUSKY (the product filter) loads eleven stylesheets and its scripts on every
 * page, and its JS re-renders the product grid after the page has painted, which
 * moves the shop listing. Nothing on the site places a filter yet, so its assets
 * are left out unless a page actually contains one. Put a filter widget or the
 * [woof] shortcode on a page and its assets come back automatically.
 */
function bc_page_uses_product_filter() {
    // Decided once, on the first call, while the main query is still intact.
    // Elementor's product widgets run their own queries, so by the time scripts
    // are printed in the footer is_shop() no longer answers truthfully.
    static $cached = null;
    if ($cached !== null) { return $cached; }
    $cached = bc_detect_product_filter();
    return $cached;
}

function bc_detect_product_filter() {
    if (is_admin()) { return true; }
    // the shop and category archives carry the filter in their Elementor template
    if (function_exists('is_shop') && (is_shop() || is_product_taxonomy())) { return true; }
    $post = get_post();
    if ($post && (has_shortcode((string) $post->post_content, 'woof') || has_shortcode((string) $post->post_content, 'woof_products'))) { return true; }
    foreach ((array) get_option('sidebars_widgets', []) as $area => $widgets) {
        if ('wp_inactive_widgets' === $area) { continue; }
        foreach ((array) $widgets as $widget) {
            if (is_string($widget) && strpos($widget, 'woof') !== false) { return true; }
        }
    }
    $data = $post ? get_post_meta($post->ID, '_elementor_data', true) : '';
    if (is_string($data) && strpos($data, 'woof') !== false) { return true; }
    return false;
}

add_action('wp_enqueue_scripts', function () {
    if (bc_page_uses_product_filter()) { return; }
    global $wp_styles, $wp_scripts;
    foreach ([$wp_styles, $wp_scripts] as $assets) {
        if (!$assets) { continue; }
        foreach ((array) $assets->queue as $handle) {
            if (preg_match('/^(woof|ion\.range-slider|tooltipster)/i', $handle)) {
                $assets === $GLOBALS['wp_styles'] ? wp_dequeue_style($handle) : wp_dequeue_script($handle);
            }
        }
    }
}, 100);

add_action('wp_footer', function () {
    if (bc_page_uses_product_filter()) { return; }
    global $wp_styles, $wp_scripts;
    foreach ((array) $wp_styles->queue as $handle) { if (preg_match('/^(woof|ion\.range-slider|tooltipster)/i', $handle)) { wp_dequeue_style($handle); } }
    foreach ((array) $wp_scripts->queue as $handle) { if (preg_match('/^(woof|ion\.range-slider|tooltipster)/i', $handle)) { wp_dequeue_script($handle); } }
}, 1);
// Some of the filter's stylesheets are enqueued while the footer renders, after
// the hooks above have run, so drop them as they are printed.
add_filter('style_loader_tag', function ($tag, $handle) {
    if (!is_admin() && preg_match('/^(woof|ion\.range-slider|tooltipster)/i', $handle) && !bc_page_uses_product_filter()) { return ''; }
    return $tag;
}, 10, 2);

add_filter('script_loader_tag', function ($tag, $handle) {
    if (!is_admin() && preg_match('/^(woof|ion\.range-slider|tooltipster)/i', $handle) && !bc_page_uses_product_filter()) { return ''; }
    return $tag;
}, 10, 2);
// The design shows the whole shelf rather than a short page of it.
add_filter('loop_shop_per_page', function () { return 24; }, 20);
