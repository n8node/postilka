<?php 
/**
 * Optimized Actions Hook for the theme
 * Performance improvements and conflict resolution
 *
 * @package Case-Themes
 */

add_action('after_setup_theme', 'brighthub_setup');
function brighthub_setup(){
    // Set the content width in pixels, based on the theme's design and stylesheet.
    $GLOBALS['content_width'] = apply_filters( 'brighthub_content_width', 1200 );

    // Make theme available for translation.
    load_theme_textdomain( 'brighthub', get_template_directory() . '/languages' );

    // Custom Header
    add_theme_support( 'custom-header' );

    // Add default posts and comments RSS feed links to head.
    add_theme_support( 'automatic-feed-links' );

    // Let WordPress manage the document title.
    add_theme_support( 'title-tag' );

    // Enable support for Post Thumbnails on posts and pages.
    add_theme_support( 'post-thumbnails' );
    set_post_thumbnail_size( 1170, 710 );

    // This theme uses wp_nav_menu() in one location.
    register_nav_menus( array(
        'primary' => esc_html__( 'Primary Desktop', 'brighthub' ),
        'primary-mobile' => esc_html__( 'Primary Mobile', 'brighthub' ),
    ) );

    // Add theme support for selective refresh for widgets.
    add_theme_support( 'customize-selective-refresh-widgets' );

    // Add support for core custom logo.
    add_theme_support( 'custom-logo', array(
        'height'      => 250,
        'width'       => 250,
        'flex-width'  => true,
        'flex-height' => true,
    ) );
    
    add_theme_support( 'post-formats', array( '' ) );

    // WooCommerce support
    add_theme_support( 'woocommerce' );
    add_theme_support( 'wc-product-gallery-zoom' );
    add_theme_support( 'wc-product-gallery-lightbox' );
    add_theme_support( 'wc-product-gallery-slider' );
    remove_theme_support('widgets-block-editor');
}

/**
 * Register Widgets Position - Optimized
 */
add_action( 'widgets_init', 'brighthub_widgets_position' );
function brighthub_widgets_position() {
    $sidebars = array(
        'sidebar-blog' => array(
            'name' => esc_html__( 'Blog Sidebar', 'brighthub' ),
            'id' => 'sidebar-blog',
        )
    );

    
    // Only register additional sidebars if needed
    if (class_exists('ReduxFramework')) {
        $sidebars['sidebar-page'] = array(
            'name' => esc_html__( 'Page Sidebar', 'brighthub' ),
            'id' => 'sidebar-page',
        );
    }

    // Only register additional sidebars if needed
    if (class_exists('ReduxFramework')) {
        $sidebars['sidebar-career'] = array(
            'name' => esc_html__( 'Career Sidebar', 'brighthub' ),
            'id' => 'sidebar-career',
        );
    }
    
    if (class_exists('Woocommerce')) {
        $sidebars['sidebar-shop'] = array(
            'name' => esc_html__( 'Shop Sidebar', 'brighthub' ),
            'id' => 'sidebar-shop',
        );
    }
    
    foreach ($sidebars as $sidebar) {
        register_sidebar( array(
            'name'          => $sidebar['name'],
            'id'            => $sidebar['id'],
            'before_widget' => '<section id="%1$s" class="widget %2$s">',
            'after_widget'  => '</section>',
            'before_title'  => '<div class="widget-title"><span>',
            'after_title'   => '</span></div>',
        ) );
    }
}

/**
 * Optimized Frontend Scripts - Reduced overhead
 */
