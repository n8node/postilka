<?php
/**
 * Helper functions for the theme
 *
 * @package Case-Themes
 */
  

function brighthub_html($html){
    return $html;
}

/**
 * Google Fonts
*/
function brighthub_fonts_url() {
    $families = [];

    if ( 'off' !== _x( 'on', 'Inter font: on or off', 'brighthub' ) ) { 
        $families[] = 'Inter:ital,wght@0,100..900;1,100..900';
    }

    if ( 'off' !== _x( 'on', 'Arapey font: on or off', 'brighthub' ) ) {
        $families[] = 'Arapey:ital,wght@0,400;1,400';
    }  
    
    if ( 'off' !== _x( 'on', 'Sora font: on or off', 'brighthub' ) ) {
        $families[] = 'Sora:ital,wght@0,100..800;1,100..800';
    }

    if ( 'off' !== _x( 'on', 'Allura font: on or off', 'brighthub' ) ) {
        $families[] = 'Allura';
    }

    if ( 'off' !== _x( 'on', 'Rubik font: on or off', 'brighthub' ) ) {
        $families[] = 'Rubik:ital,wght@0,300..900;1,300..900';
    }

    if ( 'off' !== _x( 'on', 'Geist font: on or off', 'brighthub' ) ) {
        $families[] = 'Geist:ital,wght@0,100..900;1,100..900';
    }

    if ( 'off' !== _x( 'on', 'Rethink Sans font: on or off', 'brighthub' ) ) {
        $families[] = 'Rethink Sans:ital,wght@0,100..900;1,100..900';
    }

    if ( 'off' !== _x( 'on', 'Poppins font: on or off', 'brighthub' ) ) {
        $families[] = 'Poppins:ital,wght@0,100..900;1,100..900';
    }
    

    if ( empty( $families ) ) {
        return '';
    }

    $subset  = 'latin,latin-ext';
    $base    = 'https://fonts.googleapis.com/css2';
    $query   = 'family=' . implode('&family=', array_map('rawurlencode', $families));
    $query  .= '&display=swap';
    $query  .= '&subset=' . rawurlencode($subset);

    $url = $base . '?' . $query;
    return esc_url( $url );
}

/*
 * Get page ID by Slug
*/
function brighthub_get_id_by_slug($slug, $post_type){
    $content = get_page_by_path($slug, OBJECT, $post_type);
    $id = $content->ID;
    return $id;
}

/**
 * Show content by slug
 **/
function brighthub_content_by_slug($slug, $post_type){
    $content = brighthub_get_content_by_slug($slug, $post_type);

    $id = brighthub_get_id_by_slug($slug, $post_type);
    echo apply_filters('the_content',  $content);
}

/**
 * Get content by slug
 **/
function brighthub_get_content_by_slug($slug, $post_type){
    $cache_key = 'brighthub_content_' . $slug . '_' . $post_type;
    $cached = wp_cache_get($cache_key, 'brighthub');
    
    if ($cached !== false) {
        return $cached;
    }
    
    $content = get_posts(
        array(
            'name'      => $slug,
            'post_type' => $post_type,
            'posts_per_page' => 1,
            'no_found_rows' => true,
        )
    );
    
    $result = '';
    if(!empty($content)) {
        $result = $content[0]->post_content;
    }
    
    // Cache for 1 hour
    wp_cache_set($cache_key, $result, 'brighthub', 3600);
    
    return $result;
}

/**
 * Custom Comment List
 */

function brighthub_comment_list($comment, $args, $depth) {
    $likes = get_comment_meta($comment->comment_ID, 'comment_likes', true);
    if (empty($likes)) {
        $likes = 0;
    }

    if ('div' === $args['style']) {
        $tag       = 'div';
        $add_below = 'comment';
    } else {
        $tag       = 'li';
        $add_below = 'div-comment';
    }
    ?>
    <<?php echo ''.$tag ?> <?php comment_class(empty($args['has_children']) ? 'pxl-comments__item' : 'parent pxl-comments__item') ?> id="comment-<?php comment_ID() ?>">
    <?php if ('div' != $args['style']) : ?>
        <div id="div-comment-<?php comment_ID() ?>" class="pxl-comments__item-body">
    <?php endif; ?>
            <div class="pxl-comments__item-inner">
                    <div class="pxl-comment__action-hide">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8.00039 9.59844C8.88405 9.59844 9.60039 8.88209 9.60039 7.99844C9.60039 7.11478 8.88405 6.39844 8.00039 6.39844C7.11673 6.39844 6.40039 7.11478 6.40039 7.99844C6.40039 8.88209 7.11673 9.59844 8.00039 9.59844Z" fill="#181D27"/>
                            <path d="M3.73281 9.59844C4.61647 9.59844 5.33281 8.88209 5.33281 7.99844C5.33281 7.11478 4.61647 6.39844 3.73281 6.39844C2.84916 6.39844 2.13281 7.11478 2.13281 7.99844C2.13281 8.88209 2.84916 9.59844 3.73281 9.59844Z" fill="#181D27"/>
                            <path d="M12.266 9.59844C13.1497 9.59844 13.866 8.88209 13.866 7.99844C13.866 7.11478 13.1497 6.39844 12.266 6.39844C11.3824 6.39844 10.666 7.11478 10.666 7.99844C10.666 8.88209 11.3824 9.59844 12.266 9.59844Z" fill="#181D27"/>
                        </svg>
                        <ul class="pxl-comment__opt">
                            <?php if(current_user_can('administrator')) : ?>
                                <li><?php echo esc_html__('Hide', 'brighthub'); ?></li>
                                <li class="pxl-comment__remove" data-comment-id="<?php comment_ID(); ?>"><?php echo esc_html__('Remove', 'brighthub'); ?></li>
                            <?php else : ?>
                                <li><?php echo esc_html__('Hide', 'brighthub'); ?></li>
                            <?php endif; ?>
                        </ul>
                    </div>
               
                <?php if ($args['avatar_size'] != 0) : ?>
                    <div class="pxl-comments__avatar">
                        <?php echo get_avatar($comment, 40); ?>
                        <h4 class="pxl-comments__item-title">
                            <?php printf('%s', get_comment_author_link()); ?>
                        </h4>
                        <span class="pxl-comments__item-time">
                            <?php echo brighthub_get_short_time_diff(get_comment_time('U'), current_time('timestamp')); ?>
                        </span>
                    </div>
                <?php endif; ?>
                <div class="pxl-comments__item-cnt">
                    <?php 
                        if ( is_singular( 'product' ) && $depth === 1 ) {
                            $rating = intval( get_comment_meta( $comment->comment_ID, 'rating', true ) );
                            echo '<div class="pxl-comment__rating">';
                            for ( $i = 1; $i <= 5; $i++ ) {
                                echo esc_html($i <= $rating ? '★' : '☆');
                            }
                            echo '</div>';
                        }
                    ?>
                    <div class="pxl-comments__item-text"><?php comment_text(); ?></div>
                    <div class="pxl-comments__actions">
                        <div class="pxl-comments__like" data-comment-id="<?php comment_ID(); ?>">
                            <img src="<?php echo esc_url(get_template_directory_uri(). '/assets/img/like.png' ) ?>" alt="<?php esc_attr_e('Like', 'brighthub'); ?>" loading="lazy" />
                            <span class="pxl-comments__like-count"><?php echo esc_html($likes); ?></span> 
                        </div>
                        <?php if($depth < 3) : ?>
                            <div class="pxl-comments__item-reply" data-comment-id="<?php comment_ID(); ?>"><?php echo esc_html__('Reply', 'brighthub'); ?></div>
                        <?php endif; ?>
                    </div>
                    <?php get_template_part('template-parts/content/comment-reply-form'); ?>
                </div>
            </div>
    <?php if ('div' != $args['style']) : ?>
        </div>
    <?php endif;
}

/**
 * Helper function to check if lazy loading should be applied
 * 
 * @param string $class The class string to check for 'no-lazyload'
 * @return string 'lazy' or 'eager' based on theme option and class
 */
function brighthub_get_lazy_loading_attr($class = '') {
    // Check theme option
    $lazy_loading_enabled = brighthub()->get_theme_opt('enable_lazy_loading', true);
    
    // If option is disabled, return 'eager' (no lazy loading)
    if (!$lazy_loading_enabled) {
        return 'eager';
    }
    
    // If option is enabled but has 'no-lazyload' class, return 'eager'
    if (!empty($class) && strpos($class, 'no-lazyload') !== false) {
        return 'eager';
    }
    
    // Otherwise, return 'lazy'
    return 'lazy';
}

