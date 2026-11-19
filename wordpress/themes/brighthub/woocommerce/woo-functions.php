<?php
if ( function_exists( 'wc_get_template' ) ) {
    wc_get_template( 'cart/mini-cart-main.php' );
} else {
    $fallback = get_template_directory() . '/woocommerce/cart/mini-cart-main.php';
    if ( file_exists( $fallback ) ) {
        require_once $fallback;
    } else {
        error_log( 'mini-cart-main.php not found in parent theme and WooCommerce not loaded.' );
    }
}

/**
 * Fix WooCommerce LookupDataStore warning for undefined breakpoint keys
 * This is a workaround for WooCommerce core issue with invalid breakpoint keys like "tripble-extra-large"
 * 
 * This warning occurs when WooCommerce tries to access a breakpoint key that doesn't exist in the array.
 * This is a known issue in some WooCommerce versions with PHP 8.0+.
 * 
 * Note: This is a temporary workaround. The proper fix should come from WooCommerce core update.
 */
add_action( 'init', 'brighthub_fix_woocommerce_breakpoint_warning', 1 );
function brighthub_fix_woocommerce_breakpoint_warning() {
    // Only apply fix if WooCommerce is active and PHP 8.0+
    if ( ! class_exists( 'WooCommerce' ) || PHP_VERSION_ID < 80000 ) {
        return;
    }
    
    // Store the previous error handler
    $previous_handler = set_error_handler( function( $errno, $errstr, $errfile, $errline ) use ( &$previous_handler ) {
        // Only suppress the specific warning about undefined array key in LookupDataStore
        if ( $errno === E_WARNING && 
             strpos( $errfile, 'LookupDataStore.php' ) !== false &&
             strpos( $errstr, 'Undefined array key' ) !== false &&
             ( strpos( $errstr, 'tripble-extra-large' ) !== false || 
               strpos( $errstr, 'triple-extra-large' ) !== false ) ) {
            // Suppress this specific warning - it's a WooCommerce core bug
            return true;
        }
        
        // Call the previous error handler for other errors
        if ( $previous_handler !== null && is_callable( $previous_handler ) ) {
            return call_user_func( $previous_handler, $errno, $errstr, $errfile, $errline );
        }
        
        // Let PHP handle the error
        return false;
    }, E_WARNING );
}

add_action( 'woocommerce_after_add_to_cart_form', 'theme_show_long_description_after_cart', 5 );
function theme_show_long_description_after_cart() {
    $post_id = get_the_ID();
    if ( ! $post_id ) {
        return;
    }
    $raw     = get_post_field( 'post_content', $post_id );
    $content = apply_filters( 'the_content', $raw );
    if ( ! empty( $content ) ) {
        echo $content;
    }
}

remove_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_title', 99 );

if ( ! is_admin() ) {
    remove_filter( 'woocommerce_short_description', 'wpautop' );
}

add_action( 'after_setup_theme', 'custom_woocommerce_gallery_thumbnail_size' );
function custom_woocommerce_gallery_thumbnail_size() {
    add_image_size( 'woocommerce_gallery_thumbnail_custom', 86, 104, true );
}
add_filter( 'woocommerce_get_image_size_gallery_thumbnail', 'custom_gallery_thumbnail_override' );
function custom_gallery_thumbnail_override( $size ) {
    return array(
        'width'  => 86,
        'height' => 104,
        'crop'   => 1,
    );
}

add_action( 'init', function() {
    remove_action( 'woocommerce_before_shop_loop', 'woocommerce_catalog_ordering', 30 );
    remove_action( 'woocommerce_before_shop_loop', 'woocommerce_result_count', 20 );
} );

