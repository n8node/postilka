<?php
/*
Plugin Name: WPC AJAX Add to Cart for WooCommerce
Plugin URI: https://wpclever.net/
Description: AJAX add to cart for WooCommerce products.
Author: WPClever
Author URI: https://wpclever.net
Text Domain: wpc-ajax-add-to-cart
Domain Path: /languages/
Requires Plugins: woocommerce
Version: 2.2.7
Requires at least: 5.9
WC requires at least: 3.0
WC tested up to: 11.2
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

defined( 'ABSPATH' ) || exit;

! defined( 'WOOAA_VERSION' ) && define( 'WOOAA_VERSION', '2.2.7' );
! defined( 'WOOAA_FILE' ) && define( 'WOOAA_FILE', __FILE__ );
! defined( 'WOOAA_URI' ) && define( 'WOOAA_URI', plugin_dir_url( __FILE__ ) );
! defined( 'WOOAA_DIR' ) && define( 'WOOAA_DIR', plugin_dir_path( __FILE__ ) );
! defined( 'WOOAA_REVIEWS' ) && define( 'WOOAA_REVIEWS', 'https://wordpress.org/support/plugin/wpc-ajax-add-to-cart/reviews/' );
! defined( 'WOOAA_CHANGELOG' ) && define( 'WOOAA_CHANGELOG', 'https://wordpress.org/plugins/wpc-ajax-add-to-cart/#developers' );
! defined( 'WOOAA_DISCUSSION' ) && define( 'WOOAA_DISCUSSION', 'https://wordpress.org/support/plugin/wpc-ajax-add-to-cart/' );

// WPC Core
require_once __DIR__ . '/includes/wpc-core/wpc-core.php';
wpc_core_register( [
	'file'    => __FILE__,
	'version' => WOOAA_VERSION,
	'prefix'  => 'wooaa',
] );

if ( ! class_exists( 'WPCleverWooaa' ) && class_exists( 'WC_Product' ) ) {
    class WPCleverWooaa {
        protected static $instance = null;
        protected static $settings = [];

        public static function instance() {
            if ( is_null( self::$instance ) ) {
                self::$instance = new self();
            }

            return self::$instance;
        }

        function __construct() {
            self::$settings = (array) get_option( 'wooaa_settings', [] );

            // frontend
            add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ], 99 );

            // ajax
            add_action( 'wc_ajax_wooaa_add_to_cart', [ $this, 'ajax_add_to_cart' ] );

            // backend
            add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );
            add_action( 'admin_init', [ $this, 'register_settings' ] );
            add_action( 'admin_menu', [ $this, 'admin_menu' ] );
            add_filter( 'plugin_action_links', [ $this, 'action_links' ], 10, 2 );
            add_filter( 'plugin_row_meta', [ $this, 'row_meta' ], 10, 2 );

            // nonce check
            add_filter( 'wooaa_disable_nonce_check', function ( $check, $context ) {
                return apply_filters( 'wooaa_disable_security_check', $check, $context );
            }, 10, 2 );
        }
        function enqueue_scripts() {
            $ignore_button_class = apply_filters( 'wooaa_ignore_classes', [
                    '.disabled',
                    '.wpc-disabled',
                    '.wooaa-disabled',
                    '.wooco-disabled',
                    '.woosb-disabled',
                    '.woobt-disabled',
                    '.woosg-disabled',
                    '.woofs-disabled',
                    '.woopq-disabled',
                    '.wpcpo-disabled',
                    '.wpcbn-btn',
                    '.wpcme-btn',
                    '.wpcev-btn',
                    '.wpcuv-update'
            ] );

            wp_enqueue_script( 'wooaa-frontend', WOOAA_URI . 'assets/js/frontend.js', [
                    'jquery',
                    'wc-add-to-cart'
            ], WOOAA_VERSION, true );
            wp_localize_script( 'wooaa-frontend', 'wooaa_vars', apply_filters( 'wooaa_vars', [
                    'wc_ajax_url'             => WC_AJAX::get_endpoint( '%%endpoint%%' ),
                    'nonce'                   => wp_create_nonce( 'wooaa-security' ),
                    'product_types'           => implode( ',', (array) self::get_setting( 'product_types', [ 'all' ] ) ),
                    'ignore_btn_class'        => implode( ',', (array) $ignore_button_class ),
                    'ignore_form_data'        => implode( ',', (array) apply_filters( 'wooaa_ignore_form_data', [] ) ),
                    'cart_url'                => apply_filters( 'woocommerce_add_to_cart_redirect', wc_get_cart_url(), null ),
                    'cart_redirect_after_add' => get_option( 'woocommerce_cart_redirect_after_add' ),
            ] ) );
        }

        function admin_enqueue_scripts( $hook ) {
            if ( str_contains( $hook, 'wooaa' ) ) {
                wp_enqueue_style( 'wooaa-backend', WOOAA_URI . 'assets/css/backend.css', [ 'woocommerce_admin_styles' ], WOOAA_VERSION );
                wp_enqueue_script( 'wooaa-backend', WOOAA_URI . 'assets/js/backend.js', [
                        'jquery',
                        'selectWoo',
                ], WOOAA_VERSION, true );
            }
        }

        function register_settings() {
            // settings
            register_setting( 'wooaa_settings', 'wooaa_settings', [
                    'type'              => 'array',
                    'sanitize_callback' => [ $this, 'sanitize_array' ],
            ] );
        }

        function admin_menu() {
            add_submenu_page( 'wpclever', 'WPC AJAX Add to Cart', 'AJAX Add to Cart', 'manage_options', 'wpclever-wooaa', [
                    $this,
                    'admin_menu_content'
            ] );
        }

        function admin_menu_content() {
            $active_tab = sanitize_key( wp_unslash( $_GET['tab'] ?? 'settings' ) );
            ?>
            <div class="wpclever_settings_page wrap">
                <div class="wpclever_settings_page_header">
                    <a class="wpclever_settings_page_header_logo" href="https://wpclever.net/"
                       target="_blank" title="Visit wpclever.net"></a>
                    <div class="wpclever_settings_page_header_text">
                        <div class="wpclever_settings_page_title"><?php echo esc_html__( 'WPC AJAX Add to Cart', 'wpc-ajax-add-to-cart' ) . ' ' . esc_html( WOOAA_VERSION ); ?></div>
                        <div class="wpclever_settings_page_desc about-text">
                            <p>
                                <?php printf( /* translators: stars */ esc_html__( 'Thank you for using our plugin! If you are satisfied, please reward it a full five-star %s rating.', 'wpc-ajax-add-to-cart' ), '<span style="color:#ffb900">&#9733;&#9733;&#9733;&#9733;&#9733;</span>' ); ?>
                                <br/>
                                <a href="<?php echo esc_url( WOOAA_REVIEWS ); ?>"
                                   target="_blank"><?php esc_html_e( 'Reviews', 'wpc-ajax-add-to-cart' ); ?></a> |
                                <a href="<?php echo esc_url( WOOAA_CHANGELOG ); ?>"
                                   target="_blank"><?php esc_html_e( 'Changelog', 'wpc-ajax-add-to-cart' ); ?></a> |
                                <a href="<?php echo esc_url( WOOAA_DISCUSSION ); ?>"
                                   target="_blank"><?php esc_html_e( 'Discussion', 'wpc-ajax-add-to-cart' ); ?></a>
                            </p>
                        </div>
                    </div>
                </div>
                <h2></h2>
                <?php if ( isset( $_GET['settings-updated'] ) && sanitize_text_field( wp_unslash( $_GET['settings-updated'] ?? '' ) ) ) { ?>
                    <div class="notice notice-success is-dismissible">
                        <p><?php esc_html_e( 'Settings updated.', 'wpc-ajax-add-to-cart' ); ?></p>
                    </div>
                <?php } ?>
                <div class="wpclever_settings_page_nav">
                    <h2 class="nav-tab-wrapper">
                        <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-wooaa&tab=settings' ) ); ?>"
                           class="<?php echo esc_attr( $active_tab === 'settings' ? 'nav-tab nav-tab-active' : 'nav-tab' ); ?>">
                            <?php esc_html_e( 'Settings', 'wpc-ajax-add-to-cart' ); ?>
                        </a>
                        <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-kit' ) ); ?>" class="nav-tab">
                            <?php esc_html_e( 'Essential Kit', 'wpc-ajax-add-to-cart' ); ?>
                        </a>
                    </h2>
                </div>
                <div class="wpclever_settings_page_content">
                    <?php if ( $active_tab === 'settings' ) { ?>
                        <form method="post" action="options.php">
                            <table class="form-table wooaa-settings">
                                <tr class="heading">
                                    <th colspan="2">
                                        <?php esc_html_e( 'General', 'wpc-ajax-add-to-cart' ); ?>
                                    </th>
                                </tr>
                                <tr>
                                    <th scope="row"><?php esc_html_e( 'Enable for product types', 'wpc-ajax-add-to-cart' ); ?></th>
                                    <td>
                                        <?php
                                        $product_types = (array) self::get_setting( 'product_types', [ 'all' ] );
                                        $types         = array_merge( [ 'all' => esc_html__( 'All', 'wpc-ajax-add-to-cart' ) ], wc_get_product_types() );

                                        echo '<select class="wooaa_product_types" name="wooaa_settings[product_types][]" multiple>';

                                        foreach ( $types as $key => $name ) {
                                            echo '<option value="' . esc_attr( $key ) . '" ' . ( in_array( $key, $product_types, true ) ? 'selected' : '' ) . '>' . esc_html( $name ) . '</option>';
                                        }

                                        echo '</select>';
                                        ?>
                                    </td>
                                </tr>
                                <tr class="submit">
                                    <th colspan="2">
                                        <?php settings_fields( 'wooaa_settings' ); ?><?php submit_button(); ?>
                                    </th>
                                </tr>
                            </table>
                        </form>
                    <?php } ?>
                </div><!-- /.wpclever_settings_page_content -->
                <div class="wpclever_settings_page_suggestion">
                    <div class="wpclever_settings_page_suggestion_label">
                        <span class="dashicons dashicons-yes-alt"></span> Suggestion
                    </div>
                    <div class="wpclever_settings_page_suggestion_content">
                        <div>
                            To display custom engaging real-time messages on any wished positions, please install
                            <a href="https://wordpress.org/plugins/wpc-smart-messages/" target="_blank">WPC Smart
                                Messages</a> plugin. It's free!
                        </div>
                        <div>
                            Wanna save your precious time working on variations? Try our brand-new free plugin
                            <a href="https://wordpress.org/plugins/wpc-variation-bulk-editor/" target="_blank">WPC
                                Variation Bulk Editor</a> and
                            <a href="https://wordpress.org/plugins/wpc-variation-duplicator/" target="_blank">WPC
                                Variation Duplicator</a>.
                        </div>
                    </div>
                </div>
            </div>
            <?php
        }

        function ajax_add_to_cart() {
            if ( ! apply_filters( 'wooaa_disable_nonce_check', false, 'add_to_cart' ) ) {
                if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'wooaa-security' ) ) {
                    die( 'Permissions check failed!' );
                }
            }

            if ( ! isset( $_POST['product_id'] ) ) {
                wp_die();
            }

            $product_id        = apply_filters( 'woocommerce_add_to_cart_product_id', absint( wp_unslash( $_POST['product_id'] ?? '' ) ) );
            $product           = wc_get_product( $product_id );
            $quantity          = wc_stock_amount( sanitize_text_field( wp_unslash( $_POST['quantity'] ?? 1 ) ) );
            $passed_validation = apply_filters( 'woocommerce_add_to_cart_validation', true, $product_id, $quantity );
            $product_status    = get_post_status( $product_id );
            $variation_id      = absint( wp_unslash( $_POST['variation_id'] ?? 0 ) );
            // Sanitize variation data per attribute type.
            // Taxonomy attributes (key starts with 'attribute_pa_') use sanitize_title() to preserve
            // percent-encoded non-Latin slugs (e.g. Hebrew). sanitize_text_field() strips those
            // encoded characters and causes WooCommerce to reject the selection.
            // Custom attributes use sanitize_text_field() as their values are plain text.
            $variation = [];

            if ( isset( $_POST['variation'] ) && is_array( $_POST['variation'] ) ) {
                foreach ( wp_unslash( $_POST['variation'] ) as $key => $value ) {
                    $key = sanitize_key( $key );

                    if ( str_starts_with( $key, 'attribute_pa_' ) ) {
                        // Taxonomy attribute: keep encoded slug intact.
                        $variation[ $key ] = sanitize_title( wp_unslash( (string) $value ) );
                    } else {
                        // Custom attribute: plain text is safe to sanitize as text.
                        $variation[ $key ] = sanitize_text_field( wp_unslash( (string) $value ) );
                    }
                }
            }

            if ( ! $product ) {
                $data = [
                        'error'       => true,
                        'product_url' => apply_filters( 'woocommerce_cart_redirect_after_error', get_permalink( $product_id ), $product_id ),
                ];

                wp_send_json( $data );
            }

            if ( $product->get_type() === 'grouped' ) {
                $was_added_to_cart = false;
                $added_to_cart     = [];
                $items             = isset( $_REQUEST['quantity'] ) && is_array( $_REQUEST['quantity'] ) ? array_map( 'intval', wp_unslash( $_REQUEST['quantity'] ?? [] ) ) : [];

                if ( ! empty( $items ) ) {
                    $quantity_set = false;

                    foreach ( $items as $item => $quantity ) {
                        $quantity = wc_stock_amount( $quantity );
                        if ( $quantity <= 0 ) {
                            continue;
                        }
                        $quantity_set = true;

                        // Add to cart validation.
                        $passed_validation = apply_filters( 'woocommerce_add_to_cart_validation', true, $item, $quantity );

                        // Suppress total recalculation until finished.
                        remove_action( 'woocommerce_add_to_cart', [ WC()->cart, 'calculate_totals' ], 20, 0 );

                        if ( $passed_validation && false !== WC()->cart->add_to_cart( $item, $quantity ) ) {
                            $was_added_to_cart      = true;
                            $added_to_cart[ $item ] = $quantity;
                        }

                        add_action( 'woocommerce_add_to_cart', [ WC()->cart, 'calculate_totals' ], 20, 0 );
                    }

                    if ( ! $was_added_to_cart && ! $quantity_set ) {
                        wc_add_notice( esc_html__( 'Please choose the quantity of items you wish to add to your cart&hellip;', 'wpc-ajax-add-to-cart' ), 'error' );

                        $data = [
                                'error'       => true,
                                'product_url' => apply_filters( 'woocommerce_cart_redirect_after_error', get_permalink( $product_id ), $product_id ),
                        ];

                        wp_send_json( $data );
                    } elseif ( $was_added_to_cart ) {
                        if ( 'yes' === get_option( 'woocommerce_cart_redirect_after_add' ) ) {
                            wc_add_to_cart_message( $added_to_cart );
                        }

                        WC()->cart->calculate_totals();

                        do_action( 'woocommerce_ajax_added_to_cart', $product_id );

                        WC_AJAX::get_refreshed_fragments();
                    }
                } elseif ( $product_id ) {
                    wc_add_notice( esc_html__( 'Please choose a product to add to your cart&hellip;', 'wpc-ajax-add-to-cart' ), 'error' );

                    $data = [
                            'error'       => true,
                            'product_url' => apply_filters( 'woocommerce_cart_redirect_after_error', get_permalink( $product_id ), $product_id ),
                    ];

                    wp_send_json( $data );
                }

                wp_die();
            }

            if ( $product->get_type() === 'variation' ) {
                $variation_id = $product_id;
                $product_id   = $product->get_parent_id();

                if ( empty( $variation ) ) {
                    $variation = $product->get_variation_attributes();
                }
            }

            if ( $passed_validation && false !== WC()->cart->add_to_cart( $product_id, $quantity, $variation_id, $variation ) && 'publish' === $product_status ) {
                if ( 'yes' === get_option( 'woocommerce_cart_redirect_after_add' ) ) {
                    wc_add_to_cart_message( [ $product_id => $quantity ], true );
                }

                do_action( 'woocommerce_ajax_added_to_cart', $product_id );

                WC_AJAX::get_refreshed_fragments();
            } else {
                $data = [
                        'error'       => true,
                        'product_url' => apply_filters( 'woocommerce_cart_redirect_after_error', get_permalink( $product_id ), $product_id ),
                ];

                wp_send_json( $data );
            }

            wp_die();
        }

        function action_links( $links, $file ) {
            static $plugin;

            if ( ! isset( $plugin ) ) {
                $plugin = plugin_basename( __FILE__ );
            }

            if ( $plugin === $file ) {
                $settings = '<a href="' . esc_url( admin_url( 'admin.php?page=wpclever-wooaa&tab=settings' ) ) . '">' . esc_html__( 'Settings', 'wpc-ajax-add-to-cart' ) . '</a>';
                array_unshift( $links, $settings );
            }

            return (array) $links;
        }

        function row_meta( $links, $file ) {
            static $plugin;

            if ( ! isset( $plugin ) ) {
                $plugin = plugin_basename( __FILE__ );
            }

            if ( $plugin === $file ) {
                $row_meta = [
                        'support' => '<a href="' . esc_url( WOOAA_DISCUSSION ) . '" target="_blank">' . esc_html__( 'Community support', 'wpc-ajax-add-to-cart' ) . '</a>',
                ];

                return array_merge( $links, $row_meta );
            }

            return (array) $links;
        }

        public static function get_settings() {
            return apply_filters( 'wooaa_get_settings', self::$settings );
        }

        public static function get_setting( $name, $default = false ) {
            if ( ! empty( self::$settings ) && isset( self::$settings[ $name ] ) ) {
                $setting = self::$settings[ $name ];
            } else {
                $setting = get_option( 'wooaa_' . $name, $default );
            }

            return apply_filters( 'wooaa_get_setting', $setting, $name, $default );
        }

        public static function sanitize_array( $arr ) {
            foreach ( (array) $arr as $k => $v ) {
                if ( is_array( $v ) ) {
                    $arr[ $k ] = self::sanitize_array( $v );
                } else {
                    $arr[ $k ] = sanitize_post_field( 'post_content', $v, 0, 'db' );
                }
            }

            return $arr;
        }
    }

    return WPCleverWooaa::instance();
}
