<?php
/**
 * Beauty Crib: the Shop mega menu.
 *
 * The prototype drops a three-column panel under Shop: the top-level shelves,
 * the skincare shelves, and an editorial card pointing at Cleansers. This
 * rebuilds it on the WordPress header.
 *
 * Every column is read from WooCommerce rather than written out here. The
 * prototype's version was hand-written and quietly went stale - it outlived a
 * renamed shelf and never gained the three added after it - so this one is
 * generated, and the panel simply follows whatever the catalogue says.
 */

if (!defined('ABSPATH')) { exit; }

/** Shelves that have something on them, in the order WooCommerce sorts them. */
function bc_menu_terms($parent = 0) {
    $terms = get_terms([
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
        'parent'     => $parent,
        'orderby'    => 'name',
        'exclude'    => [get_option('default_product_cat')],
    ]);
    if (is_wp_error($terms)) { return []; }
    // Every shelf is listed, whether or not WooCommerce has counted anything
    // onto it yet: the count only follows published products, so filtering on
    // it hides shelves that are real and about to fill.
    return $terms;
}

/**
 * The editorial card. It names the shelf's real size and three of the brands on
 * it, so the panel says something true rather than something decorative.
 */
function bc_menu_promo_html() {
    $term = get_term_by('slug', 'cleansers', 'product_cat');
    if (!$term || !$term->count) { return ''; }

    $brands = get_terms([
        'taxonomy'   => 'product_brand',
        'hide_empty' => true,
        'number'     => 3,
        'orderby'    => 'count',
        'order'      => 'DESC',
        'object_ids' => get_posts([
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'tax_query'      => [['taxonomy' => 'product_cat', 'field' => 'term_id', 'terms' => $term->term_id]],
        ]),
    ]);
    $names = (is_wp_error($brands) || !$brands) ? [] : wp_list_pluck($brands, 'name');

    $note = sprintf(
        _n('%s product', '%s products', $term->count, 'beautycrib'),
        number_format_i18n($term->count)
    );
    if ($names) {
        $note .= ' ' . sprintf(__('from %s and more', 'beautycrib'), implode(', ', $names));
    }

    return sprintf(
        '<a class="bc-mega__promo" href="%s"><span class="bc-mega__eyebrow">%s</span>'
        . '<span class="bc-mega__promo-title">%s</span><span class="bc-mega__promo-note">%s</span></a>',
        esc_url(get_term_link($term)),
        esc_html__('The edit', 'beautycrib'),
        esc_html__('Cleansers, chosen properly', 'beautycrib'),
        esc_html($note)
    );
}

function bc_mega_menu_html() {
    $column = function ($eyebrow, $terms) {
        if (!$terms) { return ''; }
        $items = '';
        foreach ($terms as $t) {
            $items .= sprintf('<li><a href="%s">%s</a></li>', esc_url(get_term_link($t)), esc_html($t->name));
        }
        return sprintf(
            '<div class="bc-mega__col"><p class="bc-mega__eyebrow">%s</p><ul class="bc-mega__list">%s</ul></div>',
            esc_html($eyebrow),
            $items
        );
    };

    $skincare = get_term_by('slug', 'skincare', 'product_cat');

    $html  = '<div class="bc-mega"><div class="bc-mega__inner">';
    $html .= $column(__('Categories', 'beautycrib'), bc_menu_terms(0));
    $html .= $skincare ? $column(__('Skincare', 'beautycrib'), bc_menu_terms($skincare->term_id)) : '';
    $promo = bc_menu_promo_html();
    $html .= $promo ? '<div class="bc-mega__col bc-mega__col--wide">' . $promo . '</div>' : '';
    $html .= '</div></div>';

    return $html;
}

/** Is this the menu item that points at the shop? */
function bc_is_shop_menu_item($item) {
    $shop_id = wc_get_page_id('shop');
    if ($shop_id > 0 && (int) $item->object_id === $shop_id && $item->object === 'page') { return true; }
    return untrailingslashit($item->url) === untrailingslashit(wc_get_page_permalink('shop'));
}