add_action( 'wp_enqueue_scripts', 'brighthub_scripts', 99 );
function brighthub_scripts() {
    if (function_exists('brighthub_optimized_scripts')) {
        return;
    }  
    $brighthub_version = wp_get_theme( get_template() );
    $version = $brighthub_version->get( 'Version' );

    wp_enqueue_style('magnific-popup', get_template_directory_uri() . '/assets/css/libs/magnific-popup.css', array(), '1.1.0');
    wp_enqueue_script( 'magnific-popup', get_template_directory_uri() . '/assets/js/libs/magnific-popup.min.js', array( 'jquery' ), '1.1.0', true );

    wp_enqueue_style('wow-animate', get_template_directory_uri() . '/assets/css/libs/animate.min.css', array(), '1.1.0');
    wp_enqueue_script( 'wow-animate', get_template_directory_uri() . '/assets/js/libs/wow.min.js', array( 'jquery' ), '1.0.0', true );
    
    $load_intl_tel = false;
    if (is_singular() || is_page() || is_home() || is_archive()) {
        global $post;
        $content = '';
        if ($post) {
            $content = $post->post_content;
        }
        
        // Check for phone input field
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
    }
    
    if ($load_intl_tel) {
        wp_enqueue_style('intlTelInput', get_template_directory_uri() . '/assets/css/libs/intlTelInput.css', array(), '1.0.0');
        wp_enqueue_script( 'intlTelInput', get_template_directory_uri() . '/assets/js/libs/intlTelInput.min.js', array( 'jquery' ), '17.0.8', true );
    }

    // Register but don't enqueue heavy scripts by default
    wp_register_script( 'particles-background', get_template_directory_uri() . '/assets/js/libs/particles.min.js', array( 'jquery' ), '1.1.0', true );
    wp_register_script( 'tilt', get_template_directory_uri() . '/assets/js/libs/tilt.min.js', array( 'jquery' ), '1.0.0', true );
    wp_register_script( 'stellar-parallax', get_template_directory_uri() . '/assets/js/libs/stellar-parallax.min.js', array( 'jquery' ), '0.6.2', true );
    wp_register_script( 'pxl-scroll', get_template_directory_uri() . '/assets/js/libs/scroll.min.js', array( 'jquery' ), '0.6.0', true );
    wp_register_script( 'pxl-easing', get_template_directory_uri() . '/assets/js/libs/easing.js', array( 'jquery' ), '1.3.0', true );
    wp_register_script( 'pxl-tweenmax', get_template_directory_uri() . '/assets/js/libs/tweenmax.min.js', array( 'jquery' ), '2.1.2', true );
    wp_register_script( 'pxl-parallax-move-mouse', get_template_directory_uri() . '/assets/js/libs/parallax-move-mouse.js', array( 'jquery' ), '1.0.0', true );

    // Essential scripts
    wp_enqueue_script( 'nice-select', get_template_directory_uri() . '/assets/js/libs/nice-select.min.js', array( 'jquery' ), '1.0.0', true );

    wp_enqueue_script( 'pxl-parallax-scroll', get_template_directory_uri() . '/assets/js/libs/parallax-scroll.js', array( 'jquery' ), $version, true );
    $smooth_scroll = brighthub()->get_theme_opt( 'smooth_scroll', 'off' );
    if($smooth_scroll == 'on') {
        wp_enqueue_script( 'gsap' );
        wp_enqueue_script( 'pxl-scroll-smoother' );
        wp_enqueue_script( 'pxl-bundled-lenis' );
    }

    // Styles - Use static version for better caching
    wp_enqueue_style( 'pxl-caseicon', get_template_directory_uri() . '/assets/css/caseicon.css', array(), $version );
    wp_enqueue_style( 'pxl-phosphor', get_template_directory_uri() . '/assets/css/phosphor.css', array(), $version );
    wp_enqueue_style( 'pxl-grid', get_template_directory_uri() . '/assets/css/grid.css', array(), $version );
    wp_enqueue_style( 'pxl-style', get_template_directory_uri() . '/assets/css/style.css', array(), $version );
    wp_add_inline_style( 'pxl-style', brighthub_inline_styles() );
    wp_enqueue_style( 'pxl-base', get_template_directory_uri() . '/style.css', array(), $version );
    wp_enqueue_style( 'pxl-google-fonts', brighthub_fonts_url(), array(), null );
    
    // Main theme script
    wp_enqueue_script('pxl-main', get_template_directory_uri() . '/assets/js/theme.js', array('jquery', 'nice-select'), $version, true);
    wp_localize_script('pxl-main', 'loadmore_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'startPage' => get_query_var('paged') ? get_query_var('paged') : 1,
    ));
    
    do_action( 'brighthub_scripts');
}

