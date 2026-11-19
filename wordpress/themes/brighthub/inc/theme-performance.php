<?php
/**
 * BrightHub Theme Performance Optimizations
 * Comprehensive performance improvements for smooth operation
 *
 * @package Case-Themes
 * @since BrightHub 1.0.4
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * ============================================
 * 1. OPTIMIZE SCRIPT/STYLE LOADING
 * ============================================
 */

add_action('wp_enqueue_scripts', 'brighthub_optimized_scripts', 100);
function brighthub_optimized_scripts() {
    $version = wp_get_theme(get_template())->get('Version');
    
    wp_enqueue_style('pxl-caseicon', get_template_directory_uri() . '/assets/css/caseicon.css', array(), $version);
    wp_enqueue_style('pxl-phosphor', get_template_directory_uri() . '/assets/css/phosphor.css', array(), $version);
    wp_enqueue_style('pxl-grid', get_template_directory_uri() . '/assets/css/grid.css', array(), $version);
    wp_enqueue_style('pxl-style', get_template_directory_uri() . '/assets/css/style.css', array(), $version);
    wp_add_inline_style('pxl-style', brighthub_inline_styles());
    wp_enqueue_style('pxl-base', get_template_directory_uri() . '/style.css', array(), $version);
    
    $fonts_url = brighthub_fonts_url();
    if ($fonts_url) {
        wp_enqueue_style('pxl-google-fonts', $fonts_url, array(), null);
        add_filter('style_loader_tag', 'brighthub_preload_fonts', 10, 2);
    }
    
    wp_register_style('odometer', get_template_directory_uri() . '/assets/css/libs/odometer.css', array(), '1.0.0');
    wp_register_script('odometer', get_template_directory_uri() . '/elements/assets/js/odometer.min.js', array('jquery'), '1.0.0', true);
    
    $load_magnific = false;
    $load_wow = false;
    $load_intl_tel = false;
    $load_odometer = false;
    
    // Check if Elementor is active and page is built with Elementor
    $is_elementor_page = false;
    if (did_action('elementor/loaded')) {
        if (is_singular()) {
            global $post;
            if ($post && \Elementor\Plugin::$instance->db->is_built_with_elementor($post->ID)) {
                $is_elementor_page = true;
            }
        }
    }
    
    if (is_singular() || is_page() || is_home() || is_archive()) {
        global $post;
        $content = '';
        if ($post) {
            $content = $post->post_content;
        }
        
        if (strpos($content, 'pxl-gallery') !== false || 
            strpos($content, 'pxl-video__popup') !== false ||
            strpos($content, 'lightbox') !== false ||
            strpos($content, 'magnific') !== false) {
            $load_magnific = true;
        }
        
        // If Elementor page, check for video player widget
        if ($is_elementor_page && !$load_magnific) {
            // Check if page has video player widget
            $document = \Elementor\Plugin::$instance->documents->get($post->ID);
            if ($document) {
                $data = $document->get_elements_data();
                if (!empty($data)) {
                    $json_data = json_encode($data);
                    if (strpos($json_data, 'pxl_video_player') !== false || 
                        strpos($json_data, 'pxl-video__popup') !== false) {
                        $load_magnific = true;
                    }
                }
            }
        }
        
        if (strpos($content, 'wow') !== false || 
            strpos($content, 'animate') !== false ||
            strpos($content, 'fadeIn') !== false) {
            $load_wow = true;
        }
        
        if (strpos($content, 'your-phone') !== false || 
            strpos($content, 'id="your-phone"') !== false ||
            strpos($content, 'id=\'your-phone\'') !== false ||
            strpos($content, 'intlTelInput') !== false ||
            strpos($content, 'type="tel"') !== false ||
            strpos($content, 'type=\'tel\'') !== false ||
            is_page_template('page-contact.php') ||
            is_page_template('page-form.php')) {
            $load_intl_tel = true;
        }
        
        if (strpos($content, 'odometer') !== false || 
            strpos($content, 'pxl-counter') !== false) {
            $load_odometer = true;
        }
    }
    
    if ($load_magnific) {
        wp_enqueue_style('magnific-popup', get_template_directory_uri() . '/assets/css/libs/magnific-popup.css', array(), '1.1.0');
        wp_enqueue_script('magnific-popup', get_template_directory_uri() . '/assets/js/libs/magnific-popup.min.js', array('jquery'), '1.1.0', true);
    }
    
    if ($load_wow) {
        wp_enqueue_style('wow-animate', get_template_directory_uri() . '/assets/css/libs/animate.min.css', array(), '1.1.0');
        wp_enqueue_script('wow-animate', get_template_directory_uri() . '/assets/js/libs/wow.min.js', array('jquery'), '1.0.0', true);
    }
    
    if ($load_intl_tel) {
        wp_enqueue_style('intlTelInput', get_template_directory_uri() . '/assets/css/libs/intlTelInput.css', array(), '1.0.0');
        wp_enqueue_script('intlTelInput', get_template_directory_uri() . '/assets/js/libs/intlTelInput.min.js', array('jquery'), '17.0.8', true);
    }
    
    if ($load_odometer) {
        wp_enqueue_style('odometer');
        wp_enqueue_script('odometer');
    }
    
    // Register heavy scripts (load on demand)
    wp_register_script('particles-background', get_template_directory_uri() . '/assets/js/libs/particles.min.js', array('jquery'), '1.1.0', true);
    wp_register_script('tilt', get_template_directory_uri() . '/assets/js/libs/tilt.min.js', array('jquery'), '1.0.0', true);
    wp_register_script('stellar-parallax', get_template_directory_uri() . '/assets/js/libs/stellar-parallax.min.js', array('jquery'), '0.6.2', true);
    wp_register_script('pxl-scroll', get_template_directory_uri() . '/assets/js/libs/scroll.min.js', array('jquery'), '0.6.0', true);
    wp_register_script('pxl-easing', get_template_directory_uri() . '/assets/js/libs/easing.js', array('jquery'), '1.3.0', true);
    wp_register_script('pxl-tweenmax', get_template_directory_uri() . '/assets/js/libs/tweenmax.min.js', array('jquery'), '2.1.2', true);
    wp_register_script('pxl-parallax-move-mouse', get_template_directory_uri() . '/assets/js/libs/parallax-move-mouse.js', array('jquery'), '1.0.0', true);
    
    // Essential scripts
    wp_enqueue_script('nice-select', get_template_directory_uri() . '/assets/js/libs/nice-select.min.js', array('jquery'), '1.0.0', true);
    wp_enqueue_script('pxl-parallax-scroll', get_template_directory_uri() . '/assets/js/libs/parallax-scroll.js', array('jquery'), $version, true);
    
    // Smooth Scroll - only if enabled
    $smooth_scroll = brighthub()->get_theme_opt('smooth_scroll', 'off');
    if ($smooth_scroll == 'on') {
        wp_enqueue_script('gsap');
        wp_enqueue_script('pxl-scroll-smoother');
        wp_enqueue_script('pxl-bundled-lenis');
    }
    
    wp_enqueue_script('pxl-main', get_template_directory_uri() . '/assets/js/theme.js', array('jquery', 'nice-select'), $version, true);
    
    wp_localize_script('pxl-main', 'loadmore_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'startPage' => get_query_var('paged') ? get_query_var('paged') : 1,
        'nonce' => wp_create_nonce('brighthub_loadmore_nonce'),
    ));
    
    add_filter('script_loader_tag', 'brighthub_defer_scripts', 10, 2);
}