add_filter('nav_menu_css_class', function ($classes, $item, $args, $depth) {
    if ($depth === 0 && bc_is_shop_menu_item($item)) { $classes[] = 'bc-mega-parent'; }
    return $classes;
}, 10, 4);

add_filter('walker_nav_menu_start_el', function ($output, $item, $depth, $args) {
    if ($depth !== 0 || !bc_is_shop_menu_item($item)) { return $output; }
    return $output . bc_mega_menu_html();
}, 10, 4);

/**
 * The panel is drawn in <head> for the same reason as everything else here: a
 * stylesheet that lands after the paint moves the page under the cursor.
 */
add_action('wp_head', function () {
    ?>
<style id="bc-mega-menu">
.bc-mega{display:none}
@media (min-width:1025px){
  /* Elementor positions four wrappers between the menu item and the header, so
     an absolutely positioned panel would anchor to the 72px-wide "Shop" link
     and get clipped by the overflow rule on <body>. Pinning it to the viewport
     instead sidesteps all four, and keeps it under a sticky header: the top
     edge is measured once and kept in --bc-header-bottom. It stays a child of
     the menu item, so hovering the panel still counts as hovering the item. */
  .bc-mega{display:block;position:fixed;top:var(--bc-header-bottom,72px);left:50%;transform:translate(-50%,8px);z-index:999;
    width:min(920px,90vw);padding:clamp(24px,3vw,40px);
    background:#fff;color:var(--e-global-color-primary);border:1px solid var(--e-global-color-bcline);
    opacity:0;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility .18s}
  li.bc-mega-parent:hover > .bc-mega,li.bc-mega-parent:focus-within > .bc-mega{opacity:1;visibility:visible;transform:translate(-50%,0)}
  .bc-mega__inner{display:flex;gap:clamp(24px,4vw,64px)}
  .bc-mega__col{flex:1 1 auto}
  .bc-mega__col--wide{flex:1 1 40%}
  .bc-mega__eyebrow{margin:0;font-family:var(--e-global-typography-accent-font-family),sans-serif;
    font-size:11px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;color:var(--e-global-color-bcmid)}
  .bc-mega__list{margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;list-style:none}
  .bc-mega__list a{font-family:var(--e-global-typography-bcuil-font-family),sans-serif;font-size:15px;
    color:var(--e-global-color-primary);text-decoration:none}
  .bc-mega__list a:hover{text-decoration:underline;text-underline-offset:.2em}
  .bc-mega__promo{display:flex;flex-direction:column;gap:8px;height:100%;padding:20px;
    background:var(--e-global-color-accent,#F7F7F5);text-decoration:none;transition:background .18s ease}
  .bc-mega__promo:hover{background:var(--e-global-color-bcline,#E8E8E5)}
  .bc-mega__promo-title{font-family:var(--e-global-typography-primary-font-family),serif;font-size:1.5rem;
    line-height:1.1;color:var(--e-global-color-primary)}
  .bc-mega__promo-note{font-family:var(--e-global-typography-bcuil-font-family),sans-serif;font-size:13px;
    color:var(--e-global-color-bcmid)}
}
</style>
<?php
}, 3);

/** Keep --bc-header-bottom on the header's real bottom edge. */
add_action('wp_footer', function () {
    ?>
<script id="bc-mega-menu-js">
(function () {
  var header = document.querySelector('.xpro-theme-builder-header, header');
  if (!header) { return; }
  function place() {
    document.documentElement.style.setProperty(
      '--bc-header-bottom', Math.max(0, header.getBoundingClientRect().bottom) + 'px'
    );
  }
  place();
  addEventListener('scroll', place, { passive: true });
  addEventListener('resize', place);
})();
</script>
<?php
}, 100);