/**
 * Optimized Admin Scripts - Avoid conflicts
 */
add_action('admin_enqueue_scripts', 'brighthub_admin_style');
function brighthub_admin_style($hook) {
    $theme = wp_get_theme( get_template() );
    
    // Core admin styles
    wp_enqueue_style( 'brighthub-admin-style', get_template_directory_uri() . '/assets/css/admin.css', array(), $theme->get( 'Version' ) );
    wp_enqueue_style('caseicon', get_template_directory_uri() . '/assets/css/caseicon.css');
    wp_enqueue_style('pxl-phosphor', get_template_directory_uri() . '/assets/css/phosphor.css');

    $allowed_pages = array(
        'toplevel_page_pxlart-admin',
        'admin_page_pxl-demo-install',
        'widgets.php',
        'customize.php'
    );
    
    if (in_array($hook, $allowed_pages)) {
        wp_enqueue_style('magnific-popup', get_template_directory_uri() . '/assets/css/libs/magnific-popup.css', array(), '1.1.0');
        wp_enqueue_script( 'magnific-popup', get_template_directory_uri() . '/assets/js/libs/magnific-popup.min.js', array( 'jquery' ), '1.1.0', true );
    }
}

// Elementor editor styles
add_action( 'elementor/editor/before_enqueue_scripts', function() {
    wp_enqueue_style( 'elementor-caseicon', get_template_directory_uri() . '/assets/css/caseicon.css');
    wp_enqueue_style( 'elementor-pxl-phosphor', get_template_directory_uri() . '/assets/css/phosphor.css');
    wp_enqueue_style( 'brighthub-admin-style', get_template_directory_uri() . '/assets/css/admin.css');
    
    // Register and enqueue odometer for editor
    wp_register_style( 'odometer', get_template_directory_uri() . '/assets/css/libs/odometer.css', array(), '1.0.0');
    wp_register_script( 'odometer', get_template_directory_uri() . '/elements/assets/js/odometer.min.js', array( 'jquery' ), '1.0.0', false );
    wp_enqueue_style( 'odometer' );
    wp_enqueue_script( 'odometer' );
} );

/**
 * Add a pingback url auto-discovery header for singularly identifiable articles.
 */
add_action( 'wp_head', 'brighthub_pingback_header' );
function brighthub_pingback_header(){
    if ( is_singular() && pings_open() ) {
        echo '<link rel="pingback" href="', esc_url( get_bloginfo( 'pingback_url' ) ), '">';
    }
}

/* Optimized Template Hooks */
add_action( 'pxl_anchor_target', 'brighthub_hook_anchor_templates_hidden_panel');
function brighthub_hook_anchor_templates_hidden_panel(){
    $hidden_templates = brighthub_get_templates_slug('hidden-panel');
    if(empty($hidden_templates)) return;

    foreach ($hidden_templates as $slug => $values){
        $args = [
            'slug' => $slug,
            'post_id' => $values['post_id']
        ];
        if( did_action('pxl_anchor_target_hidden_panel_'.$values['post_id']) <= 0){  
            do_action( 'pxl_anchor_target_hidden_panel_'.$values['post_id'], $args );  
        }
    } 
}

if(!function_exists('brighthub_hook_anchor_hidden_panel')){
    function brighthub_hook_anchor_hidden_panel($args){
        $hidden_panel_position = get_post_meta( $args['post_id'], 'hidden_panel_position', true );
        $hidden_panel_boxcolor = get_post_meta( $args['post_id'], 'hidden_panel_boxcolor', true );
        $hidden_panel_height = get_post_meta( $args['post_id'], 'hidden_panel_height', true ); ?>
        <div class="pxl-popup--hidden-panel pxl-hidden-template-<?php echo esc_attr($args['post_id'])?> pxl-pos-<?php echo esc_attr($hidden_panel_position); ?>">
            <div class="pxl-popup__overlay"></div>
            <div class="pxl-popup__conent" style="height:<?php echo esc_attr($hidden_panel_height).'px'; ?>; background-color:<?php echo esc_attr($hidden_panel_boxcolor); ?>;">
                <div class="pxl-conent-elementor">
                    <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$args['post_id']); ?>
                </div>
            </div>
        </div>
    <?php }
}

