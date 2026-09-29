<?php
/**
 * Beauty Crib: serve Instrument Serif and Instrument Sans from this server.
 *
 * Elementor was requesting both families from fonts.googleapis.com, every weight
 * from 100 to 900 plus italics, with no preconnect. Two round trips to another
 * origin before a single letter could be drawn, which is slow from Uganda and
 * left the page to paint in a fallback face and then reflow when the real fonts
 * arrived.
 *
 * The files here are the same ones Google serves (Instrument Sans variable
 * 400-700 and Instrument Serif 400, roman and italic, latin and latin-ext),
 * SIL Open Font License. They are preloaded so text is drawn once, in the right
 * face, and nothing moves afterwards.
 */

if (!defined('ABSPATH')) { exit; }

function bc_font_faces() {
    $latin = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
    $ext   = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
    return [
        ['Instrument Sans', 'normal', '400 700', 'instrument-sans-latin.woff2', $latin, true],
        ['Instrument Sans', 'normal', '400 700', 'instrument-sans-latin-ext.woff2', $ext, false],
        ['Instrument Sans', 'italic', '400 700', 'instrument-sans-italic-latin.woff2', $latin, false],
        ['Instrument Sans', 'italic', '400 700', 'instrument-sans-italic-latin-ext.woff2', $ext, false],
        ['Instrument Serif', 'normal', '400', 'instrument-serif-latin.woff2', $latin, true],
        ['Instrument Serif', 'normal', '400', 'instrument-serif-latin-ext.woff2', $ext, false],
        ['Instrument Serif', 'italic', '400', 'instrument-serif-italic-latin.woff2', $latin, false],
        ['Instrument Serif', 'italic', '400', 'instrument-serif-italic-latin-ext.woff2', $ext, false],
    ];
}

function bc_font_url($file) {
    return content_url('/uploads/bc-fonts/' . $file);
}

// Stop Elementor fetching the same families from Google.
add_filter('elementor/frontend/print_google_fonts', '__return_false');

add_action('wp_head', function () {
    $faces = bc_font_faces();
    foreach ($faces as $f) {
        if ($f[5]) { // the latin files, needed for the first paint
            printf('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url(bc_font_url($f[3])));
        }
    }
    echo '<style id="bc-fonts">';
    foreach ($faces as $f) {
        printf(
            '@font-face{font-family:"%s";font-style:%s;font-weight:%s;font-display:swap;src:url(%s) format("woff2");unicode-range:%s}',
            esc_attr($f[0]),
            esc_attr($f[1]),
            esc_attr($f[2]),
            esc_url(bc_font_url($f[3])),
            $f[4]
        );
    }
    echo "</style>\n";
}, 1);
