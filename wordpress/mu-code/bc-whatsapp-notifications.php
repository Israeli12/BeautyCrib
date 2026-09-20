<?php
/**
 * Beauty Crib: send every WooCommerce event and contact form entry to WhatsApp.
 *
 * WhatsApp has no open API, so delivery runs through a provider:
 *   - cloud  : Meta WhatsApp Cloud API (official, free tier)
 *   - twilio : Twilio WhatsApp
 *   - none   : queue only (logged + emailed) until credentials are added
 *
 * Settings live in the option bc_wa_settings and are editable at
 * WooCommerce -> WhatsApp Alerts.
 */

if (!defined('ABSPATH')) { exit; }

function bc_wa_defaults() {
    return [
        'provider'        => 'none',
        'recipients'      => '256784956653',
        'cloud_token'     => '',
        'cloud_phone_id'  => '',
        'cloud_template'  => '',
        'cloud_lang'      => 'en',
        'twilio_sid'      => '',
        'twilio_token'    => '',
        'twilio_from'     => '',
        'email_fallback'  => 'yes',
        'events'          => 'all',
    ];
}

function bc_wa_settings($key = null) {
    $s = wp_parse_args((array) get_option('bc_wa_settings', []), bc_wa_defaults());
    return $key ? (isset($s[$key]) ? $s[$key] : '') : $s;
}

function bc_wa_log($entry) {
    $log = get_option('bc_wa_log', []);
    if (!is_array($log)) { $log = []; }
    array_unshift($log, $entry);
    update_option('bc_wa_log', array_slice($log, 0, 100), false);
}

/** Normalise 0784956653 / +256784956653 / 256784956653 to 256784956653 */
function bc_wa_msisdn($raw) {
    $digits = preg_replace('/\D+/', '', (string) $raw);
    if ($digits === '') { return ''; }
    if (strpos($digits, '0') === 0) { $digits = '256' . substr($digits, 1); }
    if (strpos($digits, '256') !== 0 && strlen($digits) === 9) { $digits = '256' . $digits; }
    return $digits;
}

function bc_wa_recipients() {
    $raw = bc_wa_settings('recipients');
    $out = [];
    foreach (preg_split('/[,\s]+/', (string) $raw) as $one) {
        $n = bc_wa_msisdn($one);
        if ($n) { $out[] = $n; }
    }
    return array_values(array_unique($out));
}

/**
 * Send one message to every recipient. Always logs, never throws.
 * $media: optional [['url' => ..., 'caption' => ...]] images sent after the text.
 */