/**
 * Preload Google Fonts
 */
function brighthub_preload_fonts($tag, $handle) {
    if ('pxl-google-fonts' === $handle) {
        $tag = str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\"this.onload=null;this.rel='stylesheet'\"", $tag);
        $tag .= '<noscript>' . str_replace("rel='preload' as='style' onload", "rel='stylesheet'", $tag) . '</noscript>';
    }
    return $tag;
}

/**
 * Defer non-critical scripts
 */
function brighthub_defer_scripts($tag, $handle) {
    // Don't defer nice-select as theme.js depends on it and needs it available immediately
    $defer_scripts = array('pxl-main', 'wow-animate', 'intlTelInput', 'odometer');
    
    if (in_array($handle, $defer_scripts)) {
        return str_replace(' src', ' defer src', $tag);
    }
    
    return $tag;
}

/**
 * ============================================
 * 2. DATABASE QUERY OPTIMIZATION
 * ============================================
 */

/**
 * Cache theme options to reduce database queries
 */
if (!function_exists('brighthub_get_cached_option')) {
    function brighthub_get_cached_option($option_name, $default = false) {
        static $cache = array();
        
        if (isset($cache[$option_name])) {
            return $cache[$option_name];
        }
        
        $value = get_option($option_name, $default);
        $cache[$option_name] = $value;
        
        return $value;
    }
}