/**
 * Debug helper: Add visual indicator for lazy loading (only in debug mode)
 */
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('wp_footer', 'brighthub_lazy_loading_debug_script');
    function brighthub_lazy_loading_debug_script() {
        $lazy_loading_enabled = brighthub()->get_theme_opt('enable_lazy_loading', true);
        ?>
        <script>
        (function() {
            // Check if debug mode is enabled via URL parameter
            var urlParams = new URLSearchParams(window.location.search);
            var debugLazy = urlParams.get('debug_lazy') === '1';
            
            if (!debugLazy) return;
            
            console.log('=== Lazy Loading Debug Mode ===');
            console.log('Lazy Loading Enabled: <?php echo $lazy_loading_enabled ? 'true' : 'false'; ?>');
            
            var images = document.querySelectorAll('img');
            var lazyCount = 0;
            var eagerCount = 0;
            var noAttrCount = 0;
            
            images.forEach(function(img, index) {
                var loading = img.getAttribute('loading');
                var hasNoLazyClass = img.classList.contains('no-lazyload');
                
                if (loading === 'lazy') {
                    lazyCount++;
                    // Add visual indicator
                    img.style.border = '2px solid green';
                    img.style.position = 'relative';
                    var badge = document.createElement('span');
                    badge.textContent = 'LAZY';
                    badge.style.cssText = 'position:absolute;top:0;left:0;background:green;color:white;padding:2px 5px;font-size:10px;z-index:9999;';
                    img.parentNode.style.position = 'relative';
                    img.parentNode.appendChild(badge);
                } else if (loading === 'eager') {
                    eagerCount++;
                    img.style.border = '2px solid orange';
                    var badge = document.createElement('span');
                    badge.textContent = 'EAGER';
                    badge.style.cssText = 'position:absolute;top:0;left:0;background:orange;color:white;padding:2px 5px;font-size:10px;z-index:9999;';
                    img.parentNode.style.position = 'relative';
                    img.parentNode.appendChild(badge);
                } else {
                    noAttrCount++;
                    img.style.border = '2px solid red';
                    var badge = document.createElement('span');
                    badge.textContent = 'NO ATTR';
                    badge.style.cssText = 'position:absolute;top:0;left:0;background:red;color:white;padding:2px 5px;font-size:10px;z-index:9999;';
                    img.parentNode.style.position = 'relative';
                    img.parentNode.appendChild(badge);
                }
                
                if (hasNoLazyClass) {
                    console.log('Image #' + index + ' has no-lazyload class:', img.src);
                }
            });
            
            console.log('Total images: ' + images.length);
            console.log('Lazy loaded: ' + lazyCount);
            console.log('Eager loaded: ' + eagerCount);
            console.log('No loading attr: ' + noAttrCount);
            console.log('==============================');
        })();
        </script>
        <?php
    }
}

/**
 * Paginate Links
 */
function brighthub_ajax_paginate_links($link){
    $parts = parse_url($link);
    if( !isset($parts['query']) ) return $link;
    parse_str($parts['query'], $query);
    if(isset($query['page']) && !empty($query['page'])){
        return '#' . $query['page'];
    }
    else{
        return '#1';
    }
}


/**
 * RGB Color
 */
function brighthub_hex_rgb($color) {
    $default = '0,0,0';
    if(empty($color))
        return $default; 
 
    if ($color[0] == '#' ) {
        $color = substr( $color, 1 );
    }

    if (strlen($color) == 6) {
        $hex = array( $color[0] . $color[1], $color[2] . $color[3], $color[4] . $color[5] );
    } elseif ( strlen( $color ) == 3 ) {
        $hex = array( $color[0] . $color[0], $color[1] . $color[1], $color[2] . $color[2] );
    } else {
        return $default;
    }

    $rgb =  array_map('hexdec', $hex);
    $output = implode(",",$rgb);

    return $output;
}


/**
 * Image Size Crop
 */
if(!function_exists('brighthub_get_image_by_size')){
    function brighthub_get_image_by_size( $params = array() ) {
        $params = array_merge( array(
            'post_id' => null,
            'attach_id' => null,
            'thumb_size' => 'thumbnail',
            'class' => '',
        ), $params );

        if ( ! $params['thumb_size'] ) {
            $params['thumb_size'] = 'thumbnail';
        }

        if ( ! $params['attach_id'] && ! $params['post_id'] ) {
            return false;
        }

        $post_id = $params['post_id'];

        $attach_id = $post_id ? get_post_thumbnail_id( $post_id ) : $params['attach_id'];
        $attach_id = apply_filters( 'pxl_object_id', $attach_id );
        $thumb_size = $params['thumb_size'];
        $thumb_class = ( isset( $params['class'] ) && '' !== $params['class'] ) ? $params['class'] . ' ' : '';

        global $_wp_additional_image_sizes;
        $thumbnail = '';

        $sizes = array(
            'thumbnail',
            'thumb',
            'medium',
            'medium_large',
            'large',
            'full',
        );
        if ( is_string( $thumb_size ) && ( ( ! empty( $_wp_additional_image_sizes[ $thumb_size ] ) && is_array( $_wp_additional_image_sizes[ $thumb_size ] ) ) || in_array( $thumb_size, $sizes, true ) ) ) {
            $attributes = array( 'class' => $thumb_class . 'attachment-' . $thumb_size );
            
            // Use helper function to determine lazy loading
            $loading_attr = brighthub_get_lazy_loading_attr($thumb_class);
            $attributes['loading'] = $loading_attr;
            
            $thumbnail = wp_get_attachment_image( $attach_id, $thumb_size, false, $attributes );
            $thumbnail_url = wp_get_attachment_image_url($attach_id, $thumb_size, false);
        } elseif ( $attach_id ) {
            if ( is_string( $thumb_size ) ) {
                preg_match_all( '/\d+/', $thumb_size, $thumb_matches );
                if ( isset( $thumb_matches[0] ) ) {
                    $thumb_size = array();
                    $count = count( $thumb_matches[0] );
                    if ( $count > 1 ) {
                        $thumb_size[] = $thumb_matches[0][0];
                        $thumb_size[] = $thumb_matches[0][1];
                    } elseif ( 1 === $count ) {
                        $thumb_size[] = $thumb_matches[0][0];
                        $thumb_size[] = $thumb_matches[0][0];
                    } else {
                        $thumb_size = false;
                    }
                }
            }
            if ( is_array( $thumb_size ) ) {
                $p_img = pxl_resize( $attach_id, null, $thumb_size[0], $thumb_size[1], true );
                $alt = trim( wp_strip_all_tags( get_post_meta( $attach_id, '_wp_attachment_image_alt', true ) ) );
                $attachment = get_post( $attach_id );
                if ( ! empty( $attachment ) ) {
                    $title = trim( wp_strip_all_tags( $attachment->post_title ) );

                    if ( empty( $alt ) ) {
                        $alt = trim( wp_strip_all_tags( $attachment->post_excerpt ) ); 
                    }
                    if ( empty( $alt ) ) {
                        $alt = $title;
                    }
                    if ( $p_img ) {
                        $loading_attr = brighthub_get_lazy_loading_attr($thumb_class);
                        
                        $img_attributes = array(
                            'class' => $thumb_class,
                            'src' => $p_img['url'],
                            'width' => $p_img['width'],
                            'height' => $p_img['height'],
                            'alt' => $alt,
                            'title' => $title,
                            'loading' => $loading_attr,
                        );
                        
                        
                        $attributes = pxl_stringify_attributes($img_attributes);
                        $thumbnail = '<img ' . $attributes . ' />';
                    }
                }
            }
            $thumbnail_url = $p_img['url'];
        }

        $p_img_large = wp_get_attachment_image_src( $attach_id, 'large' );

        return apply_filters( 'pxl_el_getimagesize', array(
            'thumbnail' => $thumbnail,
            'url' => $thumbnail_url,
            'p_img_large' => $p_img_large,
        ), $attach_id, $params );

    }
}

/**
 * Search Form
 */

function brighthub_header_mobile_search_form() {
    $search_mobile = brighthub()->get_theme_opt('search_mobile', false);
    $search_placeholder_mobile = brighthub()->get_theme_opt('search_placeholder_mobile');

    if ($search_mobile) : ?>
        <div class="pxl-header-mobile-search pxl-hide-xl">
            <?php get_search_form(); ?>
        </div>
    <?php endif;
}

/* Highlight Shortcode  */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_text_highlight_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'text' => '',
        ), $atts));

        ob_start();
        if(!empty($text)) : ?>
            <span class="pxl-heading__highlight"><span class="pxl-heading__highlight-text"><?php echo wp_kses_post($text); ?></span> </span>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('highlight', 'brighthub_text_highlight_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_image_highlight_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'id_image' => '',
        ), $atts));

        ob_start();
        if(!empty($id_image)) : 
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $id_image,
                'thumb_size' => 'full',
            ) );
            $thumbnail_url    = $img['url']; ?>
            <div class="pxl-image--highlight bg-image" style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);"></div>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('highlight_image', 'brighthub_image_highlight_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_text_highlight_shortcode_editor( $atts = array() ) {
        extract(shortcode_atts(array(
         'text' => '',
        ), $atts));

        ob_start();
        if(!empty($text)) : ?><span class="pxl-text-editor__highlight"><?php echo esc_html($text); ?></span><?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_highlight', 'brighthub_text_highlight_shortcode_editor');
}