function bc_wa_send($message, $context = 'general', $media = []) {
    $settings   = bc_wa_settings();
    $recipients = bc_wa_recipients();
    $results    = [];

    foreach ($recipients as $to) {
        $result = ['to' => $to, 'context' => $context, 'time' => current_time('mysql'), 'provider' => $settings['provider']];

        if ($settings['provider'] === 'cloud' && $settings['cloud_token'] && $settings['cloud_phone_id']) {
            $body = $settings['cloud_template']
                ? ['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template',
                   'template' => ['name' => $settings['cloud_template'], 'language' => ['code' => $settings['cloud_lang'] ?: 'en'],
                                  'components' => [['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $message]]]]]]
                : ['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'text', 'text' => ['preview_url' => false, 'body' => $message]];

            $response = wp_remote_post('https://graph.facebook.com/v21.0/' . rawurlencode($settings['cloud_phone_id']) . '/messages', [
                'timeout' => 20,
                'headers' => ['Authorization' => 'Bearer ' . $settings['cloud_token'], 'Content-Type' => 'application/json'],
                'body'    => wp_json_encode($body),
            ]);
            $result['status'] = is_wp_error($response) ? 'error' : wp_remote_retrieve_response_code($response);
            $result['detail'] = is_wp_error($response) ? $response->get_error_message() : substr(wp_remote_retrieve_body($response), 0, 300);
            $result['sent']   = (!is_wp_error($response) && (int) wp_remote_retrieve_response_code($response) === 200);
            if ($result['sent']) {
                foreach ((array) $media as $m) {
                    wp_remote_post('https://graph.facebook.com/v21.0/' . rawurlencode($settings['cloud_phone_id']) . '/messages', [
                        'timeout' => 20,
                        'headers' => ['Authorization' => 'Bearer ' . $settings['cloud_token'], 'Content-Type' => 'application/json'],
                        'body'    => wp_json_encode(['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'image', 'image' => ['link' => $m['url'], 'caption' => $m['caption']]]),
                    ]);
                }
            }

        } elseif ($settings['provider'] === 'twilio' && $settings['twilio_sid'] && $settings['twilio_token'] && $settings['twilio_from']) {
            $response = wp_remote_post('https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($settings['twilio_sid']) . '/Messages.json', [
                'timeout' => 20,
                'headers' => ['Authorization' => 'Basic ' . base64_encode($settings['twilio_sid'] . ':' . $settings['twilio_token'])],
                'body'    => ['From' => 'whatsapp:+' . bc_wa_msisdn($settings['twilio_from']), 'To' => 'whatsapp:+' . $to, 'Body' => $message],
            ]);
            $code = is_wp_error($response) ? 0 : (int) wp_remote_retrieve_response_code($response);
            $result['status'] = is_wp_error($response) ? 'error' : $code;
            $result['detail'] = is_wp_error($response) ? $response->get_error_message() : substr(wp_remote_retrieve_body($response), 0, 300);
            $result['sent']   = ($code >= 200 && $code < 300);
            if ($result['sent']) {
                foreach ((array) $media as $m) {
                    wp_remote_post('https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($settings['twilio_sid']) . '/Messages.json', [
                        'timeout' => 20,
                        'headers' => ['Authorization' => 'Basic ' . base64_encode($settings['twilio_sid'] . ':' . $settings['twilio_token'])],
                        'body'    => ['From' => 'whatsapp:+' . bc_wa_msisdn($settings['twilio_from']), 'To' => 'whatsapp:+' . $to, 'Body' => $m['caption'], 'MediaUrl' => $m['url']],
                    ]);
                }
            }

        } else {
            $result['status'] = 'queued';
            $result['sent']   = false;
            $result['detail'] = 'No WhatsApp provider configured yet.';
            $result['link']   = 'https://wa.me/' . $to . '?text=' . rawurlencode($message);
        }

        $result['message'] = $message;
        bc_wa_log($result);
        $results[] = $result;
    }

    // Never lose a notification: email it too when nothing was actually delivered.
    $delivered = array_filter($results, function ($r) { return !empty($r['sent']); });
    if (!$delivered && bc_wa_settings('email_fallback') === 'yes') {
        $to = get_option('woocommerce_new_order_settings')['recipient'] ?? get_option('admin_email');
        wp_mail($to, '[Beauty Crib alert] ' . $context, $message . "\n\n--\nWhatsApp delivery is not configured yet, so this arrived by email.");
    }

    return $results;
}

/* ------------------------------------------------------------------ orders */

/** wc_price() returns markup and a non-breaking space; WhatsApp wants plain text. */
function bc_wa_price($amount, $order) {
    $html = wc_price($amount, ['currency' => $order->get_currency()]);
    $text = html_entity_decode(wp_strip_all_tags($html), ENT_QUOTES, 'UTF-8');
    return trim(str_replace("\xC2\xA0", ' ', $text));
}

function bc_wa_order_message($order, $headline) {
    if (!$order instanceof WC_Order) { return ''; }
    $lines   = [];
    $lines[] = $headline;
    $lines[] = 'Order #' . $order->get_order_number() . '  |  ' . wc_get_order_status_name($order->get_status());
    $lines[] = '';
    $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    if ($name) { $lines[] = 'Customer: ' . $name; }
    if ($order->get_billing_phone()) { $lines[] = 'Phone: ' . $order->get_billing_phone(); }
    if ($order->get_billing_email()) { $lines[] = 'Email: ' . $order->get_billing_email(); }

    $rawAddress = $order->get_formatted_shipping_address() ?: $order->get_formatted_billing_address();
    $address = trim(preg_replace('/\s+/', ' ', strip_tags(str_replace(['<br/>', '<br />', '<br>'], ', ', (string) $rawAddress))));
    if ($address) { $lines[] = 'Deliver to: ' . $address; }
    if ($order->get_shipping_method()) { $lines[] = 'Delivery: ' . $order->get_shipping_method(); }
    $lines[] = 'Payment: ' . ($order->get_payment_method_title() ?: 'Not set');

    $lines[] = '';
    $lines[] = 'Items:';
    foreach ($order->get_items() as $item) {
        $lines[] = '- ' . $item->get_quantity() . ' x ' . $item->get_name() . '  ' . bc_wa_price($item->get_total(), $order);
    }
    $lines[] = 'Total: ' . bc_wa_price($order->get_total(), $order);

    if ($order->get_customer_note()) { $lines[] = ''; $lines[] = 'Note: ' . $order->get_customer_note(); }
    $lines[] = '';
    $lines[] = 'Manage: ' . admin_url('post.php?post=' . $order->get_id() . '&action=edit');

    return implode("\n", $lines);
}

/** Product photos for a new-order alert, up to five. */
function bc_wa_order_media($order) {
    $media = [];
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if (!$product) { continue; }
        $image_id = $product->get_image_id();
        if (!$image_id && $product->get_parent_id()) { $image_id = get_post_thumbnail_id($product->get_parent_id()); }
        $url = $image_id ? wp_get_attachment_image_url($image_id, 'woocommerce_single') : '';
        if ($url) { $media[] = ['url' => $url, 'caption' => $item->get_quantity() . ' x ' . $item->get_name()]; }
        if (count($media) >= 5) { break; }
    }
    return $media;
}

// A new order arrives.
add_action('woocommerce_checkout_order_processed', function ($order_id) {
    $order = wc_get_order($order_id);
    if ($order) { bc_wa_send(bc_wa_order_message($order, 'NEW ORDER - Beauty Crib'), 'new_order', bc_wa_order_media($order)); }
}, 20);

// Orders placed through the admin or the REST API.
add_action('woocommerce_new_order', function ($order_id) {
    if (did_action('woocommerce_checkout_order_processed')) { return; }
    $order = wc_get_order($order_id);
    // Orders created in the admin fire this before items and totals are saved.
    // Skip the empty shell; the first status change reports the finished order.
    if (!$order || count($order->get_items()) === 0) { return; }
    bc_wa_send(bc_wa_order_message($order, 'NEW ORDER - Beauty Crib'), 'new_order', bc_wa_order_media($order));
}, 20);

// Every status change: processing, completed, cancelled, refunded, failed, on-hold.
add_action('woocommerce_order_status_changed', function ($order_id, $from, $to, $order) {
    if (!$order) { $order = wc_get_order($order_id); }
    if (!$order) { return; }
    $headline = 'ORDER UPDATE - ' . strtoupper(wc_get_order_status_name($to));
    $message  = bc_wa_order_message($order, $headline);
    $message .= "\n" . 'Changed from ' . wc_get_order_status_name($from) . ' to ' . wc_get_order_status_name($to) . '.';
    bc_wa_send($message, 'status_' . $to);
}, 20, 4);

// Refunds.
add_action('woocommerce_order_refunded', function ($order_id, $refund_id) {
    $order  = wc_get_order($order_id);
    $refund = wc_get_order($refund_id);
    if (!$order || !$refund) { return; }
    $message = bc_wa_order_message($order, 'REFUND ISSUED - Beauty Crib');
    $message .= "\n" . 'Refunded: ' . wp_strip_all_tags(wc_price($refund->get_amount(), ['currency' => $order->get_currency()]));
    bc_wa_send($message, 'refund');
}, 20, 2);

// Stock running low.
add_action('woocommerce_low_stock', function ($product) {
    bc_wa_send('LOW STOCK - ' . $product->get_name() . ' is down to ' . $product->get_stock_quantity() . '.', 'low_stock');
}, 20);

add_action('woocommerce_no_stock', function ($product) {
    bc_wa_send('OUT OF STOCK - ' . $product->get_name() . ' has sold out.', 'no_stock');
}, 20);

/* ------------------------------------------------------------ contact form */

add_action('wpforms_process_complete', function ($fields, $entry, $form_data, $entry_id) {
    $lines = ['NEW ENQUIRY - ' . (isset($form_data['settings']['form_title']) ? $form_data['settings']['form_title'] : 'Website form'), ''];
    foreach ((array) $fields as $field) {
        $value = is_array($field['value']) ? implode(', ', $field['value']) : $field['value'];
        $value = trim(wp_strip_all_tags((string) $value));
        if ($value === '') { continue; }
        $lines[] = $field['name'] . ': ' . $value;
    }
    $lines[] = '';
    $lines[] = 'Received ' . current_time('j M Y, H:i');
    bc_wa_send(implode("\n", $lines), 'contact_form');
}, 20, 4);

/* --------------------------------------------------------------- settings */

add_action('admin_menu', function () {
    add_submenu_page('woocommerce', 'WhatsApp Alerts', 'WhatsApp Alerts', 'manage_options', 'bc-whatsapp', 'bc_wa_settings_page');
});

add_action('admin_init', function () {
    register_setting('bc_wa_group', 'bc_wa_settings', ['sanitize_callback' => function ($input) {
        $clean = [];
        foreach (bc_wa_defaults() as $key => $default) {
            $clean[$key] = isset($input[$key]) ? sanitize_text_field($input[$key]) : $default;
        }
        return $clean;
    }]);
});

function bc_wa_settings_page() {
    $s   = bc_wa_settings();
    $log = array_slice((array) get_option('bc_wa_log', []), 0, 10);
    echo '<div class="wrap"><h1>WhatsApp Alerts</h1>';
    echo '<p>Every WooCommerce order event and contact form entry is sent here. Email always continues through WooCommerce settings.</p>';
    if ($s['provider'] === 'none') {
        echo '<div class="notice notice-warning"><p><strong>No provider connected.</strong> Alerts are being logged below and emailed instead. Add Cloud API or Twilio credentials to switch on WhatsApp delivery.</p></div>';
    }
    echo '<form method="post" action="options.php">';
    settings_fields('bc_wa_group');
    echo '<table class="form-table">';
    $field = function ($key, $label, $type = 'text', $help = '') use ($s) {
        echo '<tr><th scope="row"><label for="bc_' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td>';
        echo '<input type="' . esc_attr($type) . '" class="regular-text" id="bc_' . esc_attr($key) . '" name="bc_wa_settings[' . esc_attr($key) . ']" value="' . esc_attr($s[$key]) . '">';
        if ($help) { echo '<p class="description">' . esc_html($help) . '</p>'; }
        echo '</td></tr>';
    };
    echo '<tr><th scope="row"><label for="bc_provider">Provider</label></th><td><select id="bc_provider" name="bc_wa_settings[provider]">';
    foreach (['none' => 'Not connected (log and email only)', 'cloud' => 'Meta WhatsApp Cloud API', 'twilio' => 'Twilio WhatsApp'] as $k => $labl) {
        echo '<option value="' . esc_attr($k) . '"' . selected($s['provider'], $k, false) . '>' . esc_html($labl) . '</option>';
    }
    echo '</select></td></tr>';
    $field('recipients', 'WhatsApp number(s)', 'text', 'Comma separated. 0784956653 or 256784956653 both work.');
    $field('cloud_phone_id', 'Cloud API phone number ID', 'text', 'Meta - WhatsApp - API Setup');
    $field('cloud_token', 'Cloud API access token', 'password');
    $field('cloud_template', 'Cloud API template name', 'text', 'Required for business-initiated messages. Leave blank to send plain text inside a 24 hour window.');
    $field('cloud_lang', 'Template language', 'text');
    $field('twilio_sid', 'Twilio account SID', 'text');
    $field('twilio_token', 'Twilio auth token', 'password');
    $field('twilio_from', 'Twilio WhatsApp sender', 'text');
    echo '</table>';
    submit_button();
    echo '</form>';

    echo '<h2>Last 10 alerts</h2><table class="widefat striped"><thead><tr><th>Time</th><th>Event</th><th>To</th><th>Status</th><th>Message</th></tr></thead><tbody>';
    if (!$log) { echo '<tr><td colspan="5">Nothing yet.</td></tr>'; }
    foreach ($log as $row) {
        echo '<tr><td>' . esc_html($row['time'] ?? '') . '</td><td>' . esc_html($row['context'] ?? '') . '</td><td>' . esc_html($row['to'] ?? '') . '</td><td>' . esc_html(is_scalar($row['status'] ?? '') ? $row['status'] : '') . '</td><td><code style="white-space:pre-wrap">' . esc_html(mb_substr((string) ($row['message'] ?? ''), 0, 220)) . '</code>';
        if (!empty($row['link'])) { echo '<br><a class="button button-small" target="_blank" href="' . esc_url($row['link']) . '">Send on WhatsApp</a>'; }
        echo '</td></tr>';
    }
    echo '</tbody></table></div>';
}
