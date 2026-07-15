<?php
/**
 * Recursos do tema institucional IAH Educacional.
 */

if (!defined('ABSPATH')) {
    exit;
}

function iah_educacional_enqueue_styles(): void {
    wp_enqueue_style(
        'iah-educacional-style',
        get_stylesheet_uri(),
        array(),
        '1.0.0'
    );
}
add_action('wp_enqueue_scripts', 'iah_educacional_enqueue_styles');

function iah_educacional_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('html5', array('style', 'script'));
}
add_action('after_setup_theme', 'iah_educacional_setup');
