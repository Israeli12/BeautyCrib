<?php
/**
 * Beauty Crib: send each new order to Beauty Crib's WhatsApp from the checkout.
 *
 * A website can prepare a WhatsApp message but cannot press Send for the
 * customer. So when "Place order" succeeds, WhatsApp opens with the order
 * written out and addressed to Beauty Crib, and the thank-you page keeps a
 * button for browsers that block the automatic window.
 *
 * The first product link in the message gives WhatsApp its preview image.
 * Automatic server-side delivery (with product photos) is handled by
 * bc-whatsapp-notifications.php once API credentials are added.
 */

if (!defined('ABSPATH')) { exit; }

function bc_wa_shop_number() {
    $numbers = function_exists('bc_wa_recipients') ? bc_wa_recipients() : [];
    return $numbers ? $numbers[0] : '256784956653';
}

/** Plain-text money for WhatsApp: no markup, no non-breaking space. */
function bc_wa_plain_price($amount, $order) {
    if (function_exists('bc_wa_price')) { return bc_wa_price($amount, $order); }
    $text = html_entity_decode(wp_strip_all_tags(wc_price($amount, ['currency' => $order->get_currency()])), ENT_QUOTES, 'UTF-8');
    return trim(str_replace("\xC2\xA0", ' ', $text));
}

function bc_wa_customer_message(WC_Order $order) {
    $lines   = [];
    $lines[] = 'Hello Beauty Crib, I have just placed order #' . $order->get_order_number() . ' on beautycrib.ug.';
    $lines[] = '';
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $pid     = $product ? ($product->get_parent_id() ?: $product->get_id()) : 0;
        $brand   = $pid ? wp_get_post_terms($pid, 'product_brand', ['fields' => 'names']) : [];
        $name    = ($brand && !is_wp_error($brand) ? $brand[0] . ' ' : '') . $item->get_name();
        $lines[] = $item->get_quantity() . ' x ' . $name . ' - ' . bc_wa_plain_price($item->get_total(), $order);
        if ($pid) { $lines[] = get_permalink($pid); }
    }
    $lines[] = '';
    if ($order->get_shipping_method()) {
        $lines[] = 'Delivery: ' . $order->get_shipping_method() . ' - ' . bc_wa_plain_price($order->get_shipping_total(), $order);
    }
    $lines[] = 'Total: ' . bc_wa_plain_price($order->get_total(), $order);
    $lines[] = 'Payment: ' . ($order->get_payment_method_title() ?: 'Not chosen');
    $lines[] = '';
    $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    if ($name) { $lines[] = 'Name: ' . $name; }
    if ($order->get_billing_phone()) { $lines[] = 'Phone: ' . $order->get_billing_phone(); }
    $raw     = $order->get_formatted_shipping_address() ?: $order->get_formatted_billing_address();
    $address = trim(preg_replace('/\s+/', ' ', wp_strip_all_tags(str_replace(['<br/>', '<br />', '<br>'], ', ', (string) $raw))));
    if ($address) { $lines[] = 'Deliver to: ' . $address; }
    if ($order->get_customer_note()) { $lines[] = 'Note: ' . $order->get_customer_note(); }
    return implode("\n", $lines);
}

function bc_wa_customer_link(WC_Order $order) {
    return 'https://wa.me/' . bc_wa_shop_number() . '?text=' . rawurlencode(bc_wa_customer_message($order));
}

// Hand the link back with the successful checkout response, so it can open
// inside the same click as "Place order".
add_filter('woocommerce_payment_successful_result', function ($result, $order_id) {
    $order = wc_get_order($order_id);
    if ($order && is_array($result)) { $result['bc_whatsapp'] = bc_wa_customer_link($order); }
    return $result;
}, 20, 2);

add_action('woocommerce_review_order_after_submit', function () {
    echo '<p class="bc-wa-note">When your order is placed, WhatsApp opens with the details ready to send to Beauty Crib on +256 784 956 653.</p>';
});

// Printed in the footer rather than attached to wc-checkout: the Elementor
// checkout widget enqueues that script late, after wp_enqueue_scripts has run.
// triggerHandler() does not bubble, so bind to the form itself.
add_action('wp_footer', function () {
    if (!function_exists('is_checkout') || !is_checkout() || is_wc_endpoint_url('order-received')) { return; }
    ?>
    <script id="bc-wa-checkout-js">
    jQuery(function ($) {
        $('form.checkout').on('checkout_place_order_success', function (event, result) {
            if (!result || !result.bc_whatsapp) { return true; }
            var win = window.open(result.bc_whatsapp, '_blank');
            if (win) {
                try { win.opener = null; } catch (e) {}
                try { sessionStorage.setItem('bcWaOpened', '1'); } catch (e) {}
            }
            return true;
        });
    });
    </script>
    <?php
}, 100);

