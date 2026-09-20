<?php
/**
 * Beauty Crib Journal helpers used by the Elementor single post template.
 *
 * - bc_reading_time    post meta, e.g. "4 min read", refreshed on every save.
 * - bc_products        post meta, product IDs the article recommends.
 * - elementor/query/bc_post_products   feeds the "Shop the story" Posts widget
 *   (Query ID: bc_post_products) with those products, topped up with featured
 *   products so the sidebar always shows three.
 */

if (!defined('ABSPATH')) { exit; }

function bc_reading_time_for($post_id) {
    $words = str_word_count(wp_strip_all_tags((string) get_post_field('post_content', $post_id)));
    return max(1, (int) ceil($words / 200)) . ' min read';
}

add_action('save_post_post', function ($post_id) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) { return; }
    update_post_meta($post_id, 'bc_reading_time', bc_reading_time_for($post_id));
});

add_action('elementor/query/bc_post_products', function ($query) {
    $limit   = 3;
    $post_id = is_singular('post') ? get_queried_object_id() : 0;
    $ids     = $post_id ? array_values(array_filter(array_map('intval', (array) get_post_meta($post_id, 'bc_products', true)))) : [];
    $ids     = array_slice($ids, 0, $limit);
    if (count($ids) < $limit && function_exists('wc_get_products')) {
        $extra = wc_get_products(['status' => 'publish', 'featured' => true, 'limit' => $limit - count($ids), 'exclude' => $ids, 'return' => 'ids']);
        $ids   = array_merge($ids, $extra);
    }
    $query->set('post_type', 'product');
    $query->set('post__in', $ids ? $ids : [0]);
    $query->set('orderby', 'post__in');
    $query->set('posts_per_page', $limit);
    $query->set('ignore_sticky_posts', true);
});