/* Typewriter Shortcode  */
if (function_exists('pxl_register_shortcode')) {
    function brighthub_text_typewriter_shortcode($atts = []) {
        $atts = shortcode_atts([
            'text' => '',
        ], $atts);

        $text = esc_html($atts['text']);

        ob_start();
        if (!empty($text)) {
            $arr_str = explode(',', $text);
            ?>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <g clip-path="url(#clip0_2222_3708)">
                    <path d="M8.1746 7.28506L7.23526 6.10915C5.94803 4.50184 6.20895 2.15351 7.81977 0.866271L7.87888 0.817565C9.48619 -0.469672 11.8345 -0.208745 13.1218 1.40204L14.0576 2.57447L8.1746 7.28506Z" fill="#181D27"/>
                    <path d="M13.8907 17.1691C13.8594 17.4543 13.7168 17.7257 13.4767 17.9205C12.9932 18.3067 12.2869 18.2302 11.9008 17.7466L5.44717 9.67526C5.05404 9.18471 5.14102 8.46456 5.64548 8.08187C6.13254 7.71309 6.83182 7.81746 7.21451 8.29409L7.84422 9.08034L8.92271 8.21755L8.91923 8.21407L14.7988 3.5L29.842 22.3041L23.959 27.0147L10.3178 9.96749L9.2393 10.8303L13.6507 16.3445C13.8455 16.5845 13.922 16.8838 13.8907 17.1691Z" fill="#181D27"/>
                    <path d="M24.9366 27.8846L30.4786 23.4453C30.5691 23.7549 30.6143 24.0263 30.6143 24.0263L31.8842 30.1076C31.9746 30.546 31.5293 30.9043 31.1223 30.7165L25.4654 28.142C25.4689 28.142 25.2184 28.0376 24.9366 27.8846Z" fill="#181D27"/>
                    <path class="path-draw" d="M0.910507 28.9732C0.959213 28.9732 1.00444 28.9767 1.05318 28.9836L9.60109 30.09C10.0395 30.1457 10.3456 29.6655 10.1091 29.2898C9.98034 29.0915 9.85509 28.8897 9.72985 28.6879C9.39934 28.1522 9.84118 27.439 10.4535 27.439C10.4952 27.439 10.537 27.4425 10.5822 27.4494L21.7846 29.1332L23.1241 29.335L26.777 29.8847C27.191 29.9474 27.4694 30.2987 27.4346 30.7197C27.4207 30.9075 27.3441 31.085 27.2223 31.2172C27.0797 31.3738 26.8814 31.4607 26.6657 31.4607C26.624 31.4607 26.5822 31.4572 26.537 31.4503L13.1845 29.4429C12.7287 29.3733 12.4156 29.8882 12.6835 30.264C12.7705 30.3822 12.8575 30.504 12.9445 30.6223C13.1845 30.9493 13.1289 31.4956 12.8505 31.7773C12.7079 31.9235 12.527 32 12.3356 32C12.3147 32 12.2904 32 12.2695 31.9965H12.2661H12.2625L0.736556 30.5284H0.733078H0.729564C0.531294 30.4971 0.357343 30.3822 0.242501 30.2048C0.117256 30.01 0.0720645 29.7699 0.127694 29.5542C0.218218 29.2028 0.524371 28.9732 0.910507 28.9732Z" fill="#181D27"/>
                </g>
                <defs>
                    <clipPath id="clip0_2222_3708">
                        <rect width="32" height="32" fill="white" transform="matrix(-1 0 0 1 32 0)"/>
                    </clipPath>
                </defs>
            </svg>
            <span class="pxl-heading__line-left"></span>
            <span class="pxl-heading__words">
                <?php
                $items = [];
                foreach ($arr_str as $index => $value) {
                    $item_class = $index === 0 ? 'is-visible' : '';
                    $items[] = '<b class="' . esc_attr($item_class) . '">' . esc_html(trim($value)) . '</b>';
                }
                echo implode(' ', $items);
                ?>
            </span>
            <?php
        }
        return ob_get_clean();
    }

    pxl_register_shortcode('typewriter', 'brighthub_text_typewriter_shortcode');
}


/* Square Animate */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_square_animate_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'columns' => '',
        ), $atts));

        ob_start(); ?>
        <div class="pxl-square-animate">
            <div class="pxl-square-item"><span></span></div>
            <div class="pxl-square-item"><span></span></div>
            <div class="pxl-square-item"><span></span></div>
            <div class="pxl-square-item"><span></span></div>
            <div class="pxl-square-item"><span></span></div>
            <div class="pxl-square-item"><span></span></div>
        </div>
        <?php $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_square_animate', 'brighthub_square_animate_shortcode');
}

/* Button Shortcode  */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_btn_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'text' => '',
         'style' => '',
         'icon_class' => '',
         'text_color' => '',
         'bg_color' => '',
        ), $atts));

        ob_start();
        if(!empty($text)) : ?>
            <span class="btn <?php echo esc_attr($style); ?>" <?php if(!empty($text_color) || !empty($bg_color)) { ?>style="<?php if(!empty($bg_color)) { echo '--gradient-color-to:'.esc_attr($bg_color); } ?>; color: <?php echo esc_attr($text_color); ?>"<?php } ?> data-text-pr="<?php echo esc_attr($text); ?>">
                <?php if(!empty($icon_class)) : ?>
                    <span class="btn-icon"><i class="<?php echo esc_attr($icon_class); ?>"></i></span>
                <?php endif; ?>
                <span class="btn__text" data-text="<?php echo esc_html($text); ?>">
                    <?php 
                    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
                    foreach ($chars as $value) {
                        if($value == ' ') {
                            echo '<span class="spacer">&nbsp;</span>';
                        } else {
                            echo '<span>'.esc_html($value).'</span>';
                        }
                    } ?>
                </span>
            </span>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_button', 'brighthub_btn_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_btn_submit_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'text' => '',
         'style' => 'btn btn__icon-actve btn__icon-box btn__icon-right wpcf7-submit',
        ), $atts));

        ob_start();
        if(!empty($text)) : ?>
            <button class="<?php echo esc_attr($style); ?>" type="submit">
                <span class="btn__text"><?php echo esc_html($text); ?></span>
                <span class="btn-icon"><i class="caseicon caseicon-right-arrows"></i></span>
            </button>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_button_submit', 'brighthub_btn_submit_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_slider_arrow( $atts = array() ) {
        extract(shortcode_atts(array(
         'type' => 'next',
         'style' => 'style-1',
        ), $atts));

        ob_start(); ?>
         <div class="pxl-slider-rev-arrow">
            <?php if($type == 'next') { ?>
                <i class="caseicon-angle-arrow-right"></i>
            <?php } else { ?>
                <i class="caseicon-angle-arrow-left"></i>
            <?php } ?>
        </div>
        <?php $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('slider_arrow', 'brighthub_slider_arrow');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_text_gradient_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'text' => '',
         'form' => '',
         'to' => '',
        ), $atts));

        ob_start();
        if(!empty($text)) : ?>
            <span class="text-gradient" style="<?php if(!empty($form)) { echo '--gradient-color-from:'.$form; } if(!empty($to)) { echo '--gradient-color-to:'.$to; } ?>">
                <?php echo esc_attr($text); ?>
            </span>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('text_gradient', 'brighthub_text_gradient_shortcode');
}

// Shortcode Row/Column Grid
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_start_row_shortcode( $atts = array() ) {
        ob_start(); ?>
            <div class="pxl-post-container">
                <div class="row pxl-post-row">
        <?php $output = ob_get_clean();
        return $output;
    }
    pxl_register_shortcode('pxl_start_row', 'brighthub_start_row_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_end_row_shortcode( $atts = array() ) {
        ob_start(); ?>
            </div>
        </div>       
        <?php $output = ob_get_clean();
        return $output;
    }
    pxl_register_shortcode('pxl_end_row', 'brighthub_end_row_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_start_col_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'class' => 'col-12',
        ), $atts));
        ob_start(); ?>
        <div class="<?php echo esc_attr($class); ?>">     
        <?php $output = ob_get_clean();
        return $output;
    }
    pxl_register_shortcode('pxl_start_column', 'brighthub_start_col_shortcode');
}

if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_end_col_shortcode( $atts = array() ) {
        ob_start(); ?>
        </div>  
        <?php $output = ob_get_clean();
        return $output;
    }
    pxl_register_shortcode('pxl_end_column', 'brighthub_end_col_shortcode');
}

// End Shortcode Row/Column Grid

