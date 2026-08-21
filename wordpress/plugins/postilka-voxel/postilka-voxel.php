<?php
/**
 * Plugin Name: Postilka Voxel Hero
 * Description: 3D voxel hero embed for Elementor and WordPress. Shortcode: [postilka_voxel_hero]
 * Version: 1.0.0
 * Author: Postilka
 * Text Domain: postilka-voxel
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Postilka_Voxel_Hero {
    private static bool $shortcode_used = false;

    public static function init(): void {
        add_shortcode('postilka_voxel_hero', [self::class, 'render_shortcode']);
        add_action('wp_enqueue_scripts', [self::class, 'enqueue_assets']);
    }

    public static function render_shortcode(array $atts = []): string {
        self::$shortcode_used = true;

        $atts = shortcode_atts(
            [
                'expand_label'  => 'Начать путешествие',
                'collapse_label'=> 'Вернуться на сайт',
            ],
            $atts,
            'postilka_voxel_hero'
        );

        $expand = esc_html($atts['expand_label']);
        $collapse = esc_html($atts['collapse_label']);

        ob_start();
        ?>
        <div class="postilka-voxel-root is-preview" data-postilka-voxel-root>
            <div data-postilka-voxel-stage aria-label="3D-тур Postilka"></div>
            <div class="postilka-voxel-overlay">
                <button type="button" class="postilka-voxel-expand" data-voxel-expand>
                    <?php echo $expand; ?>
                </button>
                <button type="button" class="postilka-voxel-collapse" data-voxel-collapse hidden>
                    <?php echo $collapse; ?>
                </button>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function enqueue_assets(): void {
        if (!self::should_enqueue()) {
            return;
        }

        wp_enqueue_style(
            'postilka-voxel-fonts',
            'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Zen+Maru+Gothic:wght@500;700&family=JetBrains+Mono:wght@500&display=swap',
            [],
            null
        );

        wp_enqueue_style(
            'postilka-voxel-scene',
            home_url('/experience/assets/scene.css'),
            ['postilka-voxel-fonts'],
            '1.0.0'
        );

        wp_enqueue_style(
            'postilka-voxel-embed',
            home_url('/experience/assets/embed.css'),
            ['postilka-voxel-scene'],
            '1.0.0'
        );

        wp_enqueue_script(
            'postilka-voxel-embed',
            home_url('/experience/assets/embed.js'),
            [],
            '1.0.0',
            true
        );

        add_filter('script_loader_tag', [self::class, 'script_module_tag'], 10, 3);
    }

    private static function should_enqueue(): bool {
        if (self::$shortcode_used) {
            return true;
        }
        if (is_front_page()) {
            return true;
        }
        if (!is_singular()) {
            return false;
        }

        global $post;
        if (!$post instanceof WP_Post) {
            return false;
        }

        if (has_shortcode($post->post_content, 'postilka_voxel_hero')) {
            return true;
        }

        $elementor_data = get_post_meta($post->ID, '_elementor_data', true);
        return is_string($elementor_data) && str_contains($elementor_data, 'postilka_voxel_hero');
    }

    public static function script_module_tag(string $tag, string $handle, string $src): string {
        if ($handle !== 'postilka-voxel-embed') {
            return $tag;
        }

        return sprintf(
            '<script type="module" src="%s" id="%s-js"></script>' . "\n",
            esc_url($src),
            esc_attr($handle)
        );
    }
}

Postilka_Voxel_Hero::init();