// Thank-you page: the same message behind a button, always available.
add_action('woocommerce_thankyou', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) { return; }
    $link = bc_wa_customer_link($order);
    ?>
    <section class="bc-wa-handoff" aria-labelledby="bc-wa-title">
        <p class="bc-wa-handoff__eyebrow">One last step</p>
        <h2 id="bc-wa-title" class="bc-wa-handoff__title">Send your order to us on WhatsApp</h2>
        <p class="bc-wa-handoff__text">Your order details are written out and ready to send to Beauty Crib on +256 784 956 653. Once we have them, we confirm stock and arrange your delivery straight away.</p>
        <?php // esc_url() strips encoded line breaks (%0A); the link is built from our own data. ?>
        <a class="bc-wa-handoff__button" href="<?php echo esc_attr($link); ?>" target="_blank" rel="noopener">
            <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>
            <span>Send order on WhatsApp</span>
        </a>
        <p class="bc-wa-handoff__small" data-bc-wa-opened hidden>WhatsApp opened in a new tab. If you have already sent the message, you are all set.</p>
    </section>
    <script>
    (function () {
        try {
            if (sessionStorage.getItem('bcWaOpened') === '1') {
                var note = document.querySelector('[data-bc-wa-opened]');
                if (note) { note.hidden = false; }
                sessionStorage.removeItem('bcWaOpened');
            }
        } catch (e) {}
    })();
    </script>
    <?php
}, 5);

add_action('wp_head', function () {
    if (!function_exists('is_checkout') || !is_checkout()) { return; }
    ?>
    <style id="bc-wa-checkout">
    .bc-wa-note{margin:14px 0 0;font-family:var(--e-global-typography-text-font-family,"Instrument Sans"),sans-serif;font-size:13px;line-height:1.5;color:var(--e-global-color-bcmid,#777)}
    .bc-wa-handoff{margin:40px 0;padding:40px;background:var(--e-global-color-accent,#F7F7F5);border:1px solid var(--e-global-color-bcline,#E8E8E5)}
    .bc-wa-handoff .bc-wa-handoff__eyebrow{margin:0 0 12px;font-family:var(--e-global-typography-accent-font-family,"Instrument Sans"),sans-serif;font-size:11px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;color:var(--e-global-color-bcmid,#777)}
    .bc-wa-handoff .bc-wa-handoff__title{margin:0 0 12px;font-family:var(--e-global-typography-primary-font-family,"Instrument Serif"),serif;font-weight:400;font-size:clamp(28px,4vw,40px);line-height:1.1;letter-spacing:-.6px;color:var(--e-global-color-primary,#000)}
    .bc-wa-handoff .bc-wa-handoff__text{margin:0 0 24px;max-width:560px;font-family:var(--e-global-typography-text-font-family,"Instrument Sans"),sans-serif;font-size:16px;line-height:1.6;color:var(--e-global-color-text,#666)}
    .bc-wa-handoff .bc-wa-handoff__button{display:inline-flex;align-items:center;gap:10px;padding:16px 30px;background:var(--e-global-color-primary,#000);color:var(--e-global-color-bcwhite,#fff)!important;border:1px solid var(--e-global-color-primary,#000);border-radius:0;font-family:"Instrument Sans",sans-serif;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;text-decoration:none!important;transition:background-color .25s ease,color .25s ease}
    .bc-wa-handoff .bc-wa-handoff__button:hover,.bc-wa-handoff .bc-wa-handoff__button:focus-visible{background:var(--e-global-color-bcwhite,#fff);color:var(--e-global-color-primary,#000)!important}
    .bc-wa-handoff .bc-wa-handoff__button:focus-visible{outline:2px solid var(--e-global-color-primary,#000);outline-offset:3px}
    .bc-wa-handoff .bc-wa-handoff__small{margin:16px 0 0;font-size:13px;color:var(--e-global-color-bcmid,#777)}
    @media (max-width:767px){.bc-wa-handoff{padding:28px 20px}.bc-wa-handoff .bc-wa-handoff__button{display:flex;justify-content:center;width:100%}}
    @media (prefers-reduced-motion:reduce){.bc-wa-handoff .bc-wa-handoff__button{transition:none}}
    </style>
    <?php
});