/* Elementor Popup */
add_action( 'pxl_anchor_target', 'brighthub_hook_anchor_templates_popup');
function brighthub_hook_anchor_templates_popup(){
    $popup_templates = brighthub_get_templates_slug('popup');
    if(empty($popup_templates)) return;

    foreach ($popup_templates as $slug => $values){
        $args = [
            'slug' => $slug,
            'post_id' => $values['post_id']
        ];
        if( did_action('pxl_anchor_target_popup_'.$values['post_id']) <= 0){  
            do_action( 'pxl_anchor_target_popup_'.$values['post_id'], $args );  
        }
    } 
}

if(!function_exists('brighthub_hook_anchor_popup')){
    function brighthub_hook_anchor_popup($args){ ?>
        <div id="pxl-popup-elementor" class="pxl-popup-elementor-wrap">
            <div class="pxl-item--overlay">
                <div class="pxl-item--flip pxl-item--flip1"></div>
                <div class="pxl-item--flip pxl-item--flip2"></div>
                <div class="pxl-item--flip pxl-item--flip3"></div>
                <div class="pxl-item--flip pxl-item--flip4"></div>
                <div class="pxl-item--flip pxl-item--flip5"></div>
            </div>
            <div class="pxl-item--close pxl-close"><svg class="iconsvg-close" role="presentation" viewBox="0 0 16 14" width="16" height="16"><path d="M15 0L1 14m14 0L1 0" stroke="currentColor" fill="none" fill-rule="evenodd"></path></svg></div>
            <div class="pxl-item--conent">
                <div class="pxl-conent-elementor">
                    <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$args['post_id']); ?>
                </div>
            </div>
        </div>
    <?php }
}

/* Page Popup */
add_action( 'pxl_anchor_target', 'brighthub_hook_anchor_templates_page_popup');
function brighthub_hook_anchor_templates_page_popup(){
    $page_templates = brighthub_get_templates_slug('page');
    if(empty($page_templates)) return;

    foreach ($page_templates as $slug => $values){
        $args = [
            'slug' => $slug,
            'post_id' => $values['post_id']
        ];
        if( did_action('pxl_anchor_target_page_popup_'.$values['post_id']) <= 0){  
            do_action( 'pxl_anchor_target_page_popup_'.$values['post_id'], $args );  
        }
    } 
}

if(!function_exists('brighthub_hook_anchor_page_popup')){
    function brighthub_hook_anchor_page_popup($args){ ?>
        <div class="pxl-popup--page pxl-popup--page-template-<?php echo esc_attr($args['post_id'])?>">
            <div class="pxl-popup__overlay"></div>
            <div class="pxl-popup--close"><svg class="iconsvg-close" role="presentation" viewBox="0 0 16 14" width="16" height="16"><path d="M15 0L1 14m14 0L1 0" stroke="currentColor" fill="none" fill-rule="evenodd"></path></svg></div>
            <div class="pxl-popup__conent">
                <div class="pxl-conent-elementor">
                    <?php 
                        $content_page = \Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$args['post_id'] );
                        pxl_print_html($content_page);
                    ?>
                </div>
            </div>
        </div>
    <?php }
}