add_action( 'wp_enqueue_scripts', 'brighthub_enqueue_filter_scripts' );
function brighthub_enqueue_filter_scripts() {
    if ( ! wp_script_is( 'swiper', 'registered' ) && ! wp_script_is( 'swiper', 'enqueued' ) ) {
        wp_register_script(
            'swiper',
            'https://unpkg.com/swiper@8/swiper-bundle.min.js',
            array(),
            '8.4.7',
            true
        );
    }
    if ( ! wp_style_is( 'swiper', 'registered' ) && ! wp_style_is( 'swiper', 'enqueued' ) ) {
        wp_register_style(
            'swiper',
            'https://unpkg.com/swiper@8/swiper-bundle.min.css',
            array(),
            '8.4.7'
        );
    }
    wp_enqueue_style( 'swiper' );
    wp_enqueue_script( 'swiper' );

    wp_enqueue_script(
        'brighthub-woo',
        get_theme_file_uri( 'woocommerce/assets/js/woo.js' ),
        array( 'jquery', 'swiper' ),
        '1.0.0',
        true
    );

    if ( is_shop() || is_product_category() || is_product_tag() ) {
        wp_enqueue_script(
            'brighthub-filter-ajax',
            get_theme_file_uri( 'woocommerce/assets/js/filter.js' ),
            array( 'jquery' ),
            '1.0.0',
            true
        );

        $category_slug = '';
        if ( is_product_category() ) {
            $queried_object = get_queried_object();
            if ( $queried_object && isset( $queried_object->slug ) ) {
                $category_slug = $queried_object->slug;
            }
        }

        $category_base = 'product-category';
        $taxonomy = get_taxonomy( 'product_cat' );
        if ( $taxonomy && isset( $taxonomy->rewrite ) && isset( $taxonomy->rewrite['slug'] ) ) {
            $category_base = $taxonomy->rewrite['slug'];
        }

        wp_localize_script(
            'brighthub-filter-ajax',
            'filter_ajax',
            array(
                'ajax_url'        => admin_url( 'admin-ajax.php' ),
                'nonce'           => wp_create_nonce( 'filter_nonce' ),
                'default_per_page' => brighthub_products_per_page(),
                'category_slug'   => $category_slug,
                'category_base'  => $category_base,
            )
        );
    }
}

add_filter( 'loop_shop_per_page', 'brighthub_products_per_page', 999 );
function brighthub_products_per_page( $default = 9 ) {
    if ( isset( $_GET['posts_per_page'] ) ) {
        $ppp = absint( wp_unslash( $_GET['posts_per_page'] ) );
        if ( $ppp > 0 ) {
            return $ppp;
        }
    }
    
    $theme_option = brighthub()->get_theme_opt( 'number_product_to_show', $default );
    if ( ! empty( $theme_option ) && is_numeric( $theme_option ) ) {
        $theme_option = absint( $theme_option );
        if ( $theme_option > 0 ) {
            return $theme_option;
        }
    }
    
    return $default;
}

add_action( 'wp_ajax_filter_products',       'brighthub_filter_products' );
add_action( 'wp_ajax_nopriv_filter_products','brighthub_filter_products' );

function brighthub_filter_products() {
    check_ajax_referer( 'filter_nonce', 'nonce' );

    $get_array = function( $key ) {
        return isset( $_POST[ $key ] ) ? (array) wp_unslash( $_POST[ $key ] ) : array();
    };
    $get_value = function( $key, $default = '' ) {
        return isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : $default;
    };

    $categories = array_map( 'sanitize_text_field', $get_array( 'product_cat' ) );
    $attributes = isset( $_POST['filter_attr'] ) ? wp_unslash( $_POST['filter_attr'] ) : array();
    $min_price  = $get_value( 'min_price', '' );
    $max_price  = $get_value( 'max_price', '' );
    $orderby    = sanitize_text_field( $get_value( 'orderby', '' ) );
    $paged      = absint( $get_value( 'paged', 1 ) );
    $per_page   = absint( $get_value( 'posts_per_page', brighthub_products_per_page() ) );

    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $per_page,
        'paged'          => max( 1, $paged ),
        'meta_query'     => array(),
        'tax_query'      => array( 'relation' => 'AND' ),
    );

    if ( ! empty( $categories ) ) {
        $args['tax_query'][] = array(
            'taxonomy' => 'product_cat',
            'field'    => 'slug',
            'terms'    => $categories,
            'operator' => 'IN',
        );
    }

    if ( is_array( $attributes ) ) {
        foreach ( $attributes as $tax => $terms ) {
            if ( ! empty( $terms ) ) {
                $args['tax_query'][] = array(
                    'taxonomy' => sanitize_text_field( $tax ),
                    'field'    => 'slug',
                    'terms'    => array_map( 'sanitize_text_field', (array) $terms ),
                    'operator' => 'IN',
                );
            }
        }
    }

    $min_price = ( '' === $min_price ) ? '' : floatval( $min_price );
    $max_price = ( '' === $max_price ) ? '' : floatval( $max_price );

    if ( '' !== $min_price || '' !== $max_price ) {
        $price_q = array( 'relation' => 'AND' );
        if ( '' !== $min_price ) {
            $price_q[] = array(
                'key'     => '_price',
                'value'   => $min_price,
                'compare' => '>=',
                'type'    => 'DECIMAL(10,2)',
            );
        }
        if ( '' !== $max_price ) {
            $price_q[] = array(
                'key'     => '_price',
                'value'   => $max_price,
                'compare' => '<=',
                'type'    => 'DECIMAL(10,2)',
            );
        }
        $args['meta_query'][] = $price_q;
    }

    switch ( $orderby ) {
        case 'price':
            $args['meta_key'] = '_price';
            $args['orderby']  = 'meta_value_num';
            $args['order']    = 'ASC';
            break;
        case 'price-desc':
            $args['meta_key'] = '_price';
            $args['orderby']  = 'meta_value_num';
            $args['order']    = 'DESC';
            break;
        case 'popularity':
            $args['meta_key'] = 'total_sales';
            $args['orderby']  = 'meta_value_num';
            $args['order']    = 'DESC';
            break;
        case 'rating':
            $args['meta_key'] = '_wc_average_rating';
            $args['orderby']  = 'meta_value_num';
            $args['order']    = 'DESC';
            break;
        case 'date':
            $args['orderby'] = 'date';
            $args['order']   = 'DESC';
            break;
        default:
            $args['orderby'] = 'date';
            $args['order']   = 'DESC';
            break;
    }

    $q = new WP_Query( $args );

    ob_start();
    if ( $q->have_posts() ) {
        woocommerce_product_loop_start();
        while ( $q->have_posts() ) {
            $q->the_post();
            wc_get_template_part( 'content', 'product' );
        }
        woocommerce_product_loop_end();

        if ( $q->max_num_pages > 1 ) {
            $total   = $q->max_num_pages;
            $current = $paged;
            $base    = esc_url_raw( add_query_arg( 'paged', '%#%' ) );
            $format  = '';
            $pagination_tpl = locate_template( 'woocommerce/loop/pagination.php' );
            if ( $pagination_tpl ) {
                include $pagination_tpl;
            }
        }
    } else {
        echo '<div class="woocommerce-no-products-found"><p>No products were found matching your selection.</p></div>';
    }
    wp_reset_postdata();
    $products_html = ob_get_clean();

    ob_start();
    woocommerce_catalog_ordering();
    $ordering_html = ob_get_clean();

    wp_send_json_success( array(
        'products'      => $products_html,
        'ordering'      => $ordering_html,
        'found_posts'   => $q->found_posts,
        'max_num_pages' => $q->max_num_pages,
    ) );
}

