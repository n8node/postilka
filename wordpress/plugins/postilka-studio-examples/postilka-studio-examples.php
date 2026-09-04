<?php
/**
 * Plugin Name: Postilka Studio Examples
 * Description: Masonry gallery of Ad Studio examples for Elementor. Shortcode: [postilka_studio_examples]
 * Version: 1.0.0
 * Author: Postilka
 * Text Domain: postilka-studio-examples
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Postilka_Studio_Examples {
    private const VERSION = '1.0.0';
    private static bool $shortcode_used = false;

    public static function init(): void {
        add_shortcode('postilka_studio_examples', [self::class, 'render_shortcode']);
        add_action('wp_enqueue_scripts', [self::class, 'enqueue_assets']);
    }

    public static function render_shortcode(array $atts = []): string {
        self::$shortcode_used = true;
        if (!wp_script_is('postilka-studio-examples', 'enqueued')) {
            self::enqueue_assets();
        }

        $atts = shortcode_atts(
            [
                'category'  => 'all',
                'page_size' => '18',
                'link'      => '1',
                'cta_base'  => '/app/ai',
                'api_base'  => '/app/api/v1',
            ],
            $atts,
            'postilka_studio_examples'
        );

        $page_size = max(1, min(48, (int) $atts['page_size']));
        $category  = sanitize_key((string) $atts['category']);
        if ($category === '') {
            $category = 'all';
        }

        $root_id = 'pse-' . wp_unique_id();

        ob_start();
        ?>
        <div
            id="<?php echo esc_attr($root_id); ?>"
            class="pse-root"
            data-postilka-studio-examples
            data-api-base="<?php echo esc_attr($atts['api_base']); ?>"
            data-cta-base="<?php echo esc_attr($atts['cta_base']); ?>"
            data-category="<?php echo esc_attr($category); ?>"
            data-page-size="<?php echo esc_attr((string) $page_size); ?>"
            data-link="<?php echo esc_attr($atts['link'] === '0' ? '0' : '1'); ?>"
        >
            <div class="pse-filters" data-pse-filters role="tablist" aria-label="Категории примеров"></div>
            <div class="pse-status" data-pse-status>Загрузка примеров…</div>
            <div class="pse-grid" data-pse-grid></div>
            <div class="pse-sentinel" data-pse-sentinel hidden aria-hidden="true"></div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function enqueue_assets(): void {
        if (!self::should_enqueue()) {
            return;
        }

        $base = plugin_dir_url(__FILE__);

        wp_enqueue_style(
            'postilka-studio-examples',
            $base . 'assets/gallery.css',
            [],
            self::VERSION
        );

        wp_enqueue_script(
            'postilka-studio-examples',
            $base . 'assets/gallery.js',
            [],
            self::VERSION,
            true
        );
    }

    private static function should_enqueue(): bool {
        if (self::$shortcode_used) {
            return true;
        }
        if (!is_singular()) {
            return false;
        }

        global $post;
        if (!$post instanceof WP_Post) {
            return false;
        }

        if (has_shortcode($post->post_content, 'postilka_studio_examples')) {
            return true;
        }

        $elementor_data = get_post_meta($post->ID, '_elementor_data', true);
        return is_string($elementor_data) && str_contains($elementor_data, 'postilka_studio_examples');
    }
}

Postilka_Studio_Examples::init();