function pxl_handle_new_comment() {
    if (!wp_verify_nonce($_POST['nonce'], 'pxl_comment_reply_nonce')) {
        wp_send_json_error('Error security!');
    }

    $post_id = intval($_POST['post_id']);
    $content = sanitize_textarea_field($_POST['comment_content']);
    
    if (!$content || !$post_id) {
        wp_send_json_error('Missing data!');
    }

    $rating = 0;
    if (get_post_type($post_id) === 'product' && isset($_POST['rating']) && !empty($_POST['rating'])) {
        $rating = intval($_POST['rating']);
        if ($rating < 1 || $rating > 5) {
            wp_send_json_error('Rating is not valid!');
        }
    }

    $commentdata = array(
        'comment_post_ID' => $post_id,
        'comment_content' => $content,
        'comment_approved' => 1,
    );

    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $commentdata['user_id'] = $user->ID;
        $commentdata['comment_author'] = $user->display_name;
        $commentdata['comment_author_email'] = $user->user_email;
    } else {
        $commentdata['comment_author'] = sanitize_text_field($_POST['comment_author']);
        $commentdata['comment_author_email'] = sanitize_email($_POST['comment_author_email']);
    }

    $comment_id = wp_insert_comment($commentdata);
    
    if ($comment_id) {
        if (get_post_type($post_id) === 'product' && $rating > 0) {
            add_comment_meta($comment_id, 'rating', $rating);
            update_product_rating($post_id);
        }
        
        $response = array(
            'comment_id' => $comment_id,
            'post_id' => $post_id,
            'author' => get_comment_author($comment_id),
            'time' => 'just now',
            'content' => get_comment_text($comment_id),
            'avatar' => get_avatar(get_comment($comment_id), 40),
            'rating' => get_comment_meta($comment_id, 'rating', true)
        );
        wp_send_json_success($response);
    } else {
        wp_send_json_error('Cannot add comment');
    }
}