/**
 * Cache post meta queries
 */
add_filter('get_post_metadata', 'brighthub_cache_post_meta', 10, 4);
function brighthub_cache_post_meta($value, $object_id, $meta_key, $single) {
    static $meta_cache = array();
    
    $cache_key = $object_id . '_' . $meta_key;
    
    if (isset($meta_cache[$cache_key])) {
        return $meta_cache[$cache_key];
    }
    
    // Let WordPress handle the actual query
    return $value;
}

/**
 * Optimize menu queries
 */
add_filter('wp_nav_menu_args', 'brighthub_optimize_menu_args');
function brighthub_optimize_menu_args($args) {
    if (!isset($args['cache_duration'])) {
        $args['cache_duration'] = 3600; 
    }
    return $args;
}

/**
 * Remove WordPress emoji scripts
 */
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('admin_print_scripts', 'print_emoji_detection_script');
remove_action('admin_print_styles', 'print_emoji_styles');

/**
 * Remove unnecessary header links
 */
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wp_shortlink_wp_head');

/**
 * Remove query strings from static resources
 */
add_filter('script_loader_src', 'brighthub_remove_script_version', 15, 1);
add_filter('style_loader_src', 'brighthub_remove_script_version', 15, 1);
function brighthub_remove_script_version($src) {
    if (strpos($src, 'ver=')) {
        $src = remove_query_arg('ver', $src);
    }
    return $src;
}

/**
 * Add responsive image sizes
 */
add_filter('wp_calculate_image_sizes', 'brighthub_responsive_image_sizes', 10, 5);
function brighthub_responsive_image_sizes($sizes, $size, $image_src, $image_meta, $attachment_id) {
    if (is_singular()) {
        return '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px';
    }
    return $sizes;
}

/**
 * Optimize main query
 */
add_action('pre_get_posts', 'brighthub_optimize_main_query');
function brighthub_optimize_main_query($query) {
    if (is_admin() || !$query->is_main_query()) {
        return;
    }
    
    // Optimize for archives
    if (is_archive() || is_home()) {
        $query->set('no_found_rows', false);
        $query->set('posts_per_page', brighthub()->get_theme_opt('number_product_to_show', 12));
    }
}

add_action('init', 'brighthub_disable_heartbeat', 1);
function brighthub_disable_heartbeat() {
    if (!is_admin()) {
        wp_deregister_script('heartbeat');
    }
}


add_action('wp_footer', 'brighthub_disable_embeds');
function brighthub_disable_embeds() {
    wp_dequeue_script('wp-embed');
}

/**
 * Remove jQuery migrate
 */
add_action('wp_default_scripts', 'brighthub_remove_jquery_migrate');
function brighthub_remove_jquery_migrate($scripts) {
    if (!is_admin() && isset($scripts->registered['jquery'])) {
        $script = $scripts->registered['jquery'];
        if ($script->deps) {
            $script->deps = array_diff($script->deps, array('jquery-migrate'));
        }
    }
}
/**
 * Cache widget output
 */
add_filter('widget_display_callback', 'brighthub_cache_widget_output', 10, 3);
function brighthub_cache_widget_output($instance, $widget, $args) {
    $skip_cache = array('recent-posts', 'recent-comments', 'tag-cloud');
    
    if (in_array($widget->id_base, $skip_cache)) {
        return $instance;
    }
    
    $cache_key = 'widget_' . $widget->id;
    $cached = wp_cache_get($cache_key, 'brighthub_widgets');
    
    if ($cached !== false) {
        echo $cached;
        return false;
    }
    
    return $instance;
}

add_filter('widget_output', 'brighthub_save_widget_cache', 10, 3);
function brighthub_save_widget_cache($output, $widget, $args) {
    if ($output) {
        $cache_key = 'widget_' . $widget->id;
        wp_cache_set($cache_key, $output, 'brighthub_widgets', 3600);
    }
    return $output;
}