add_action( 'pre_get_posts', 'brighthub_handle_main_query', 20 );
function brighthub_handle_main_query( $query ) {
    if ( is_admin() || ! $query->is_main_query() || ! ( is_shop() || is_product_category() || is_product_tag() ) ) {
        return;
    }

    if ( isset( $_GET['posts_per_page'] ) ) {
        $ppp = absint( wp_unslash( $_GET['posts_per_page'] ) );
        if ( $ppp > 0 ) {
            $query->set( 'posts_per_page', $ppp );
        }
    }

    if ( ! empty( $_GET['product_cat'] ) ) {
        $cats = (array) wp_unslash( $_GET['product_cat'] );
        $tax  = $query->get( 'tax_query' ) ?: array();
        $tax[] = array(
            'taxonomy' => 'product_cat',
            'field'    => 'slug',
            'terms'    => array_map( 'sanitize_text_field', $cats ),
            'operator' => 'IN',
        );
        $query->set( 'tax_query', $tax );
    }

    if ( ! empty( $_GET['filter_attr'] ) ) {
        $tax = $query->get( 'tax_query' ) ?: array( 'relation' => 'AND' );
        $fa  = (array) wp_unslash( $_GET['filter_attr'] );
        foreach ( $fa as $taxname => $terms ) {
            if ( ! empty( $terms ) ) {
                $tax[] = array(
                    'taxonomy' => sanitize_text_field( $taxname ),
                    'field'    => 'slug',
                    'terms'    => array_map( 'sanitize_text_field', (array) $terms ),
                    'operator' => 'IN',
                );
            }
        }
        $query->set( 'tax_query', $tax );
    }

    $min = isset( $_GET['min_price'] ) ? floatval( wp_unslash( $_GET['min_price'] ) ) : '';
    $max = isset( $_GET['max_price'] ) ? floatval( wp_unslash( $_GET['max_price'] ) ) : '';
    if ( '' !== $min || '' !== $max ) {
        $mq  = $query->get( 'meta_query' ) ?: array();
        $p_q = array( 'relation' => 'AND' );
        if ( '' !== $min ) {
            $p_q[] = array( 'key' => '_price', 'value' => $min, 'compare' => '>=', 'type' => 'DECIMAL(10,2)' );
        }
        if ( '' !== $max ) {
            $p_q[] = array( 'key' => '_price', 'value' => $max, 'compare' => '<=', 'type' => 'DECIMAL(10,2)' );
        }
        $mq[] = $p_q;
        $query->set( 'meta_query', $mq );
    }
}