function update_product_rating($product_id) {
    if (get_post_type($product_id) !== 'product') {
        return;
    }
    
    global $wpdb;
    
    $ratings = $wpdb->get_col($wpdb->prepare("
        SELECT meta_value 
        FROM {$wpdb->commentmeta} cm
        INNER JOIN {$wpdb->comments} c ON cm.comment_id = c.comment_ID
        WHERE c.comment_post_ID = %d 
        AND cm.meta_key = 'rating'
        AND c.comment_approved = '1'
        AND meta_value > 0
    ", $product_id));
    
    if (!empty($ratings)) {
        $average_rating = array_sum($ratings) / count($ratings);
        $rating_count = count($ratings);
        
        update_post_meta($product_id, '_wc_average_rating', number_format($average_rating, 2));
        update_post_meta($product_id, '_wc_review_count', $rating_count);
    }
}

add_action('wp_ajax_post_new_comment', 'pxl_handle_new_comment');
add_action('wp_ajax_nopriv_post_new_comment', 'pxl_handle_new_comment');
/**
 * Optimized Comment AJAX Handlers - Reduced complexity
 */
function brighthub_comment_like_ajax() {
    if (!isset($_POST['nonce_like']) || !wp_verify_nonce($_POST['nonce_like'], 'pxl_comment_like_nonce')) {
        wp_die('Security check failed');
    }
    
    $comment_id = isset($_POST['comment_id']) ? intval($_POST['comment_id']) : 0;
    if ($comment_id <= 0) {
        wp_die('Invalid comment ID');
    }
    
    $likes = get_comment_meta($comment_id, 'comment_likes', true);
    $likes = (empty($likes)) ? 1 : $likes + 1;
    
    update_comment_meta($comment_id, 'comment_likes', $likes);
    
    echo esc_html($likes);
    wp_die();
}
add_action('wp_ajax_brighthub_comment_like', 'brighthub_comment_like_ajax');
add_action('wp_ajax_nopriv_brighthub_comment_like', 'brighthub_comment_like_ajax');

/**
 * Simplified Comment Reply Handler - Removed heavy operations
 */
function pxl_handle_comment_reply() {
    // Early validation
    $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
    $comment_parent_id = isset($_POST['comment_parent_id']) ? intval($_POST['comment_parent_id']) : 0;
    $comment_content = isset($_POST['comment_content']) ? sanitize_textarea_field($_POST['comment_content']) : '';
    
    if (empty($comment_content) || $post_id <= 0) {
        wp_send_json_error('Invalid data');
        wp_die();
    }

    $data = array(
        'comment_post_ID' => $post_id,
        'comment_content' => $comment_content,
        'comment_parent' => $comment_parent_id,
        'comment_type' => 'comment',
        'comment_approved' => 1,
    );

    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $data['user_id'] = $user->ID;
        $data['comment_author'] = $user->display_name;
        $data['comment_author_email'] = $user->user_email;
        $data['comment_author_url'] = $user->user_url;
    } else {
        $data['user_id'] = 0;
        $data['comment_author'] = isset($_POST['comment_author']) ? sanitize_text_field($_POST['comment_author']) : 'Anonymous';
        $data['comment_author_email'] = isset($_POST['comment_author_email']) ? sanitize_email($_POST['comment_author_email']) : '';
        $data['comment_author_url'] = '';
    }
    
    $comment_id = wp_insert_comment($data);
    
    if (!$comment_id) {
        wp_send_json_error('Failed to add comment');
        wp_die();
    }
    
    $user_id = get_current_user_id();

    $response = array(
        'comment_id' => $comment_id,
        'parent_id' => $comment_parent_id,
        'post_id' => $post_id,
        'content' => wp_kses_post(get_comment_text($comment_id)),
        'author' => wp_kses_post(get_comment_author($comment_id)),
        'time' => 'just now', 
        'avatar'  => get_avatar( $user_id, 40 )
    );
    
    wp_send_json_success($response);
    wp_die();
}

if (brighthub()->get_theme_opt('comment_post') === '1' || brighthub()->get_theme_opt('product_comment') === '1') {
    add_action('wp_ajax_post_comment_reply', 'pxl_handle_comment_reply');
    add_action('wp_ajax_nopriv_post_comment_reply', 'pxl_handle_comment_reply');
}

// Remove comment
function brighthub_remove_comment() {
    if (
        ! current_user_can( 'administrator' ) ||                        
        empty( $_POST['nonce'] )  ||
        ! wp_verify_nonce( $_POST['nonce'], 'pxl_comment_reply_nonce' )
    ) {
        wp_send_json_error( 'Permission denied' );
    }

    $comment_id = isset( $_POST['comment_id'] ) ? intval( $_POST['comment_id'] ) : 0;
    if ( ! $comment_id || ! get_comment( $comment_id ) ) {
        wp_send_json_error( 'Invalid comment' );
    }
    brighthub_delete_comment_tree( $comment_id );
    wp_send_json_success( array( 'comment_id' => $comment_id ) );
    wp_die();
}

/**
 * Function delete comment tree
 *
 * @param int $comment_id
 */
function brighthub_delete_comment_tree( $comment_id ) {
    $child_ids = get_comments( array(
        'parent'        => $comment_id,
        'status'        => 'all',
        'hierarchical'  => 'threaded',
        'fields'        => 'ids',
        'number'        => 0,
    ) );

    foreach ( $child_ids as $child_id ) {
        brighthub_delete_comment_tree( $child_id );
    }

    wp_delete_comment( $comment_id, true );
}


if (current_user_can('administrator')) {
    add_action('wp_ajax_remove_comment', 'brighthub_remove_comment');
}

function pxl_enqueue_comment_scripts() {
    // Only load on singular posts/pages with comments open
    if (!is_singular() || !comments_open()) {
        return;
    }
    
    wp_enqueue_script('pxl-comment-script', get_template_directory_uri() . '/assets/js/libs/comment.js', array('jquery'), '1.0', true);
    
    wp_localize_script('pxl-comment-script', 'pxl_ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'template_directory' => get_template_directory_uri(),
        'is_logged_in' => is_user_logged_in(),
        'user_avatar' => is_user_logged_in() ? get_avatar_url(get_current_user_id(), 40) : '',
        'default_avatar' => get_template_directory_uri() . '/assets/img/df_avt.jpg',
        'nonce' => wp_create_nonce('pxl_comment_reply_nonce'),
        'nonce_like' => wp_create_nonce('pxl_comment_like_nonce'),
        'is_admin' => current_user_can('administrator'),
    ));
}
add_action('wp_enqueue_scripts', 'pxl_enqueue_comment_scripts');

/**
 * Performance Monitoring - Only in debug mode
 */
if (defined('WP_DEBUG') && WP_DEBUG) {
    function brighthub_performance_monitor() {
        if (function_exists('memory_get_peak_usage')) {
            $memory = memory_get_peak_usage(true) / 1024 / 1024;
        }
    }
    add_action('wp_footer', 'brighthub_performance_monitor', 9999);
    add_action('admin_footer', 'brighthub_performance_monitor', 9999);
}