/* Gallery Shortcode  */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_gallery_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'link_video' => '',
         'images_id' => '',
         'col' => '2',
         'img_size' => '600x368',
         'masonry' => '',
        ), $atts));

        $pxl_g_id = uniqid();

        ob_start();
        ?>
        <div id="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-gallery gallery-<?php echo esc_attr($col); ?>-columns <?php if(!empty($masonry)) { echo 'masonry-'.esc_attr($masonry); } ?>">
        <?php
        $pxl_images = explode( ',', $images_id );
        foreach ($pxl_images as $key => $img_id) :
            $img = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $img_size,
                'class'      => '',
            ));
            $thumbnail = $img['thumbnail'];

            $img_url = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => 'full',
                'class'      => '',
            ));

            $thumbnail_url = $img_url['url'];
            ?>
            <div class="pxl--item">
                <div class="pxl--item-inner">
                    <a href="<?php echo esc_url($thumbnail_url); ?>" data-elementor-lightbox-slideshow="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>"><?php echo brighthub_html($thumbnail); ?></a>
                    <?php if($key == 0 && !empty($link_video)) : ?>
                        <a class="pxl-btn-video style2 pxl-popup" href="<?php echo esc_url($link_video); ?>"><i class="fa fa-play"></i></a>
                    <?php endif; ?>
                </div>
            </div>
            <?php
        endforeach;
        ?>
        </div>
        <?php
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_gallery', 'brighthub_gallery_shortcode');
}

/* Addd shortcode Video button */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_video_button_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'link' => '',
         'text' => '',
         'class' => 'style1',
        ), $atts));

        ob_start();
        ?>
        <a href="<?php echo esc_url($link); ?>" class="pxl-button-video1 btn-video pxl-popup <?php echo esc_attr($class); ?>">
            <span class="slider-video-icon">
                <i class="caseicon-play-button"></i>
            </span>
            <?php if(!empty($text)) : ?>
                <span class="slider-video-title"><?php echo esc_html($text); ?></span>
            <?php endif; ?>
        </a>
        <?php
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_video_button', 'brighthub_video_button_shortcode');
}

/* Get Category Shortcode  */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_post_category_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'items' => '6',
         'columns' => '2',
        ), $atts));

        ob_start();
        $categories = get_categories(); ?>
        <div class="pxl-wg-categories columns-<?php echo esc_attr($columns); ?>">
            <?php foreach($categories as $category) {
                $term_bg = get_term_meta( $category->term_id, 'bg_category', true ); ?>
                <div class="pxl-category">
                    <div class="pxl-category--inner">
                        <div class="pxl-category--img bg-image" <?php if(!empty($term_bg["url"])) : ?>style="background-image: url(<?php echo esc_url($term_bg["url"]); ?>);"<?php endif; ?>></div>
                        <a href="<?php echo esc_url(get_category_link($category->term_id)); ?>"></a>
                        <span><?php echo esc_html($category->name); ?></span>
                    </div>
                </div>
            <?php } ?>
        </div>
        <?php $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_post_category', 'brighthub_post_category_shortcode');
}

/* Slider 1  */
if(function_exists( 'pxl_register_shortcode' )) {
    function brighthub_slider_price_shortcode( $atts = array() ) {
        extract(shortcode_atts(array(
         'price' => '',
         'desc' => '',
        ), $atts));

        ob_start();
        if(!empty($price) || !empty($desc)) : ?>
            <div class="pxl-slider-price1">
                <div class="pxl-swiper-slider__item-inner">
                    <div class="pxl-item--price"><?php echo esc_html($price); ?></div>
                    <div class="pxl-item--desc"><?php echo esc_html($desc); ?></div>
                </div>
            </div>
        <?php  endif;
        $output = ob_get_clean();

        return $output;
    }
    pxl_register_shortcode('pxl_slider_price', 'brighthub_slider_price_shortcode');
}


/**
 * Custom Widget Archive - Count
 */
add_filter('get_archives_link', 'brighthub_wg_archive_count');
function brighthub_wg_archive_count($links) {
    $dir = '';
    $links = str_replace('</a>&nbsp;(', ' <span class="pxl-count '.$dir.'">', $links);
    $links = str_replace(')', '</span></a>', $links);
    return $links;
}

/**
 * Custom Widget Product Categories 
 */
add_filter('wp_list_categories', 'brighthub_wc_cat_count_span');
function brighthub_wc_cat_count_span($links) {
    $dir = '';
    $links = str_replace('</a> <span class="count">(', ' <span class="pxl-count '.$dir.'">', $links);
    $links = str_replace(')</span>', '</span></a>', $links);
    return $links;
}

/**
 * Get mega menu builder ID - Optimized with caching
 */
function brighthub_get_mega_menu_builder_id(){
    $cache_key = 'brighthub_mega_menu_ids';
    $cached = wp_cache_get($cache_key, 'brighthub');
    
    if ($cached !== false) {
        return $cached;
    }
    
    $mn_id = [];
    $menus = get_terms( 'nav_menu', array( 'hide_empty' => false ) );
    if ( is_array( $menus ) && ! empty( $menus ) ) {
        foreach ( $menus as $menu ) {
            if ( is_object( $menu )){
                $menu_obj = get_term( $menu->term_id, 'nav_menu' );
                $menu = wp_get_nav_menu_object( $menu_obj ) ;
                $menu_items = wp_get_nav_menu_items( $menu->term_id, array( 'update_post_term_cache' => false ) );
                foreach ($menu_items as $menu_item) {
                    if( !empty($menu_item->pxl_megaprofile)){
                        $mn_id[] = (int)$menu_item->pxl_megaprofile;
                    }
                }  
            }
        }
    }
    
    // Cache for 1 hour
    wp_cache_set($cache_key, $mn_id, 'brighthub', 3600);
    
    return $mn_id;
}

/**
 * Get page popup builder ID - Optimized with caching
 */
function brighthub_get_page_popup_builder_id(){
    $cache_key = 'brighthub_page_popup_ids';
    $cached = wp_cache_get($cache_key, 'brighthub');
    
    if ($cached !== false) {
        return $cached;
    }
    
    $pp_id = [];
    $page_popup = get_terms( 'nav_menu', array( 'hide_empty' => false ) );
    if ( is_array( $page_popup ) && ! empty( $page_popup ) ) {
        foreach ( $page_popup as $page ) {
            if ( is_object( $page )){
                $page_obj = get_term( $page->term_id, 'nav_menu' );
                $page = wp_get_nav_menu_object( $page_obj ) ;
                $page_items = wp_get_nav_menu_items( $page->term_id, array( 'update_post_term_cache' => false ) );
                foreach ($page_items as $page_item) {
                    if( !empty($page_item->pxl_page_popup)){
                        $pp_id[] = (int)$page_item->pxl_page_popup;
                    }
                }  
            }
        }
    }
    
    // Cache for 1 hour
    wp_cache_set($cache_key, $pp_id, 'brighthub', 3600);
    
    return $pp_id;
}

/* Mouse Move Animation */
function brighthub_mouse_move_animation() { 
    $mouse_move_animation = brighthub()->get_theme_opt('mouse_move_animation', 'off'); 
    if($mouse_move_animation == 'on') {
        wp_enqueue_script( 'brighthub-cursor', get_template_directory_uri() . '/assets/js/libs/cursor.js', array( 'jquery' ), '1.0.0', true ); ?>  
        <div class="pxl-cursor pxl-js-cursor">
            <div class="pxl-cursor-wrapper">
                <div class="pxl-cursor--follower pxl-js-follower"></div>
                <div class="pxl-cursor--label pxl-js-label"></div>
                <div class="pxl-cursor--drag pxl-js-drag"></div>
                <div class="pxl-cursor--icon pxl-js-icon"></div>
            </div>
        </div>
    <?php }
}

/**
 * Start - Subscribe Popup
 */
function brighthub_subscribe_popup() {
    $subscribe = brighthub()->get_theme_opt('subscribe', 'hide');
    $subscribe_layout = brighthub()->get_theme_opt('subscribe_layout');
    $popup_effect = brighthub()->get_theme_opt('popup_effect', 'fade');
    $args = [
        'subscribe_layout' => $subscribe_layout
    ];
    wp_enqueue_script('pxl-cookie'); ?>
    <?php if($subscribe == 'show' && isset($args['subscribe_layout']) && $args['subscribe_layout'] > 0) : ?>
        <div class="pxl-popup pxl-subscribe-popup pxl-effect-<?php echo esc_attr($popup_effect); ?>">
            <div class="pxl-popup--content">
                <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $args['subscribe_layout']); ?>
            </div>
        </div>
    <?php endif; ?>
<?php }   
/**
 * End - Subscribe Popup
 */


/**
 * Start - User custom fields.
 */