add_action( 'woocommerce_product_query', 'brighthub_handle_product_query', 5 );
function brighthub_handle_product_query( $q ) {
    if ( ! isset( $_GET['posts_per_page'] ) ) {
        $per_page = brighthub_products_per_page();
        if ( $per_page > 0 ) {
            $q->set( 'posts_per_page', $per_page );
        }
    } else {
        $ppp = absint( wp_unslash( $_GET['posts_per_page'] ) );
        if ( $ppp > 0 ) {
            $q->set( 'posts_per_page', $ppp );
        }
    }
}

add_action( 'woocommerce_product_query', 'brighthub_handle_ordering' );
function brighthub_handle_ordering( $q ) {
    $orderby = get_query_var( 'orderby' );
    switch ( $orderby ) {
        case 'price':
            $q->set( 'meta_key', '_price' );
            $q->set( 'orderby', 'meta_value_num' );
            $q->set( 'order', 'ASC' );
            break;
        case 'price-desc':
            $q->set( 'meta_key', '_price' );
            $q->set( 'orderby', 'meta_value_num' );
            $q->set( 'order', 'DESC' );
            break;
        case 'popularity':
            $q->set( 'meta_key', 'total_sales' );
            $q->set( 'orderby', 'meta_value_num' );
            $q->set( 'order', 'DESC' );
            break;
        case 'rating':
            $q->set( 'meta_key', '_wc_average_rating' );
            $q->set( 'orderby', 'meta_value_num' );
            $q->set( 'order', 'DESC' );
            break;
        case 'date':
            $q->set( 'orderby', 'date' );
            $q->set( 'order', 'DESC' );
            break;
        default:
            $q->set( 'orderby', 'date' );
            $q->set( 'order', 'DESC' );
            break;
    }
}

add_filter( 'redirect_canonical', 'brighthub_disable_shop_canonical', 10, 2 );
function brighthub_disable_shop_canonical( $redirect_url, $requested_url ) {
    if ( is_shop() && ! empty( $_GET['paged'] ) ) {
        return false;
    }
    return $redirect_url;
}

add_action( 'template_redirect', 'brighthub_fix_shop_urls' );
function brighthub_fix_shop_urls() {
    $uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '';

    if ( preg_match( '#^/shop/page/(\d+)/?$#', $uri, $m ) ) {
        $n = intval( $m[1] );
        if ( $n > 1 ) {
            $shop   = get_permalink( wc_get_page_id( 'shop' ) );
            $target = add_query_arg( 'paged', $n, $shop );

            foreach ( $_GET as $k => $v ) {
                if ( 'paged' !== $k ) {
                    $target = add_query_arg( sanitize_key( $k ), rawurlencode( wp_unslash( $v ) ), $target );
                }
            }

            wp_redirect( $target, 301 );
            exit;
        }
    }
}

/**
 * Display product loop using template content-product.php
 * 
 * @param array $args {
 *     @type int      $posts_per_page Number of products to display
 *     @type string   $orderby        Sort by: date, price, price-desc, popularity, rating
 *     @type string   $order          ASC or DESC
 *     @type array    $categories     Array of category slugs
 *     @type array    $tags           Array of tag slugs
 *     @type array    $ids            Array of product IDs
 *     @type bool     $featured       Only display featured products
 *     @type bool     $on_sale        Only display on sale products
 *     @type string   $columns        Number of columns
 *     @type string   $class          Class CSS custom for wrapper
 * }
 * @return string HTML output
 */