/**
 * Cache Optimization Hints
 */
function brighthub_cache_headers() {
    if (!is_admin() && !is_user_logged_in()) {
        header('Cache-Control: public, max-age=3600');
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
    }
}
add_action('template_redirect', 'brighthub_cache_headers', 1);

/**
 * AJAX Handler for User Login - Compatible with Case User plugin
 * Fixes 500 error by handling login requests in theme
 * Plugin only registers wp_ajax_nopriv but we need both handlers
 */
function brighthub_pxl_user_login_handler() {
    header('Content-Type: application/json');
    
    // Check nonce - plugin uses 'up-nonce-ajax'
    if (!check_ajax_referer('up-nonce-ajax', '_ajax_nonce', false)) {
        die(json_encode((object)array('error'=> true, 'message' => esc_html__('Security check failed', 'case-user'))));
    }
    
    // Plugin uses $_REQUEST['data'] format
    if(empty($_REQUEST['data'])) {
        die(json_encode((object)array('error'=> true, 'message' => esc_html__('Request Null', 'case-user'))));
    }

    $login_data = $_REQUEST['data'];

    // Validate user
    if(empty($login_data['user'])) {
        die(json_encode((object)array('error'=> true, 'user' => esc_html__('User name null', 'case-user'))));
    }

    // Validate password
    if(empty($login_data['pass'])) {
        die(json_encode((object)array('error'=> true, 'pass' => esc_html__('Password null', 'case-user'))));
    }

    // Fix: rememberme should be array access, not object
    $rememberme = (isset($login_data['rememberme']) && $login_data['rememberme']) ? true : false;

    // Attempt login using WordPress wp_signon (plugin uses wp_login which doesn't exist)
    $creds = array(
        'user_login'    => sanitize_user($login_data['user']),
        'user_password' => $login_data['pass'],
        'remember'      => $rememberme
    );

    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        // Check if username exists to provide appropriate error
        if(username_exists($login_data['user'])) {
            die(json_encode((object)array('error'=> true, 'pass'=> esc_html__('Password incorrect', 'case-user'))));
        }
        die(json_encode((object)array('error'=> true, 'user'=> esc_html__('User incorrect', 'case-user'))));
    }

    // Login successful
    die(json_encode((object)array('error'=> false)));
}
// Add handler for both logged in and non-logged in users
// Use priority 1 to run before plugin's handler (default priority is 10)
add_action('wp_ajax_pxl_user_login', 'brighthub_pxl_user_login_handler', 1);
add_action('wp_ajax_nopriv_pxl_user_login', 'brighthub_pxl_user_login_handler', 1);

/**
 * Database Query Optimization
 */
// function brighthub_optimize_queries() {
//     // Disable WordPress emoji scripts
//     remove_action('wp_head', 'print_emoji_detection_script', 7);
//     remove_action('wp_print_styles', 'print_emoji_styles');
//     remove_action('admin_print_scripts', 'print_emoji_detection_script');
//     remove_action('admin_print_styles', 'print_emoji_styles');
    
//     // Remove query strings from static resources
//     add_filter('script_loader_src', 'brighthub_remove_script_version', 15, 1);
//     add_filter('style_loader_src', 'brighthub_remove_script_version', 15, 1);
    
//     // Disable XML-RPC
//     add_filter('xmlrpc_enabled', '__return_false');
    
//     // Remove Windows Live Writer manifest
//     remove_action('wp_head', 'wlwmanifest_link');
    
//     // Remove RSD link
//     remove_action('wp_head', 'rsd_link');
    
//     // Remove WordPress version
//     remove_action('wp_head', 'wp_generator');
// }

// add_action('init', 'brighthub_optimize_queries');

// function brighthub_remove_script_version($src) {
//     if (strpos($src, 'ver=')) {
//         $src = remove_query_arg('ver', $src);
//     }
//     return $src;
// }

/**
 * Lazy Load Optimization - Re-enable selectively
 */