add_action( 'show_user_profile', 'brighthub_user_fields' );
add_action( 'edit_user_profile', 'brighthub_user_fields' );
function brighthub_user_fields($user){
    $user_name = get_user_meta($user->ID, 'user_name', true);
    $user_position = get_user_meta($user->ID, 'user_position', true);
    $user_hobbie = get_user_meta($user->ID, 'user_hobbie', true);
    $user_hobbie_icon = get_user_meta($user->ID, 'user_hobbie_icon', true);
    $user_location = get_user_meta($user->ID, 'user_location', true);
    $user_facebook = get_user_meta($user->ID, 'user_facebook', true);
    $user_x = get_user_meta($user->ID, 'user_x', true);
    $user_instagram = get_user_meta($user->ID, 'user_instagram', true);
    $user_linkedin = get_user_meta($user->ID, 'user_linkedin', true);
    $user_youtube = get_user_meta($user->ID, 'user_youtube', true);
    $user_vimeo = get_user_meta($user->ID, 'user_vimeo', true);
    $user_pinterest = get_user_meta($user->ID, 'user_pinterest', true);
    $user_skype = get_user_meta($user->ID, 'user_skype', true);
    $user_google = get_user_meta($user->ID, 'user_google', true);
    $user_tumblr = get_user_meta($user->ID, 'user_tumblr', true);
    $user_rss = get_user_meta($user->ID, 'user_rss', true);
    ?>
    <h3><?php esc_html_e('Theme Custom', 'brighthub'); ?></h3>
    <table class="form-table">
        <tr>
            <th><label for="user_name"><?php esc_html_e('Author Name', 'brighthub'); ?></label></th>
            <td>
                <input id="user_name" name="user_name" type="text" value="<?php echo esc_attr(isset($user_name) ? $user_name : ''); ?>" />
            </td>
        </tr>

        <tr>
            <th><label for="user_position"><?php esc_html_e('Author Position', 'brighthub'); ?></label></th>
            <td>
                <input id="user_position" name="user_position" type="text" value="<?php echo esc_attr(isset($user_position) ? $user_position : ''); ?>" />
            </td>
        </tr>
        
        <tr>
            <th><label for="user_hobbie"><?php esc_html_e('Author Hobbie', 'brighthub'); ?></label></th>
            <td>
                <input type="text" id="user_hobbie" name="user_hobbie" class="regular-text" rows="5" value="<?php echo wp_kses_post(isset($user_hobbie) ? $user_hobbie : ''); ?>" />
            </td>
        </tr>

        <tr>
            <th><label for="user_hobbie_icon"><?php esc_html_e('Hobbie Icon', 'brighthub'); ?></label></th>
            <td>
                <div class="hobbie-icon-container">
                    <?php if (!empty($user_hobbie_icon)) : ?>
                        <img src="<?php echo esc_url($user_hobbie_icon); ?>" alt="Hobbie Icon" style="max-width: 100px; display: block; margin-bottom: 10px;">
                    <?php endif; ?>
                </div>
                <input type="text" name="user_hobbie_icon" id="user_hobbie_icon" value="<?php echo esc_attr($user_hobbie_icon); ?>" class="regular-text" readonly />
                <input type='button' class="button-primary" value="<?php esc_attr_e('Select Image', 'brighthub'); ?>" id="upload_hobbie_icon_button" />
                <input type='button' class="button" value="<?php esc_attr_e('Remove Image', 'brighthub'); ?>" id="remove_hobbie_icon_button" <?php echo empty($user_hobbie_icon) ? 'style="display:none;"' : ''; ?> />
                <p class="description"><?php esc_html_e('Upload an icon or image for your hobby.', 'brighthub'); ?></p>
                
                <script type="text/javascript">
                jQuery(document).ready(function($) {
                    $('#upload_hobbie_icon_button').click(function(e) {
                        e.preventDefault();
                        
                        var custom_uploader = wp.media({
                            title: '<?php esc_html_e('Choose Hobbie Icon', 'brighthub'); ?>',
                            button: {
                                text: '<?php esc_html_e('Use this image', 'brighthub'); ?>'
                            },
                            multiple: false
                        })
                        .on('select', function() {
                            var attachment = custom_uploader.state().get('selection').first().toJSON();
                            $('#user_hobbie_icon').val(attachment.url);
                            $('.hobbie-icon-container').html('<img src="' + attachment.url + '" alt="Hobbie Icon" style="max-width: 100px; display: block; margin-bottom: 10px;">');
                            $('#remove_hobbie_icon_button').show();
                        })
                        .open();
                    });
                    
                    $('#remove_hobbie_icon_button').click(function(e) {
                        e.preventDefault();
                        $('#user_hobbie_icon').val('');
                        $('.hobbie-icon-container').html('');
                        $(this).hide();
                    });
                });
                </script>
            </td>
        </tr>

        <tr>
            <th><label for="user_location"><?php esc_html_e('Author Location', 'brighthub'); ?></label></th>
            <td>
                <input id="user_location" name="user_location" type="text" value="<?php echo esc_attr(isset($user_location) ? $user_location : ''); ?>" />
            </td>
        </tr>

        <tr>
            <th><label for="user_facebook"><?php esc_html_e('Facebook', 'brighthub'); ?></label></th>
            <td>
                <input id="user_facebook" name="user_facebook" type="text" value="<?php echo esc_attr(isset($user_facebook) ? $user_facebook : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_x"><?php esc_html_e('X', 'brighthub'); ?></label></th>
            <td>
                <input id="user_x" name="user_x" type="text" value="<?php echo esc_attr(isset($user_x) ? $user_x : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_instagram"><?php esc_html_e('Instagram', 'brighthub'); ?></label></th>
            <td>
                <input id="user_instagram" name="user_instagram" type="text" value="<?php echo esc_attr(isset($user_instagram) ? $user_instagram : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_linkedin"><?php esc_html_e('Linkedin', 'brighthub'); ?></label></th>
            <td>
                <input id="user_linkedin" name="user_linkedin" type="text" value="<?php echo esc_attr(isset($user_linkedin) ? $user_linkedin : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_youtube"><?php esc_html_e('Youtube', 'brighthub'); ?></label></th>
            <td>
                <input id="user_youtube" name="user_youtube" type="text" value="<?php echo esc_attr(isset($user_youtube) ? $user_youtube : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_pinterest"><?php esc_html_e('Pinterest', 'brighthub'); ?></label></th>
            <td>
                <input id="user_pinterest" name="user_pinterest" type="text" value="<?php echo esc_attr(isset($user_pinterest) ? $user_pinterest : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_vimeo"><?php esc_html_e('Vimeo', 'brighthub'); ?></label></th>
            <td>
                <input id="user_vimeo" name="user_vimeo" type="text" value="<?php echo esc_attr(isset($user_vimeo) ? $user_vimeo : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_skype"><?php esc_html_e('Skype', 'brighthub'); ?></label></th>
            <td>
                <input id="user_skype" name="user_skype" type="text" value="<?php echo esc_attr(isset($user_skype) ? $user_skype : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_google"><?php esc_html_e('Google', 'brighthub'); ?></label></th>
            <td>
                <input id="user_google" name="user_google" type="text" value="<?php echo esc_attr(isset($user_google) ? $user_google : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_tumblr"><?php esc_html_e('Tumblr', 'brighthub'); ?></label></th>
            <td>
                <input id="user_tumblr" name="user_tumblr" type="text" value="<?php echo esc_attr(isset($user_tumblr) ? $user_tumblr : ''); ?>" />
            </td>
        </tr>
        <tr>
            <th><label for="user_rss"><?php esc_html_e('Rss', 'brighthub'); ?></label></th>
            <td>
                <input id="user_rss" name="user_rss" type="text" value="<?php echo esc_attr(isset($user_rss) ? $user_rss : ''); ?>" />
            </td>
        </tr>
    </table>
    <?php
}

function brighthub_admin_enqueue_media_scripts() {
    global $pagenow;
    
    if ('profile.php' === $pagenow || 'user-edit.php' === $pagenow) {
        wp_enqueue_media();
    }
}
add_action('admin_enqueue_scripts', 'brighthub_admin_enqueue_media_scripts');