if ( ! function_exists( 'brighthub_product_loop' ) ) {
    function brighthub_product_loop( $args = array() ) {
        if ( ! class_exists( 'WooCommerce' ) ) {
            return '<p>' . esc_html__( 'WooCommerce chưa được cài đặt.', 'brighthub' ) . '</p>';
        }

        $defaults = array(
            'posts_per_page' => 9,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'categories'    => array(),
            'tags'           => array(),
            'ids'            => array(),
            'featured'       => false,
            'on_sale'        => false,
            'columns'        => '4',
            'class'          => '',
        );

        $args = wp_parse_args( $args, $defaults );

        $query_args = array(
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => absint( $args['posts_per_page'] ),
            'order'           => sanitize_text_field( $args['order'] ),
            'meta_query'     => array(),
            'tax_query'      => array( 'relation' => 'AND' ),
        );

        // Orderby
        switch ( $args['orderby'] ) {
            case 'price':
                $query_args['meta_key'] = '_price';
                $query_args['orderby']  = 'meta_value_num';
                break;
            case 'price-desc':
                $query_args['meta_key'] = '_price';
                $query_args['orderby']  = 'meta_value_num';
                $query_args['order']    = 'DESC';
                break;
            case 'popularity':
                $query_args['meta_key'] = 'total_sales';
                $query_args['orderby']  = 'meta_value_num';
                break;
            case 'rating':
                $query_args['meta_key'] = '_wc_average_rating';
                $query_args['orderby']  = 'meta_value_num';
                break;
            case 'date':
            default:
                $query_args['orderby'] = 'date';
                break;
        }

        // Categories
        if ( ! empty( $args['categories'] ) && is_array( $args['categories'] ) ) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'product_cat',
                'field'    => 'slug',
                'terms'    => array_map( 'sanitize_text_field', $args['categories'] ),
                'operator' => 'IN',
            );
        }

        // Tags
        if ( ! empty( $args['tags'] ) && is_array( $args['tags'] ) ) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'product_tag',
                'field'    => 'slug',
                'terms'    => array_map( 'sanitize_text_field', $args['tags'] ),
                'operator' => 'IN',
            );
        }

        // Featured products
        if ( $args['featured'] ) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'product_visibility',
                'field'    => 'name',
                'terms'    => 'featured',
                'operator' => 'IN',
            );
        }

        // On sale products
        if ( $args['on_sale'] ) {
            $query_args['post__in'] = wc_get_product_ids_on_sale();
        }

        // Specific product IDs
        if ( ! empty( $args['ids'] ) && is_array( $args['ids'] ) ) {
            $query_args['post__in'] = array_map( 'absint', $args['ids'] );
        }

        $products = new WP_Query( $query_args );

        if ( ! $products->have_posts() ) {
            wp_reset_postdata();
            return '<p class="woocommerce-info">' . esc_html__( 'Không tìm thấy sản phẩm nào.', 'brighthub' ) . '</p>';
        }

        ob_start();

        $wrapper_class = 'woocommerce products columns-' . esc_attr( $args['columns'] );
        if ( ! empty( $args['class'] ) ) {
            $wrapper_class .= ' ' . esc_attr( $args['class'] );
        }
        ?>

        <ul class="<?php echo esc_attr( $wrapper_class ); ?>">
            <?php
            while ( $products->have_posts() ) {
                $products->the_post();
                global $product;
                wc_get_template_part( 'content', 'product' );
            }
            ?>
        </ul>

        <?php
        wp_reset_postdata();
        return ob_get_clean();
    }
}

/**
 * Shortcode to display product loop
 * 
 * Usage: [brighthub_products posts_per_page="6" orderby="price" categories="category-slug" columns="3"]
 */
if ( ! function_exists( 'brighthub_products_shortcode' ) ) {
    add_shortcode( 'brighthub_products', 'brighthub_products_shortcode' );
    function brighthub_products_shortcode( $atts ) {
        $atts = shortcode_atts( array(
            'posts_per_page' => '9',
            'orderby'        => 'date',
            'order'          => 'DESC',
            'categories'     => '',
            'tags'           => '',
            'ids'            => '',
            'featured'       => 'false',
            'on_sale'        => 'false',
            'columns'        => '4',
            'class'          => '',
        ), $atts, 'brighthub_products' );

        $args = array(
            'posts_per_page' => absint( $atts['posts_per_page'] ),
            'orderby'        => sanitize_text_field( $atts['orderby'] ),
            'order'          => sanitize_text_field( $atts['order'] ),
            'columns'        => sanitize_text_field( $atts['columns'] ),
            'class'          => sanitize_text_field( $atts['class'] ),
            'featured'       => filter_var( $atts['featured'], FILTER_VALIDATE_BOOLEAN ),
            'on_sale'        => filter_var( $atts['on_sale'], FILTER_VALIDATE_BOOLEAN ),
        );

        if ( ! empty( $atts['categories'] ) ) {
            $args['categories'] = array_map( 'trim', explode( ',', $atts['categories'] ) );
        }

        if ( ! empty( $atts['tags'] ) ) {
            $args['tags'] = array_map( 'trim', explode( ',', $atts['tags'] ) );
        }

        if ( ! empty( $atts['ids'] ) ) {
            $args['ids'] = array_map( 'absint', explode( ',', $atts['ids'] ) );
        }

        return brighthub_product_loop( $args );
    }
}