function brighthub_optimize_lazy_loading($enabled, $tag_name, $context) {
    // Disable lazy loading in admin and for critical images
    if (is_admin() || $context === 'template' || strpos($tag_name, 'hero') !== false) {
        return false;
    }
    return $enabled;
}
add_filter('wp_lazy_loading_enabled', 'brighthub_optimize_lazy_loading', 10, 3);

/**
 * Search Popup Hook
 */
if(!function_exists('brighthub_hook_anchor_search')){
    function brighthub_hook_anchor_search(){
        $logo_s_p = brighthub()->get_theme_opt( 'logo_s_p', ['url' => get_template_directory_uri().'/assets/img/logo.png', 'id' => '' ] ); 
        $placeholder_search_pu = brighthub()->get_theme_opt( 'placeholder_search_pu', 'Search...'); 
        ?>
        <div id="pxl-search-popup">
            <div class="pxl-item--overlay"></div>
            <div class="pxl-item--conent">
                <div class="pxl-item--close pxl-close"></div>
                <form role="search" method="get" action="<?php echo esc_url(home_url( '/' )); ?>">
                    <input type="text" required placeholder="<?php echo esc_attr($placeholder_search_pu); ?>" name="s" class="search-field" />
                    <button type="submit" class="search-submit rm-style-default"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <g clip-path="url(#clip0_243_485)">
                        <path d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M15.8047 15.8037L21.0012 21.0003" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                    <defs>
                        <clipPath id="clip0_243_485">
                          <rect width="24" height="24" fill="black"/>
                      </clipPath>
                    </defs>
                    </svg></button>
                </form>
            </div>
        </div>
        <?php
    }
}

add_action( 'wp_head', 'brighthub_inline_theme_option', 999 );
function brighthub_inline_theme_option(){
    $dynamic_css = wp_strip_all_tags( brighthub()->get_theme_opt( 'custom_css','' ) );
    $dynamic_js  = wp_strip_all_tags( brighthub()->get_theme_opt( 'custom_js','' ) );
    if(!empty($dynamic_css))
        echo "<style id='brighthub-custom-style-inline-css' type='text/css'>" . $dynamic_css . '</style>';

    if(!empty($dynamic_js))
        echo "<script id='brighthub-custom-script' type='text/javascript'>" . $dynamic_js . '</script>';
}

/**
 * Render Background Effects HTML (Floating Blobs & Video Background)
 */
add_action('wp_body_open', 'brighthub_render_background_effects', 5);
function brighthub_render_background_effects() {
    $bg_light_effect = brighthub()->get_page_opt('bg_light_effect', 'off');
    $select_background_effect = brighthub()->get_page_opt('select_background_effect', 'none');
    
    if ($bg_light_effect == 'on') {
        // Render Floating Blobs
        if ($select_background_effect == 'floating-blobs') {
            echo '<div id="pxl-gsap-light-blob" class="pxl-floating-blobs">
                <div class="pxl-light-blob pxl-light-blob-1"></div>
                <div class="pxl-light-blob pxl-light-blob-2"></div>
                <div class="pxl-light-blob pxl-light-blob-3"></div>
            </div>';
        }
        
        // Render Video Background
        if ($select_background_effect == 'video-background') {
            $video_url = brighthub()->get_page_opt('video_background_url', '');
            if (!empty($video_url)) {
                echo '<div id="pxl-video-background" class="pxl-video-background">
                    <video autoplay muted loop playsinline>
                        <source src="' . esc_url($video_url) . '" type="video/mp4">
                    </video>
                    <div class="pxl-video-background-overlay"></div>
                </div>';
            }
        }
    }
}

/**
 * Add template to admin bar
 */
add_action('admin_bar_menu', 'add_template_to_admin_bar', 100);
function add_template_to_admin_bar($wp_admin_bar) {
    $wp_admin_bar->add_node(array(
        'parent' => 'brighthub',
        'id'     => 'pxl-template',
        'title'  => 'Templates',
        'href'   => admin_url('edit.php?post_type=pxl-template'),
        'meta'   => array(
            'title' => 'Templates',
        ),
    ));
}