add_action( 'personal_options_update', 'brighthub_save_user_custom_fields' );
add_action( 'edit_user_profile_update', 'brighthub_save_user_custom_fields' );
function brighthub_save_user_custom_fields( $user_id )
{
    if ( !current_user_can( 'edit_user', $user_id ) )
        return false;

    if(isset($_POST['user_name']))
        update_user_meta( $user_id, 'user_name', sanitize_text_field($_POST['user_name']) );

    if(isset($_POST['user_position']))
        update_user_meta( $user_id, 'user_position', sanitize_text_field($_POST['user_position']) );
        
    if(isset($_POST['user_hobbie']))
        update_user_meta( $user_id, 'user_hobbie', wp_kses_post($_POST['user_hobbie']) );
        
    if(isset($_POST['user_hobbie_icon']))
        update_user_meta( $user_id, 'user_hobbie_icon', esc_url_raw($_POST['user_hobbie_icon']) );

    if(isset($_POST['user_location']))
        update_user_meta( $user_id, 'user_location', sanitize_text_field($_POST['user_location']) );

    // Social media links
    if(isset($_POST['user_facebook']))
        update_user_meta( $user_id, 'user_facebook', esc_url_raw($_POST['user_facebook']) );
        
    if(isset($_POST['user_x']))
        update_user_meta( $user_id, 'user_x', esc_url_raw($_POST['user_x']) );
        
    if(isset($_POST['user_instagram']))
        update_user_meta( $user_id, 'user_instagram', esc_url_raw($_POST['user_instagram']) );
        
    if(isset($_POST['user_linkedin']))
        update_user_meta( $user_id, 'user_linkedin', esc_url_raw($_POST['user_linkedin']) );
        
    if(isset($_POST['user_youtube']))
        update_user_meta( $user_id, 'user_youtube', esc_url_raw($_POST['user_youtube']) );
        
    if(isset($_POST['user_vimeo']))
        update_user_meta( $user_id, 'user_vimeo', esc_url_raw($_POST['user_vimeo']) );
        
    if(isset($_POST['user_pinterest']))
        update_user_meta( $user_id, 'user_pinterest', esc_url_raw($_POST['user_pinterest']) );
        
    if(isset($_POST['user_skype']))
        update_user_meta( $user_id, 'user_skype', esc_url_raw($_POST['user_skype']) );
        
    if(isset($_POST['user_google']))
        update_user_meta( $user_id, 'user_google', esc_url_raw($_POST['user_google']) );
        
    if(isset($_POST['user_tumblr']))
        update_user_meta( $user_id, 'user_tumblr', esc_url_raw($_POST['user_tumblr']) );
        
    if(isset($_POST['user_rss']))
        update_user_meta( $user_id, 'user_rss', esc_url_raw($_POST['user_rss']) );
}

function brighthub_get_user_name() {
    $user_name = get_user_meta(get_the_author_meta( 'ID' ), 'user_name', true);
    if(!empty($user_name)) { ?>
        <div class="pxl-user__name">
            <?php echo esc_html($user_name); ?>
        </div>
    <?php } else { ?>
        <div class="pxl-user__name">
            <?php the_author_posts_link(); ?>
        </div>
    <?php }
}

function brighthub_get_user_position() {
    $user_position = get_user_meta(get_the_author_meta( 'ID' ), 'user_position', true);
    if(!empty($user_position)) { ?>
        <div class="pxl-user__pos">
            <?php echo esc_html($user_position); ?>
        </div>
    <?php }
}

function brighthub_get_user_hobbie() {
    $user_hobbie = get_user_meta(get_the_author_meta( 'ID' ), 'user_hobbie', true);
    $hob = $widget->parse_text_editor( $user_hobbie ); 
    if(!empty($user_hobbie)) { ?>
        <div class="pxl-user__hob">
            <?php echo esc_html($user_hobbie); ?>
        </div>
    <?php }
}

function brighthub_get_user_location() {
    $user_location = get_user_meta(get_the_author_meta( 'ID' ), 'user_location', true);
    if(!empty($user_location)) { ?>
        <div class="pxl-user__loc">
            <?php echo esc_html($user_location); ?>
        </div>
    <?php }
}
/**
 * End - User custom fields.
 */

