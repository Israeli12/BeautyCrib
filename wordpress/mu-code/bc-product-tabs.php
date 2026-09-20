<?php
/**
 * Beauty Crib: surface the imported product copy as WooCommerce product tabs.
 * Benefits / Key ingredients / How to use are stored as post meta by the import.
 */

if (!defined('ABSPATH')) { exit; }

function bc_render_meta_list($key, $title, $ordered = false) {
    global $post;
    if (!$post) { return; }
    $value = get_post_meta($post->ID, $key, true);
    if (!$value) { return; }
    $lines = array_filter(array_map('trim', explode("\n", $value)));
    if (!$lines) { return; }
    echo '<h2>' . esc_html($title) . '</h2>';
    echo $ordered ? '<ol class="bc-meta-list">' : '<ul class="bc-meta-list">';
    foreach ($lines as $line) { echo '<li>' . esc_html($line) . '</li>'; }
    echo $ordered ? '</ol>' : '</ul>';
    if ($key === 'bc_key_ingredients') {
        echo '<p class="bc-note">The full ingredient list is printed on the carton. Ask us for a photograph of it before you order and we will send one.</p>';
    }
    if ($key === 'bc_how_to_use') {
        $caution = get_post_meta($post->ID, 'bc_caution', true);
        if ($caution) { echo '<p class="bc-note bc-caution"><strong>' . esc_html($caution) . '</strong></p>'; }
    }
}

// Archive headings read "Cleansers", not "Category: Cleansers".
add_filter('get_the_archive_title_prefix', '__return_empty_string');
add_filter('get_the_archive_title', function ($title) {
    return preg_replace('/^\s*(Category|Tag|Product category|Product tag|Archives|Brand)\s*:\s*/i', '', (string) $title);
}, 20);

add_filter('woocommerce_product_tabs', function ($tabs) {
    global $post;
    if (!$post) { return $tabs; }

    if (get_post_meta($post->ID, 'bc_benefits', true)) {
        $tabs['bc_benefits'] = [
            'title'    => __('Benefits', 'beautycrib'),
            'priority' => 15,
            'callback' => function () { bc_render_meta_list('bc_benefits', 'Benefits'); },
        ];
    }
    if (get_post_meta($post->ID, 'bc_key_ingredients', true)) {
        $tabs['bc_ingredients'] = [
            'title'    => __('Key ingredients', 'beautycrib'),
            'priority' => 16,
            'callback' => function () { bc_render_meta_list('bc_key_ingredients', 'Key ingredients'); },
        ];
    }
    if (get_post_meta($post->ID, 'bc_how_to_use', true)) {
        $tabs['bc_how_to_use'] = [
            'title'    => __('How to use', 'beautycrib'),
            'priority' => 17,
            'callback' => function () { bc_render_meta_list('bc_how_to_use', 'How to use', true); },
        ];
    }
    if (isset($tabs['description'])) { $tabs['description']['priority'] = 10; }
    return $tabs;
}, 20);
