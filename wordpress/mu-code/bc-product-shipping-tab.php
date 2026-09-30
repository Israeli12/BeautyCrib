<?php
/**
 * Beauty Crib: the shipping and returns tab on a product page.
 *
 * The same detail the design shows, so a customer can see when an order arrives
 * without leaving the product they are looking at.
 */

if (!defined('ABSPATH')) { exit; }

add_filter('woocommerce_product_tabs', function ($tabs) {
    $tabs['bc_shipping'] = [
        'title'    => 'Shipping and returns',
        'priority' => 18,
        'callback' => function () {
            $rows = [
                'Kampala delivery'   => 'Same or next day',
                'Wakiso delivery'    => '1 to 2 working days',
                'Entebbe delivery'   => '1 to 2 working days',
                'Upcountry courier'  => '2 to 4 working days',
                'Pick up in Kampala' => 'Ready within 24 hours',
            ];
            echo '<h2>Shipping and returns</h2>';
            echo '<p>Dispatched from Kampala. Orders placed before 15:00 are dispatched the same working day.</p>';
            echo '<ul class="bc-shipping-list">';
            foreach ($rows as $where => $when) {
                echo '<li><strong>' . esc_html($where) . ':</strong> ' . esc_html($when) . '</li>';
            }
            echo '</ul>';
            printf(
                '<p>Unopened products can be returned within 7 days. <a href="%s">Read the returns policy</a>.</p>',
                esc_url(home_url('/returns-refunds/'))
            );
        },
    ];
    return $tabs;
}, 30);

// Skin type, concern and format are shown in the product summary now.
add_filter('woocommerce_product_tabs', function ($tabs) { unset($tabs['additional_information']); return $tabs; }, 40);