/* Author Social */
function brighthub_get_user_social() {
    $user_facebook = get_user_meta(get_the_author_meta( 'ID' ), 'user_facebook', true);
    $user_x = get_user_meta(get_the_author_meta( 'ID' ), 'user_x', true);
    $user_linkedin = get_user_meta(get_the_author_meta( 'ID' ), 'user_linkedin', true);
    $user_instagram = get_user_meta(get_the_author_meta( 'ID' ), 'user_instagram', true);
    $user_youtube = get_user_meta(get_the_author_meta( 'ID' ), 'user_youtube', true); ?>
    <div class="pxl-post--author-social">
        <?php if(!empty($user_facebook)) { ?>
            <a href="<?php echo esc_url($user_facebook); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M7.54882 20V10.8777H10.6096L11.0688 7.32156H7.54882V5.05147C7.54882 4.0222 7.83347 3.32076 9.31111 3.32076L11.1926 3.31999V0.13923C10.8673 0.0969453 9.75033 0 8.45033 0C5.73573 0 3.87727 1.65697 3.87727 4.69927V7.32156H0.807251V10.8777H3.87727V20H7.54882Z" fill="#181D27"></path></svg>
            </a>
        <?php } ?>
        <?php if(!empty($user_x)) { ?>
            <a href="<?php echo esc_url($user_x); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><g clip-path="url(#clip0_2040_4041)"><path d="M9.48942 6.77491L15.3177 0H13.9366L8.87589 5.88256L4.83392 0H0.171997L6.28424 8.89547L0.171997 16H1.55319L6.89742 9.78782L11.166 16H15.828L9.48908 6.77491H9.48942ZM7.59768 8.97384L6.97839 8.08805L2.05086 1.03974H4.17229L8.14887 6.72795L8.76816 7.61374L13.9372 15.0075H11.8158L7.59768 8.97418V8.97384Z" fill="#181D27"></path></g><defs><clipPath id="clip0_2040_4041"><rect width="16" height="16" fill="white"></rect></clipPath></defs></svg>
            </a>
        <?php } ?>
        <?php if(!empty($user_linkedin)) { ?>
            <a href="<?php echo esc_url($user_linkedin); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><g clip-path="url(#clip0_2040_4044)"><path d="M17.2727 0H2.72727C2.00396 0 1.31026 0.287337 0.7988 0.7988C0.287337 1.31026 0 2.00396 0 2.72727L0 17.2727C0 17.996 0.287337 18.6897 0.7988 19.2012C1.31026 19.7127 2.00396 20 2.72727 20H17.2727C17.996 20 18.6897 19.7127 19.2012 19.2012C19.7127 18.6897 20 17.996 20 17.2727V2.72727C20 2.00396 19.7127 1.31026 19.2012 0.7988C18.6897 0.287337 17.996 0 17.2727 0ZM6.81818 15.8273C6.81833 15.8827 6.80754 15.9377 6.78642 15.989C6.7653 16.0402 6.73427 16.0868 6.6951 16.1261C6.65594 16.1654 6.60941 16.1965 6.55819 16.2178C6.50697 16.2391 6.45205 16.25 6.39659 16.25H4.6C4.54444 16.2502 4.48941 16.2393 4.43805 16.2181C4.3867 16.1969 4.34004 16.1658 4.30075 16.1265C4.26147 16.0872 4.23034 16.0406 4.20915 15.9892C4.18795 15.9379 4.17712 15.8828 4.17727 15.8273V8.29545C4.17727 8.18334 4.22181 8.07582 4.30109 7.99654C4.38036 7.91726 4.48789 7.87273 4.6 7.87273H6.39659C6.50851 7.87303 6.61574 7.9177 6.69477 7.99694C6.7738 8.07619 6.81818 8.18354 6.81818 8.29545V15.8273ZM5.49773 7.15909C5.1606 7.15909 4.83104 7.05912 4.55073 6.87182C4.27042 6.68453 4.05195 6.41831 3.92293 6.10685C3.79392 5.79538 3.76016 5.45265 3.82593 5.12201C3.8917 4.79136 4.05405 4.48763 4.29243 4.24925C4.53082 4.01086 4.83454 3.84852 5.16519 3.78275C5.49584 3.71698 5.83856 3.75074 6.15003 3.87975C6.46149 4.00876 6.72771 4.22724 6.91501 4.50755C7.1023 4.78786 7.20227 5.11742 7.20227 5.45455C7.20227 5.90662 7.02269 6.34018 6.70302 6.65984C6.38336 6.97951 5.9498 7.15909 5.49773 7.15909ZM16.2091 15.8568C16.2092 15.9079 16.1993 15.9585 16.1798 16.0057C16.1603 16.0529 16.1317 16.0958 16.0956 16.132C16.0595 16.1681 16.0166 16.1967 15.9694 16.2162C15.9221 16.2357 15.8715 16.2456 15.8205 16.2455H13.8886C13.8376 16.2456 13.787 16.2357 13.7397 16.2162C13.6925 16.1967 13.6496 16.1681 13.6135 16.132C13.5774 16.0958 13.5488 16.0529 13.5293 16.0057C13.5098 15.9585 13.4999 15.9079 13.5 15.8568V12.3284C13.5 11.8011 13.6545 10.0193 12.1216 10.0193C10.9341 10.0193 10.692 11.2386 10.6443 11.7864V15.8614C10.6443 15.9635 10.6042 16.0615 10.5325 16.1342C10.4608 16.2069 10.3634 16.2485 10.2614 16.25H8.39545C8.34447 16.25 8.29399 16.2399 8.2469 16.2204C8.19981 16.2008 8.15705 16.1722 8.12105 16.1361C8.08505 16.1 8.05653 16.0571 8.03712 16.01C8.01772 15.9629 8.00781 15.9123 8.00795 15.8614V8.2625C8.00781 8.21152 8.01772 8.16101 8.03712 8.11386C8.05653 8.06672 8.08505 8.02386 8.12105 7.98776C8.15705 7.95166 8.19981 7.92301 8.2469 7.90347C8.29399 7.88392 8.34447 7.87386 8.39545 7.87386H10.2614C10.3644 7.87386 10.4633 7.91481 10.5362 7.98769C10.6091 8.06058 10.65 8.15943 10.65 8.2625V8.91932C11.0909 8.25682 11.7443 7.74773 13.1386 7.74773C16.2273 7.74773 16.2068 10.6318 16.2068 12.2159L16.2091 15.8568Z" fill="#181D27"></path></g><defs><clipPath id="clip0_2040_4044"><rect width="20" height="20" fill="white"></rect></clipPath></defs></svg>
            </a>
        <?php } ?>
        <?php if(!empty($user_instagram)) { ?>
            <a href="<?php echo esc_url($user_instagram); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><g clip-path="url(#clip0_2040_4033)"><path d="M19.9805 5.88005C19.9336 4.81738 19.7618 4.0868 19.5156 3.45374C19.2616 2.78176 18.8709 2.18014 18.359 1.68002C17.8589 1.1721 17.2533 0.777435 16.5891 0.527447C15.9524 0.281274 15.2257 0.109427 14.163 0.0625732C13.0924 0.0117516 12.7525 0 10.0371 0C7.32174 0 6.98186 0.0117516 5.91521 0.0586052C4.85253 0.105459 4.12195 0.277459 3.48905 0.523479C2.81692 0.777435 2.2153 1.16814 1.71517 1.68002C1.20726 2.18014 0.812743 2.78573 0.562603 3.44992C0.316431 4.0868 0.144583 4.81341 0.0977295 5.87609C0.0469078 6.9467 0.0351562 7.28658 0.0351562 10.002C0.0351562 12.7173 0.0469078 13.0572 0.0937615 14.1239C0.140615 15.1865 0.312615 15.9171 0.558788 16.5502C0.812743 17.2221 1.20726 17.8238 1.71517 18.3239C2.2153 18.8318 2.82089 19.2265 3.48508 19.4765C4.12195 19.7226 4.84857 19.8945 5.9114 19.9413C6.97789 19.9883 7.31792 19.9999 10.0333 19.9999C12.7487 19.9999 13.0885 19.9883 14.1552 19.9413C15.2179 19.8945 15.9485 19.7226 16.5814 19.4765C17.9255 18.9568 18.9881 17.8941 19.5078 16.5502C19.7538 15.9133 19.9258 15.1865 19.9727 14.1239C20.0195 13.0572 20.0313 12.7173 20.0313 10.002C20.0313 7.28658 20.0273 6.9467 19.9805 5.88005ZM18.1794 14.0457C18.1364 15.0225 17.9723 15.5499 17.8356 15.9015C17.4995 16.7728 16.808 17.4643 15.9367 17.8004C15.5851 17.9372 15.0538 18.1012 14.0809 18.1441C13.026 18.1911 12.7096 18.2027 10.0411 18.2027C7.37256 18.2027 7.05221 18.1911 6.00113 18.1441C5.02438 18.1012 4.49693 17.9372 4.1453 17.8004C3.71172 17.6402 3.31705 17.3862 2.9967 17.0541C2.66461 16.7298 2.41065 16.3391 2.2504 15.9055C2.11366 15.5539 1.94959 15.0225 1.90671 14.0497C1.8597 12.9948 1.8481 12.6783 1.8481 10.0097C1.8481 7.34122 1.8597 7.02087 1.90671 5.96995C1.94959 4.99319 2.11366 4.46575 2.2504 4.11412C2.41065 3.68038 2.66461 3.28586 3.00067 2.96536C3.32483 2.63327 3.71553 2.37931 4.14927 2.21921C4.5009 2.08247 5.03232 1.9184 6.0051 1.87537C7.06 1.82851 7.37653 1.81676 10.0449 1.81676C12.7174 1.81676 13.0338 1.82851 14.0848 1.87537C15.0616 1.9184 15.589 2.08247 15.9407 2.21921C16.3743 2.37931 16.7689 2.63327 17.0893 2.96536C17.4214 3.28967 17.6753 3.68038 17.8356 4.11412C17.9723 4.46575 18.1364 4.99701 18.1794 5.96995C18.2263 7.02484 18.238 7.34122 18.238 10.0097C18.238 12.6783 18.2263 12.9908 18.1794 14.0457Z" fill="#181D27"></path><path d="M10.0371 4.86426C7.20074 4.86426 4.89941 7.16543 4.89941 10.002C4.89941 12.8385 7.20074 15.1397 10.0371 15.1397C12.8737 15.1397 15.1749 12.8385 15.1749 10.002C15.1749 7.16543 12.8737 4.86426 10.0371 4.86426ZM10.0371 13.3347C8.19702 13.3347 6.70442 11.8422 6.70442 10.002C6.70442 8.16172 8.19702 6.66927 10.0371 6.66927C11.8774 6.66927 13.3698 8.16172 13.3698 10.002C13.3698 11.8422 11.8774 13.3347 10.0371 13.3347Z" fill="#181D27"></path><path d="M16.5775 4.66036C16.5775 5.32272 16.0404 5.85978 15.3779 5.85978C14.7155 5.85978 14.1785 5.32272 14.1785 4.66036C14.1785 3.99785 14.7155 3.46094 15.3779 3.46094C16.0404 3.46094 16.5775 3.99785 16.5775 4.66036Z" fill="#181D27"></path></g><defs><clipPath id="clip0_2040_4033"><rect width="20" height="20" fill="white"></rect></clipPath></defs></svg>
            </a>
        <?php } ?>
        <?php if(!empty($user_youtube)) { ?>
            <a href="<?php echo esc_url($user_youtube); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M18.9789 5.31398C18.7628 4.51072 18.1295 3.87752 17.3264 3.66122C15.8591 3.25977 9.99001 3.25977 9.99001 3.25977C9.99001 3.25977 4.12113 3.25977 2.65388 3.646C1.86619 3.86207 1.21742 4.51083 1.00136 5.31398C0.615234 6.78111 0.615234 9.82375 0.615234 9.82375C0.615234 9.82375 0.615234 12.8817 1.00136 14.3335C1.21765 15.1367 1.85074 15.7699 2.654 15.9862C4.13658 16.3877 9.99023 16.3877 9.99023 16.3877C9.99023 16.3877 15.8591 16.3877 17.3264 16.0015C18.1296 15.7853 18.7628 15.1521 18.9791 14.349C19.3651 12.8817 19.3651 9.8392 19.3651 9.8392C19.3651 9.8392 19.3806 6.78111 18.9789 5.31398ZM8.12141 12.6347V7.01286L13.0019 9.82375L8.12141 12.6347Z" fill="#181D27"></path></svg>
            </a>
        <?php } ?>
    </div>
<?php }

// Darken Color
function pxl_darker_color($rgb, $darker=2) {

    $hash = (strpos($rgb, '#') !== false) ? '#' : '';
    $rgb = (strlen($rgb) == 7) ? str_replace('#', '', $rgb) : ((strlen($rgb) == 6) ? $rgb : false);
    if(strlen($rgb) != 6) return $hash.'000000';
    $darker = ($darker > 1) ? $darker : 1;

    list($R16,$G16,$B16) = str_split($rgb,2);

    $R = sprintf("%02X", floor(hexdec($R16)/$darker));
    $G = sprintf("%02X", floor(hexdec($G16)/$darker));
    $B = sprintf("%02X", floor(hexdec($B16)/$darker));

    return $hash.$R.$G.$B;
}

function my_ajax_load_more_posts() {
    $paged     = isset($_POST['page']) ? intval($_POST['page']) : 1;
    $post_type = isset($_POST['post_type']) ? sanitize_text_field($_POST['post_type']) : 'post';

    $allowed_post_types = ['post', 'template', 'career'];
    if (!in_array($post_type, $allowed_post_types)) {
        wp_send_json_error('Invalid post type');
        wp_die();
    }

    $cache_key = 'brighthub_loadmore_' . $post_type . '_' . $paged;
    $cached = wp_cache_get($cache_key, 'brighthub');
    
    if ($cached !== false) {
        wp_send_json_success($cached);
        wp_die();
    }

    $args = array(
        'post_type'      => $post_type,
        'posts_per_page' => get_option('posts_per_page'),
        'paged'          => $paged,
    );

    $query = new WP_Query($args);

    if ($query->have_posts()) :
        ob_start();
        while ($query->have_posts()) : $query->the_post();

            get_template_part('template-parts/content/archive/standard');

        endwhile;
        wp_reset_postdata();
        $output = ob_get_clean();
        
        // Cache for 5 minutes
        wp_cache_set($cache_key, $output, 'brighthub', 300);
        
        wp_send_json_success($output);
    else :
        wp_send_json_error('No more posts');
    endif;

    wp_die();
}

add_action('wp_ajax_load_more_posts', 'my_ajax_load_more_posts');
add_action('wp_ajax_nopriv_load_more_posts', 'my_ajax_load_more_posts');


function my_check_more_posts(){
    $paged = $_POST['page'] ?? 1;

    $query = new WP_Query([
        'post_type' => 'post',
        'paged'     => $paged,
        'posts_per_page' => get_option('posts_per_page')
    ]);

    if($query->have_posts()) {
        wp_send_json_success();
    } else {
        wp_send_json_error();
    }
}

add_action('wp_ajax_check_more_posts', 'my_check_more_posts');
add_action('wp_ajax_nopriv_check_more_posts', 'my_check_more_posts');

// Add image field to category edit form
function add_category_image_field_new() {
    ?>
    <div class="form-field term-group">
        <label for="category_image"><?php _e('Category Image', 'brighthub'); ?></label>
        <input type="text" name="category_image" id="category_image" value="" />
        <input type="button" class="button" value="Choose Image" id="category_image_button" />
        <p class="description"><?php _e('Upload or select an image for this category.', 'brighthub'); ?></p>
    </div>
    <?php
}
add_action('category_add_form_fields', 'add_category_image_field_new');

function add_category_image_field_edit($term) {
    $image = get_term_meta($term->term_id, 'category_image', true);
    ?>
    <tr class="form-field">
        <th scope="row" valign="top">
            <label for="category_image"><?php _e('Category Image', 'brighthub'); ?></label>
        </th>
        <td>
            <input type="text" name="category_image" id="category_image" value="<?php echo esc_attr($image); ?>" />
            <input type="button" class="button" value="Choose Image" id="category_image_button" />
            <?php if (!empty($image)) : ?>
                <div class="category-image-preview">
                    <img src="<?php echo esc_url($image); ?>" style="max-width: 200px; height: auto; margin-top: 10px;" />
                </div>
            <?php endif; ?>
            <p class="description"><?php _e('Upload or select an image for this category.', 'brighthub'); ?></p>
        </td>
    </tr>
    <?php
}
add_action('category_edit_form_fields', 'add_category_image_field_edit');

function save_category_image_field($term_id) {
    if (isset($_POST['category_image'])) {
        update_term_meta($term_id, 'category_image', sanitize_text_field($_POST['category_image']));
    }
}
add_action('edited_category', 'save_category_image_field');
add_action('create_category', 'save_category_image_field');

function load_category_image_script() {
    ?>
    <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('.wrap').on('click', '#category_image_button', function(e) {
                e.preventDefault();
                
                var button = $(this);
                var imageInput = button.siblings('#category_image');
                
                var image_frame;
                if (image_frame) {
                    image_frame.open();
                    return;
                }
                
                image_frame = wp.media.frames.image_frame = wp.media({
                    title: 'Select an Image',
                    button: { text: 'Use this image' },
                    multiple: false
                });
                
                image_frame.on('select', function() {
                    var attachment = image_frame.state().get('selection').first().toJSON();
                    imageInput.val(attachment.url);
                    
                    var previewContainer = button.siblings('.category-image-preview');
                    if (previewContainer.length > 0) {
                        previewContainer.html('<img src="' + attachment.url + '" style="max-width: 200px; height: auto; margin-top: 10px;" />');
                    } else {
                        button.after('<div class="category-image-preview"><img src="' + attachment.url + '" style="max-width: 200px; height: auto; margin-top: 10px;" /></div>');
                    }
                });
                
                image_frame.open();
            });
        });
    </script>
    <?php
}
add_action('admin_footer', 'load_category_image_script');

function add_category_image_column($columns) {
    $new_columns = array();
    foreach ($columns as $key => $value) {
        $new_columns[$key] = $value;
        if ($key === 'name') {
            $new_columns['category_image'] = __('Image', 'brighthub');
        }
    }
    return $new_columns;
}
add_filter('manage_edit-category_columns', 'add_category_image_column');

function fill_category_image_column($content, $column_name, $term_id) {
    if ($column_name === 'category_image') {
        $image = get_term_meta($term_id, 'category_image', true);
        if (!empty($image)) {
            $content = '<img src="' . esc_url($image) . '" style="max-width: 50px; height: auto;" />';
        }
    }
    return $content;
}
add_filter('manage_category_custom_column', 'fill_category_image_column', 10, 3);

function add_category_image_thumbnail($term_id) {
    if (isset($_POST['category_image']) && !empty($_POST['category_image'])) {
        $image_url = sanitize_text_field($_POST['category_image']);
        update_term_meta($term_id, 'category_image_thumbnail', $image_url);
    }
}
add_action('edited_category', 'add_category_image_thumbnail');
add_action('create_category', 'add_category_image_thumbnail');

function get_category_image($cat_id = null) {
    if (!$cat_id && is_category()) {
        $cat_id = get_queried_object_id();
    }
    
    if ($cat_id) {
        $image = get_term_meta($cat_id, 'category_image', true);
        if (!empty($image)) {
            return $image;
        }
    }
    
    return ''; 
}

function dp_catimg($cat_id = null) {
    $image = get_category_image($cat_id);
    if (!empty($image)) {
        echo '<img src="' . esc_url($image) . '" alt="' . esc_attr(get_cat_name($cat_id)) . '" loading="lazy" />';
    }
}

// Check Sidebar active
function sidebar_active($type = '') {
    $param_key = 'sidebar-' . $type;

    if (isset($_GET[$param_key])) {
        $pos = strtolower(trim($_GET[$param_key]));
    } else {
        $pos = strtolower(trim(brighthub()->get_opt($type . '_sidebar_pos', '')));
    }

    if (in_array($pos, ['none', '0', ''], true)) {
        return false;
    }

    return true;
}

/**
 * Get short time difference
 */
function brighthub_get_short_time_diff($from, $to = '') {
    try {
        if (!is_numeric($from)) {
            return esc_html__('just now', 'brighthub');
        }
        
        if (empty($to)) {
            $to = time();
        }
        
        if (!is_numeric($to)) {
            $to = time();
        }
        
        $diff = (int) abs($to - $from);
        $mins = floor($diff / 60) % 60;
        $hours = floor($diff / 3600) % 24;
        $days = floor($diff / 86400) % 30;
        $months = floor($diff / 2592000) % 12;
        $years = floor($diff / 31536000);
        
        if ($years > 0) {
            return $years . ' year ' . esc_html__('ago', 'brighthub');
        } elseif ($months > 0) {
            return $months . ' month ' . esc_html__('ago', 'brighthub');
        } elseif ($days > 0) {
            return $days . ' day ' . esc_html__('ago', 'brighthub');
        } elseif ($hours > 0) {
            return $hours . ' hour ' . esc_html__('ago', 'brighthub');
        } elseif ($mins > 0) {
            return $mins . ' min ' . esc_html__('ago', 'brighthub');
        } else {
            return esc_html__('just now', 'brighthub');
        }
    } catch (Exception $e) {
        return esc_html__('just now', 'brighthub');
    }
}

function brighthub_user_form() {
    if(function_exists('up_get_template_part') && !is_user_logged_in()) : ?>
        <div class="pxl-modal pxl-user-popup">
            <div class="pxl-modal-close"><i class="pxl-icon-close"></i></div>
            <div class="pxl-modal-content">
                <div class="pxl-user pxl-user-register u-close">
                    <div class="pxl-user-content">
                        <h3 class="pxl-user-heading"><?php echo esc_html__('Create your account', 'brighthub'); ?></h3>
                        <?php echo do_shortcode('[case-user-form form_type="register"]'); ?>
                        <div class="pxl-user-footer">
                            <a href="javascript:void(0)" class="btn-sign-in"> <?php esc_html_e('Sign In', 'brighthub');?></a>
                        </div>
                    </div>
                </div>
                <div class="pxl-user pxl-user-login">
                    <div class="pxl-user-content">
                        <h3 class="pxl-user-heading"><?php echo esc_html__('Log in to Your Account', 'brighthub'); ?></h3>
                        <?php echo do_shortcode('[case-user-form form_type="login" is_logged="profile"]'); ?>  
                        <div class="pxl-user-footer">
                            <a href="javascript:void(0)" class="btn-sign-up"> <?php esc_html_e('Sign Up', 'brighthub');?></a>
                        </div>
                        <?php if(class_exists('Woocommerce')) : 
                            $my_ac = get_option( 'woocommerce_myaccount_page_id' ); 
                            $lost_password = get_option( 'woocommerce_myaccount_lost_password_endpoint' );
                            ?>
                            <div class="pxl-user-forgot-pass"><a href="<?php echo esc_url(get_permalink($my_ac)); ?><?php echo esc_html($lost_password); ?>"><?php esc_html_e('Forgot your password?', 'brighthub');?></a></div>
                        <?php endif; ?>
                    </div>
                </div> 
            </div>
        </div>
    <?php endif;
}

