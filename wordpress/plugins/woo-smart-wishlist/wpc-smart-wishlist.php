<?php
/*
Plugin Name: WPC Smart Wishlist for WooCommerce
Plugin URI: https://wpclever.net/
Description: WPC Smart Wishlist is a simple but powerful tool that can help your customer save products for buying later.
Author: WPClever
Author URI: https://wpclever.net
Text Domain: woo-smart-wishlist
Domain Path: /languages/
Requires Plugins: woocommerce
Version: 6.2.1
Requires at least: 5.9
WC requires at least: 3.0
WC tested up to: 11.2
*/

defined( 'ABSPATH' ) || exit;

! defined( 'WOOSW_VERSION' ) && define( 'WOOSW_VERSION', '6.2.1' );
! defined( 'WOOSW_FILE' ) && define( 'WOOSW_FILE', __FILE__ );
! defined( 'WOOSW_URI' ) && define( 'WOOSW_URI', plugin_dir_url( __FILE__ ) );
! defined( 'WOOSW_DIR' ) && define( 'WOOSW_DIR', plugin_dir_path( __FILE__ ) );
! defined( 'WOOSW_SUPPORT' ) && define( 'WOOSW_SUPPORT', 'https://wpclever.net/support/?utm_source=support&utm_medium=woosw&utm_campaign=wporg' );
! defined( 'WOOSW_REVIEWS' ) && define( 'WOOSW_REVIEWS', 'https://wordpress.org/support/plugin/woo-smart-wishlist/reviews/' );
! defined( 'WOOSW_CHANGELOG' ) && define( 'WOOSW_CHANGELOG', 'https://wordpress.org/plugins/woo-smart-wishlist/#developers' );
! defined( 'WOOSW_DISCUSSION' ) && define( 'WOOSW_DISCUSSION', 'https://wordpress.org/support/plugin/woo-smart-wishlist' );

// WPC Core
require_once __DIR__ . '/includes/wpc-core/wpc-core.php';
wpc_core_register( [
        'file'    => __FILE__,
        'version' => WOOSW_VERSION,
        'prefix'  => 'woosw',
] );

// plugin activate
register_activation_hook( __FILE__, 'woosw_plugin_activate' );

// plugin init
if ( ! function_exists( 'woosw_init' ) ) {
    add_action( 'plugins_loaded', 'woosw_init', 11 );

    function woosw_init() {
        if ( ! function_exists( 'WC' ) || ! version_compare( WC()->version, '3.0', '>=' ) ) {
            add_action( 'admin_notices', 'woosw_notice_wc' );

            return null;
        }

        include_once 'includes/class-helper.php';
        include_once 'includes/class-statistics.php';

        if ( ! class_exists( 'WPCleverWoosw' ) ) {
            class WPCleverWoosw {
                protected static $instance = null;
                protected static $helper = null;

                public static function instance() {
                    if ( is_null( self::$instance ) ) {
                        self::$instance = new self();
                    }

                    return self::$instance;
                }

                public static function helper() {
                    if ( is_null( self::$helper ) ) {
                        self::$helper = Woosw_Helper::instance();
                    }

                    return self::$helper;
                }

                function __construct() {
                    // add query var
                    add_filter( 'query_vars', [ $this, 'query_vars' ], 1 );
                    add_action( 'init', [ $this, 'init' ] );

                    // menu
                    add_action( 'admin_init', [ $this, 'register_settings' ] );
                    add_filter( 'pre_update_option', [ $this, 'last_saved' ], 10, 2 );
                    add_action( 'admin_menu', [ $this, 'admin_menu' ] );

                    // my account
                    if ( Woosw_Helper::get_setting( 'page_myaccount', 'yes' ) !== 'no' ) {
                        add_filter( 'woocommerce_account_menu_items', [ $this, 'account_items' ], 99 );
                        add_action( 'woocommerce_account_wishlist_endpoint', [ $this, 'account_endpoint' ], 99 );
                    }

                    // frontend scripts
                    add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );

                    // backend scripts
                    add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );

                    // add to wishlist
                    add_action( 'template_redirect', [ $this, 'wishlist_add_by_link' ] );

                    // added to cart
                    if ( Woosw_Helper::get_setting( 'auto_remove', 'no' ) === 'yes' ) {
                        add_action( 'woocommerce_add_to_cart', [ $this, 'add_to_cart' ], 10, 2 );
                    }

                    // add
                    add_action( 'wc_ajax_woosw_add', [ $this, 'ajax_add' ] );

                    // remove
                    add_action( 'wc_ajax_woosw_remove', [ $this, 'ajax_remove' ] );

                    // empty
                    add_action( 'wc_ajax_woosw_empty', [ $this, 'ajax_empty' ] );

                    // load
                    add_action( 'wc_ajax_woosw_load', [ $this, 'ajax_load' ] );

                    // load count
                    add_action( 'wc_ajax_woosw_load_count', [ $this, 'ajax_load_count' ] );

                    // load list
                    add_action( 'wc_ajax_woosw_load_list', [ $this, 'ajax_load_list' ] );

                    // fragments
                    add_action( 'wc_ajax_woosw_get_data', [ $this, 'ajax_get_data' ] );

                    // rename
                    add_action( 'wc_ajax_woosw_rename_wishlist', [ $this, 'ajax_rename_wishlist' ] );

                    // link
                    add_filter( 'plugin_action_links', [ $this, 'action_links' ], 10, 2 );
                    add_filter( 'plugin_row_meta', [ $this, 'row_meta' ], 10, 2 );

                    // menu items
                    add_filter( 'wp_nav_menu_items', [ $this, 'nav_menu_items' ], 99, 2 );

                    // footer
                    add_action( 'wp_footer', [ $this, 'wp_footer' ] );

                    // product columns
                    add_filter( 'manage_edit-product_columns', [ $this, 'product_columns' ], 10 );
                    add_action( 'manage_product_posts_custom_column', [ $this, 'posts_custom_column' ], 10, 2 );
                    add_filter( 'manage_edit-product_sortable_columns', [ $this, 'sortable_columns' ] );
                    add_filter( 'request', [ $this, 'request' ] );

                    // quickview
                    add_action( 'wp_ajax_wishlist_quickview', [ $this, 'ajax_wishlist_quickview' ] );

                    // post states
                    add_filter( 'display_post_states', [ $this, 'display_post_states' ], 10, 2 );

                    // user login & logout
                    add_action( 'wp_login', [ $this, 'wp_login' ], 10, 2 );
                    add_action( 'wp_logout', [ $this, 'wp_logout' ] );

                    // user columns
                    add_filter( 'manage_users_columns', [ $this, 'users_columns' ] );
                    add_filter( 'manage_users_custom_column', [ $this, 'users_columns_content' ], 10, 3 );

                    // dropdown multiple
                    add_filter( 'wp_dropdown_cats', [ $this, 'dropdown_cats_multiple' ], 10, 2 );

                    // wpml
                    add_filter( 'wcml_multi_currency_ajax_actions', [ $this, 'wcml_multi_currency' ], 99 );

                    // WPC Smart Messages
                    add_filter( 'wpcsm_locations', [ $this, 'wpcsm_locations' ] );

                    // page title
                    add_filter( 'document_title_parts', [ $this, 'document_title_parts' ] );

                    // nonce check
                    add_filter( 'woosw_disable_nonce_check', function ( $check, $context ) {
                        return apply_filters( 'woosw_disable_security_check', $check, $context );
                    }, 10, 2 );
                }

                function query_vars( $vars ) {
                    $vars[] = 'woosw_id';

                    return $vars;
                }

                function document_title_parts( $title_parts ) {
                    $page_id = Woosw_Helper::get_page_id();

                    if ( $page_id && is_page( $page_id ) && ( $key = get_query_var( 'woosw_id' ) ) ) {
                        // skip if this is the primary wishlist
                        if ( Woosw_Helper::is_primary( $key ) ) {
                            return $title_parts;
                        }

                        $wishlist_name = Woosw_Helper::get_name( $key );

                        if ( ! empty( $wishlist_name ) ) {
                            $title_parts['title'] .= ' - ' . $wishlist_name;
                        }
                    }

                    return $title_parts;
                }

                function init() {
                    // load text-domain
                    load_plugin_textdomain( 'woo-smart-wishlist', false, basename( WOOSW_DIR ) . '/languages/' );

                    // get key
                    $key = Woosw_Helper::get_key();

                    // get products
                    Woosw_Helper::set_products( Woosw_Helper::get_ids( $key ) );

                    // rewrite
                    if ( $page_id = Woosw_Helper::get_page_id() ) {
                        $page_slug = get_post_field( 'post_name', $page_id );

                        if ( $page_slug !== '' ) {
                            add_rewrite_rule( '^' . $page_slug . '/([\w]+)/?', 'index.php?page_id=' . $page_id . '&woosw_id=$matches[1]', 'top' );
                            add_rewrite_rule( '(.*?)/' . $page_slug . '/([\w]+)/?', 'index.php?page_id=' . $page_id . '&woosw_id=$matches[2]', 'top' );
                        }
                    }

                    // my account page
                    if ( Woosw_Helper::get_setting( 'page_myaccount', 'yes' ) !== 'no' ) {
                        add_rewrite_endpoint( 'wishlist', EP_PAGES );
                    }

                    // ensure tables
                    Woosw_Statistics::create_tables();

                    // shortcode
                    add_shortcode( 'woosw', [ $this, 'shortcode_btn' ] );
                    add_shortcode( 'woosw_btn', [ $this, 'shortcode_btn' ] );
                    add_shortcode( 'woosw_link', [ $this, 'shortcode_link' ] );
                    add_shortcode( 'woosw_list', [ $this, 'shortcode_list' ] );
                    add_shortcode( 'woosw_table', [ $this, 'shortcode_list' ] );

                    // add button for archive
                    $button_position_archive = apply_filters( 'woosw_button_position_archive', Woosw_Helper::get_setting( 'button_position_archive', apply_filters( 'woosw_button_position_archive_default', 'after_add_to_cart' ) ) );

                    if ( ! empty( $button_position_archive ) ) {
                        switch ( $button_position_archive ) {
                            case 'before_title':
                                add_action( 'woocommerce_shop_loop_item_title', [ $this, 'add_button' ], 9 );
                                break;
                            case 'after_title':
                                add_action( 'woocommerce_shop_loop_item_title', [ $this, 'add_button' ], 11 );
                                break;
                            case 'after_rating':
                                add_action( 'woocommerce_after_shop_loop_item_title', [ $this, 'add_button' ], 6 );
                                break;
                            case 'after_price':
                                add_action( 'woocommerce_after_shop_loop_item_title', [
                                        $this,
                                        'add_button'
                                ], 11 );
                                break;
                            case 'before_add_to_cart':
                                add_action( 'woocommerce_after_shop_loop_item', [ $this, 'add_button' ], 9 );
                                break;
                            case 'after_add_to_cart':
                                add_action( 'woocommerce_after_shop_loop_item', [ $this, 'add_button' ], 11 );
                                break;
                            default:
                                add_action( 'woosw_button_position_archive_' . $button_position_archive, [
                                        $this,
                                        'add_button'
                                ] );
                        }
                    }

                    // add button for single
                    $button_position_single = apply_filters( 'woosw_button_position_single', Woosw_Helper::get_setting( 'button_position_single', apply_filters( 'woosw_button_position_single_default', '31' ) ) );

                    if ( ! empty( $button_position_single ) ) {
                        if ( is_numeric( $button_position_single ) ) {
                            add_action( 'woocommerce_single_product_summary', [
                                    $this,
                                    'add_button'
                            ], (int) $button_position_single );
                        } else {
                            add_action( 'woosw_button_position_single_' . $button_position_single, [
                                    $this,
                                    'add_button'
                            ] );
                        }
                    }
                }


                function add_to_cart( $cart_item_key, $product_id ) {
                    $key = Woosw_Helper::get_key();

                    if ( $key !== '#' ) {
                        $products = Woosw_Helper::get_ids( $key );

                        if ( array_key_exists( $product_id, $products ) ) {
                            unset( $products[ $product_id ] );
                            update_option( 'woosw_list_' . $key, $products, false );
                            Woosw_Helper::clear_internal_cache( $key );
                            self::update_product_count( $product_id, 'remove' );
                        }
                    }
                }

                function wishlist_add_by_link() {
                    if ( ! isset( $_REQUEST['add-to-wishlist'] ) && ! isset( $_REQUEST['add_to_wishlist'] ) ) {
                        return false;
                    }

                    $key        = Woosw_Helper::get_key();
                    $product_id = absint( isset( $_REQUEST['add_to_wishlist'] ) ? (int) sanitize_text_field( wp_unslash( $_REQUEST['add_to_wishlist'] ?? '' ) ) : 0 ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                    $product_id = absint( isset( $_REQUEST['add-to-wishlist'] ) ? (int) sanitize_text_field( wp_unslash( $_REQUEST['add-to-wishlist'] ?? '' ) ) : $product_id ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

                    if ( $product_id ) {
                        if ( $key !== '#' && $key !== 'WOOSW' ) {
                            $product  = wc_get_product( $product_id );
                            $products = Woosw_Helper::get_ids( $key );

                            if ( ! array_key_exists( $product_id, $products ) ) {
                                // insert if not exists
                                $products = [
                                                    $product_id => [
                                                            'time'   => time(),
                                                            'price'  => is_a( $product, 'WC_Product' ) ? $product->get_price() : 0,
                                                            'parent' => wp_get_post_parent_id( $product_id ) ?: 0,
                                                            'note'   => ''
                                                    ]
                                            ] + $products;
                                update_option( 'woosw_list_' . $key, $products, false );
                                Woosw_Helper::clear_internal_cache( $key );
                            }
                        }
                    }

                    // redirect to wishlist page
                    wp_safe_redirect( Woosw_Helper::get_url( $key, true ) );

                    return null;
                }

                function ajax_add() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'add_product' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $return  = [];
                    $req_key = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
                    if ( ! empty( $req_key ) && Woosw_Helper::can_edit( $req_key ) ) {
                        $key = $req_key;
                    } else {
                        $key = Woosw_Helper::get_key();
                    }

                    if ( ( $product_id = (int) sanitize_text_field( wp_unslash( $_POST['product_id'] ?? 0 ) ) ) > 0 ) {
                        if ( $key === '#' ) {
                            $return['status']  = 0;
                            $return['notice']  = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ) );
                            $return['content'] = self::wishlist_content( $key, Woosw_Helper::localization( 'empty_message', esc_html__( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ) ) );
                        } else {
                            $products = Woosw_Helper::get_ids( $key );

                            if ( ! array_key_exists( $product_id, $products ) ) {
                                // insert if not exists
                                $product = wc_get_product( $product_id );

                                $added_by = get_current_user_id();
                                $is_owner = Woosw_Helper::is_owner( $key );

                                $new_item = [
                                        'time'   => time(),
                                        'price'  => is_a( $product, 'WC_Product' ) ? $product->get_price() : 0,
                                        'parent' => wp_get_post_parent_id( $product_id ) ?: 0,
                                        'note'   => ''
                                ];

                                if ( ! $is_owner ) {
                                    $new_item['user_id'] = $added_by;
                                }

                                $products = [ $product_id => $new_item ] + $products;
                                update_option( 'woosw_list_' . $key, $products, false );
                                Woosw_Helper::clear_internal_cache( $key );
                                self::update_product_count( $product_id, 'add' );
                                $return['notice'] = Woosw_Helper::localization( 'added_message', esc_html__( '{name} has been added to Wishlist.', 'woo-smart-wishlist' ) );
                            } else {
                                $return['notice'] = Woosw_Helper::localization( 'already_message', esc_html__( '{name} is already in the Wishlist.', 'woo-smart-wishlist' ) );
                            }

                            $return['status'] = 1;
                            $return['count']  = count( $products );
                            $return['items']  = self::get_items( $key, 'table' );
                            $return['data']   = [
                                    'key'       => $key,
                                    'ids'       => Woosw_Helper::get_ids( $key ),
                                    'fragments' => self::get_fragments(),
                            ];

                            if ( Woosw_Helper::get_setting( 'button_action', 'list' ) === 'list' ) {
                                $return['content'] = self::wishlist_content( $key );
                            }
                        }
                    } else {
                        $product_id       = 0;
                        $return['status'] = 0;
                        $return['notice'] = Woosw_Helper::localization( 'error_message', esc_html__( 'Have an error, please try again!', 'woo-smart-wishlist' ) );
                    }

                    do_action( 'woosw_add', $product_id, $key );

                    wp_send_json( $return );
                }

                function ajax_remove() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'remove_product' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $return = [ 'status' => 0 ];
                    $key    = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );

                    if ( empty( $key ) ) {
                        $key = Woosw_Helper::get_key();
                    }

                    if ( ! Woosw_Helper::can_edit( $key ) ) {
                        $return['notice'] = Woosw_Helper::localization( 'error_message', esc_html__( 'You are not allowed to remove products from this wishlist!', 'woo-smart-wishlist' ) );
                        wp_send_json( $return );
                    }

                    if ( ( $product_id = (int) sanitize_text_field( wp_unslash( $_POST['product_id'] ?? 0 ) ) ) > 0 ) {
                        if ( $key === '#' ) {
                            $return['notice'] = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ) );
                        } else {
                            $products = Woosw_Helper::get_ids( $key );

                            if ( array_key_exists( $product_id, $products ) ) {
                                unset( $products[ $product_id ] );
                                update_option( 'woosw_list_' . $key, $products, false );
                                Woosw_Helper::clear_internal_cache( $key );
                                self::update_product_count( $product_id, 'remove' );
                                $return['count']  = count( $products );
                                $return['status'] = 1;
                                $return['notice'] = Woosw_Helper::localization( 'removed_message', esc_html__( 'Product has been removed from the Wishlist.', 'woo-smart-wishlist' ) );
                                $return['data']   = [
                                        'key'       => Woosw_Helper::get_key(),
                                        'ids'       => Woosw_Helper::get_ids(),
                                        'fragments' => self::get_fragments(),
                                ];

                                if ( empty( $products ) ) {
                                    $return['content'] = self::wishlist_content( $key, Woosw_Helper::localization( 'empty_message', esc_html__( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ) ) ) . '</div>';
                                }
                            } else {
                                $return['notice'] = Woosw_Helper::localization( 'not_exist_message', esc_html__( 'The product does not exist on the Wishlist!', 'woo-smart-wishlist' ) );
                            }
                        }
                    } else {
                        $product_id       = 0;
                        $return['notice'] = Woosw_Helper::localization( 'error_message', esc_html__( 'Have an error, please try again!', 'woo-smart-wishlist' ) );
                    }

                    do_action( 'woosw_remove', $product_id, $key );

                    wp_send_json( $return );
                }

                function ajax_empty() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'wishlist_empty' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $return = [ 'status' => 0 ];
                    $key    = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );

                    if ( empty( $key ) ) {
                        $key = Woosw_Helper::get_key();
                    }

                    if ( ! Woosw_Helper::can_edit( $key ) ) {
                        $return['notice'] = Woosw_Helper::localization( 'error_message', esc_html__( 'You are not allowed to remove products from this wishlist!', 'woo-smart-wishlist' ) );
                        wp_send_json( $return );
                    }

                    if ( $key === '#' ) {
                        $return['notice'] = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ) );
                    } else {
                        if ( ( $products = Woosw_Helper::get_ids( $key ) ) && ! empty( $products ) ) {
                            foreach ( array_keys( $products ) as $product_id ) {
                                // update count
                                self::update_product_count( $product_id, 'remove' );
                            }
                        }

                        // remove option
                        update_option( 'woosw_list_' . $key, [], false );
                        Woosw_Helper::clear_internal_cache( $key );
                        $return['status']  = 1;
                        $return['count']   = 0;
                        $return['notice']  = Woosw_Helper::localization( 'empty_notice', esc_html__( 'All products have been removed from the Wishlist!', 'woo-smart-wishlist' ) );
                        $return['content'] = self::wishlist_content( $key, Woosw_Helper::localization( 'empty_message', esc_html__( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ) ) );
                        $return['data']    = [
                                'key'       => Woosw_Helper::get_key(),
                                'ids'       => Woosw_Helper::get_ids(),
                                'fragments' => self::get_fragments(),
                        ];
                    }

                    do_action( 'woosw_empty', $key );

                    wp_send_json( $return );
                }

                function ajax_load() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'wishlist_load' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $return = [ 'status' => 0 ];
                    $key    = Woosw_Helper::get_key();

                    if ( $key === '#' ) {
                        $return['notice']  = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use Wishlist!', 'woo-smart-wishlist' ) );
                        $return['content'] = self::wishlist_content( $key, Woosw_Helper::localization( 'empty_message', esc_html__( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ) ) );
                    } else {
                        $products          = Woosw_Helper::get_ids( $key );
                        $return['status']  = 1;
                        $return['count']   = count( $products );
                        $return['content'] = self::wishlist_content( $key );
                        $return['data']    = [
                                'key'       => Woosw_Helper::get_key(),
                                'ids'       => Woosw_Helper::get_ids(),
                                'fragments' => self::get_fragments(),
                        ];
                    }

                    do_action( 'woosw_load', $key );

                    wp_send_json( $return );
                }

                function ajax_load_count() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'load_count' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $return = [ 'status' => 0, 'count' => 0 ];
                    $key    = Woosw_Helper::get_key();

                    if ( $key === '#' ) {
                        $return['notice'] = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use Wishlist!', 'woo-smart-wishlist' ) );
                    } else {
                        $products         = Woosw_Helper::get_ids( $key );
                        $return['status'] = 1;
                        $return['count']  = count( $products );
                    }

                    wp_send_json( $return );
                }

                function ajax_load_list() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'load_list' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $req_key = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
                    if ( ! empty( $req_key ) && Woosw_Helper::can_edit( $req_key ) ) {
                        $key = $req_key;
                    } else {
                        $key = Woosw_Helper::get_key();
                    }

                    if ( $key === '#' ) {
                        $return['list'] = '<div class="woosw-list">' . Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use Wishlist!', 'woo-smart-wishlist' ) ) . '</div>';
                    } else {
                        $return['list'] = self::get_list( $key );
                    }

                    wp_send_json( $return );
                }

                function ajax_get_data() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'get_data' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    $data = [
                            'key'       => Woosw_Helper::get_key(),
                            'ids'       => Woosw_Helper::get_ids(),
                            'fragments' => self::get_fragments(),
                    ];

                    wp_send_json( $data );
                }

                function ajax_rename_wishlist() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'rename_wishlist' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }


                    $key  = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
                    $name = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );

                    if ( empty( $key ) || strlen( $name ) === 0 ) {
                        wp_send_json( [
                                'status' => 0,
                                'notice' => esc_html__( 'Wishlist name cannot be empty.', 'woo-smart-wishlist' ),
                        ] );
                    }

                    // Only the original creator (owner) can rename — collab members, guests, and other users are all blocked
                    if ( ! Woosw_Helper::is_owner( $key ) ) {
                        wp_send_json( [
                                'status' => 0,
                                'notice' => esc_html__( 'You are not allowed to rename this wishlist.', 'woo-smart-wishlist' ),
                        ] );
                    }

                    $name    = substr( $name, 0, 200 );
                    $user_id = get_current_user_id();

                    if ( $user_id ) {
                        $keys = Woosw_Helper::get_user_keys( $user_id );

                        if ( ! is_array( $keys ) || ! isset( $keys[ $key ] ) ) {
                            wp_send_json( [
                                    'status' => 0,
                                    'notice' => esc_html__( 'Wishlist not found.', 'woo-smart-wishlist' ),
                            ] );
                        }

                        $keys[ $key ]['name'] = $name;
                        update_user_meta( $user_id, 'woosw_keys', $keys );
                    } else {
                        update_option( 'woosw_name_' . $key, $name, false );
                    }

                    wp_send_json( [
                            'status' => 1,
                            'name'   => $name,
                            'notice' => esc_html__( 'Wishlist renamed successfully.', 'woo-smart-wishlist' ),
                    ] );
                }

                function add_button() {
                    echo do_shortcode( '[woosw]' );
                }

                function shortcode_btn( $attrs ) {
                    $output = $product_name = $product_image = '';

                    $attrs = shortcode_atts( [
                            'id'   => null,
                            'type' => Woosw_Helper::get_setting( 'button_type', 'button' )
                    ], $attrs, 'woosw' );

                    if ( ! $attrs['id'] ) {
                        global $product;

                        if ( $product && is_a( $product, 'WC_Product' ) ) {
                            $attrs['id']      = $product->get_id();
                            $product_name     = $product->get_name();
                            $product_image_id = $product->get_image_id();
                            $product_image    = wp_get_attachment_image_url( $product_image_id );
                        }
                    } else {
                        if ( $_product = wc_get_product( $attrs['id'] ) ) {
                            $product_name     = $_product->get_name();
                            $product_image_id = $_product->get_image_id();
                            $product_image    = wp_get_attachment_image_url( $product_image_id );
                        }
                    }

                    if ( $attrs['id'] ) {
                        // check cats
                        $selected_cats = Woosw_Helper::get_setting( 'cats', [] );

                        if ( ! empty( $selected_cats ) && ( $selected_cats[0] !== '0' ) ) {
                            if ( ! has_term( $selected_cats, 'product_cat', $attrs['id'] ) ) {
                                return '';
                            }
                        }

                        $class = 'woosw-btn woosw-btn-' . esc_attr( $attrs['id'] );

                        if ( array_key_exists( $attrs['id'], Woosw_Helper::get_products() ) || in_array( $attrs['id'], array_column( Woosw_Helper::get_products(), 'parent' ) ) ) {
                            $class .= ' woosw-added';
                            $icon  = apply_filters( 'woosw_button_added_icon', Woosw_Helper::get_setting( 'button_added_icon', 'woosw-icon-8' ) );
                            $text  = apply_filters( 'woosw_button_text_added', Woosw_Helper::localization( 'button_added', esc_html__( 'Browse wishlist', 'woo-smart-wishlist' ) ) );
                        } else {
                            $icon = apply_filters( 'woosw_button_normal_icon', Woosw_Helper::get_setting( 'button_normal_icon', 'woosw-icon-5' ) );
                            $text = apply_filters( 'woosw_button_text', Woosw_Helper::localization( 'button', esc_html__( 'Add to wishlist', 'woo-smart-wishlist' ) ) );
                        }

                        if ( Woosw_Helper::get_setting( 'button_class', '' ) !== '' ) {
                            $class .= ' ' . esc_attr( Woosw_Helper::get_setting( 'button_class' ) );
                        }

                        $button_icon = Woosw_Helper::get_setting( 'button_icon', 'no' );

                        if ( $button_icon !== 'no' ) {
                            $class .= ' woosw-btn-has-icon';

                            if ( $button_icon === 'left' ) {
                                $class .= ' woosw-btn-icon-text';
                                $btn   = '<span class="woosw-btn-icon ' . esc_attr( $icon ) . '"></span><span class="woosw-btn-text">' . esc_html( $text ) . '</span>';
                            } elseif ( $button_icon === 'right' ) {
                                $class .= ' woosw-btn-text-icon';
                                $btn   = '<span class="woosw-btn-text">' . esc_html( $text ) . '</span><span class="woosw-btn-icon ' . esc_attr( $icon ) . '"></span>';
                            } else {
                                $class .= ' woosw-btn-icon-only';
                                $btn   = '<span class="woosw-btn-icon ' . esc_attr( $icon ) . '"></span>';
                            }
                        } else {
                            $btn = $text;
                        }

                        $extra_attrs = '';

                        if ( ! is_user_logged_in() && ( Woosw_Helper::get_setting( 'disable_unauthenticated', 'no' ) === 'yes' ) ) {
                            $class        .= ' woosw-disabled';
                            $login_notice = Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ) );
                            $extra_attrs  .= ' disabled="disabled" title="' . esc_attr( $login_notice ) . '" alt="' . esc_attr( $login_notice ) . '"';
                        }

                        if ( $attrs['type'] === 'link' ) {
                            $output = '<a href="' . esc_url( '?add-to-wishlist=' . $attrs['id'] ) . '" class="' . esc_attr( $class ) . '" data-id="' . esc_attr( $attrs['id'] ) . '" data-product_name="' . esc_attr( $product_name ) . '" data-product_image="' . esc_attr( $product_image ) . '" rel="' . esc_attr( apply_filters( 'woosw_button_rel', 'nofollow' ) ) . '" aria-label="' . esc_attr( $text ) . '"' . $extra_attrs . '>' . $btn . '</a>';
                        } else {
                            $output = '<button class="' . esc_attr( $class ) . '" data-id="' . esc_attr( $attrs['id'] ) . '" data-product_name="' . esc_attr( $product_name ) . '" data-product_image="' . esc_attr( $product_image ) . '" aria-label="' . esc_attr( $text ) . '"' . $extra_attrs . '>' . $btn . '</button>';
                        }
                    }

                    return wp_kses_post( apply_filters( 'woosw_button_html', $output, $attrs['id'], $attrs ) );
                }

                function shortcode_link( $attrs ) {
                    $attrs = shortcode_atts( [
                            'type'  => 'auto',
                            'label' => Woosw_Helper::localization( 'link_label', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) )
                    ], $attrs, 'woosw_link' );

                    $output = '<span class="' . esc_attr( 'woosw-link woosw-link-' . $attrs['type'] ) . '"><a href="' . esc_url( Woosw_Helper::get_url() ) . '"><span class="woosw-link-inner" data-count="' . esc_attr( Woosw_Helper::get_count() ) . '">' . esc_html( $attrs['label'] ) . '</span></a></span>';

                    return apply_filters( 'woosw_link_html', $output, $attrs );
                }

                function shortcode_list( $attrs ) {
                    $attrs = shortcode_atts( [
                            'key'  => null,
                            'ajax' => 'no'
                    ], $attrs, 'woosw_list' );

                    if ( wc_string_to_bool( $attrs['ajax'] ) ) {
                        $return_html = '<div class="woosw-list-ajax"></div>';
                    } else {
                        if ( ! empty( $attrs['key'] ) ) {
                            $key = $attrs['key'];
                        } else {
                            if ( get_query_var( 'woosw_id' ) ) {
                                $key = get_query_var( 'woosw_id' );
                            } elseif ( ! empty( $_REQUEST['wid'] ) ) {
                                $key = sanitize_text_field( wp_unslash( $_REQUEST['wid'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                            } elseif ( ! empty( $_REQUEST['wl'] ) ) {
                                $key = sanitize_text_field( wp_unslash( $_REQUEST['wl'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                            } else {
                                $key = Woosw_Helper::get_key();
                            }
                        }

                        $return_html = self::get_list( $key );
                    }

                    return apply_filters( 'woosw_list_html', $return_html, $attrs );
                }

                function get_list( $key ) {
                    $is_valid = false;
                    if ( get_option( 'woosw_list_' . $key ) !== false ) {
                        $is_valid = true;
                    } else {
                        $owner_id = Woosw_Helper::get_owner_id( $key );
                        if ( $owner_id ) {
                            $owner_keys = get_user_meta( $owner_id, 'woosw_keys', true ) ?: [];
                            if ( isset( $owner_keys[ $key ] ) ) {
                                $is_valid = true;
                            }
                        } elseif ( ! is_user_logged_in() && isset( $_COOKIE['woosw_key'] ) && $_COOKIE['woosw_key'] === $key ) {
                            $is_valid = true;
                        } elseif ( $key === 'WOOSW' ) {
                            $is_valid = true;
                        }
                    }

                    if ( ! $is_valid ) {
                        return '<div class="woosw-list woosw-list-not-found" data-key="' . esc_attr( $key ) . '"><div class="woosw-empty">' . esc_html__( 'This wishlist does not exist.', 'woo-smart-wishlist' ) . '</div></div>';
                    }

                    $return_html = '<div class="woosw-list" data-key="' . esc_attr( $key ) . '">';

                    $add_collab_btn = '';
                    if ( Woosw_Helper::is_follow_enabled() && ! Woosw_Helper::is_owner( $key ) ) {
                        $is_added = false;
                        if ( is_user_logged_in() ) {
                            $user_keys = Woosw_Helper::get_user_keys();
                            if ( is_array( $user_keys ) && isset( $user_keys[ $key ] ) ) {
                                $is_added = true;
                            }
                        }

                        if ( $is_added ) {
                            $add_collab_btn = '<button type="button" class="woosw-add-collab-btn button is-added" data-key="' . esc_attr( $key ) . '"><span class="woosw-add-collab-icon">&#215;</span> ' . esc_html__( 'Unfollow', 'woo-smart-wishlist' ) . '</button>';
                        } else {
                            $add_collab_btn = '<button type="button" class="woosw-add-collab-btn button" data-key="' . esc_attr( $key ) . '"><span class="woosw-add-collab-icon">+</span> ' . esc_html__( 'Follow', 'woo-smart-wishlist' ) . '</button>';
                        }
                    }

                    $rename_btn = '';
                    if ( Woosw_Helper::is_owner( $key ) ) {
                        $display_name = Woosw_Helper::get_name( $key );
                        $rename_btn   = ' <button type="button" class="woosw-detail-rename-btn" data-key="' . esc_attr( $key ) . '" data-name="' . esc_attr( $display_name ) . '" title="' . esc_attr__( 'Rename', 'woo-smart-wishlist' ) . '">&#9998;</button>';
                    }

                    $name_html = '<div class="woosw-name-wrapper"><div class="woosw-name woosw-detail-name-wrap" data-key="' . esc_attr( $key ) . '">' . esc_html( Woosw_Helper::get_name( $key ) ) . $rename_btn . '</div>' . $add_collab_btn . '</div>';


                    $switcher_dropdown = '';

                    if ( Woosw_Helper::is_multiple_enabled() && ( $user_id = get_current_user_id() ) ) {
                        $keys = Woosw_Helper::get_user_keys( $user_id );

                        if ( is_array( $keys ) && ( count( $keys ) > 1 ) && isset( $keys[ $key ] ) ) {
                            $switcher_dropdown .= '<select class="woosw-switcher-dropdown">';

                            foreach ( $keys as $k => $wl ) {
                                if ( ! Woosw_Helper::is_follow_enabled() && isset( $wl['type'] ) && in_array( $wl['type'], [
                                                'collab',
                                                'follow'
                                        ], true ) ) {
                                    continue;
                                }

                                if ( isset( $wl['type'] ) && in_array( $wl['type'], [ 'collab', 'follow' ], true ) ) {
                                    if ( get_option( 'woosw_list_' . $k ) === false ) {
                                        continue;
                                    }
                                }
                                $products = Woosw_Helper::get_ids( $k );
                                $count    = count( $products );

                                $wl_name = Woosw_Helper::get_name( $k );
                                if ( isset( $wl['type'] ) && in_array( $wl['type'], [ 'collab', 'follow' ], true ) ) {
                                    $wl_name .= ' (' . esc_html__( 'Followed', 'woo-smart-wishlist' ) . ')';
                                }
                                $switcher_dropdown .= '<option value="' . esc_url( Woosw_Helper::get_url( $k, true ) ) . '" data-key="' . esc_attr( $k ) . '" ' . selected( $key, $k, false ) . '>' . esc_html( $wl_name ) . ' (' . $count . ')</option>';
                            }

                            $switcher_dropdown .= '</select>';
                        }
                    }

                    $return_html .= '<div class="woosw-switcher">' . $name_html . $switcher_dropdown . '</div>';

                    if ( Woosw_Helper::is_collabable_enabled() ) {
                        $is_owner      = Woosw_Helper::is_owner( $key );
                        $is_collabable = Woosw_Helper::is_collabable( $key );

                        if ( $is_owner ) {
                            $toggle_html = '<div class="woosw-collabable-toggle">';
                            $toggle_html .= '<label class="woosw-collabable-switch">';
                            $toggle_html .= '<input type="checkbox" class="woosw-collabable-checkbox" data-key="' . esc_attr( $key ) . '" ' . checked( $is_collabable, true, false ) . '/>';
                            $toggle_html .= '<span class="woosw-collabable-slider"></span>';
                            $toggle_html .= '</label>';
                            $toggle_html .= '<span class="woosw-collabable-label">' . Woosw_Helper::localization( 'collab_label', esc_html__( 'Allow collaboration (any logged-in user with the link can add or remove items)', 'woo-smart-wishlist' ) ) . '</span>';
                            $toggle_html .= '</div>';

                            $return_html .= apply_filters( 'woosw_collabable_toggle_html', $toggle_html, $key, $is_collabable );
                        }

                        if ( Woosw_Helper::can_edit( $key ) ) {
                            $search_class = 'woosw-search-product-wrap';
                            if ( ! $is_collabable && $is_owner ) {
                                $search_class .= ' woosw-hidden';
                            }

                            $search_html = '<div class="' . esc_attr( $search_class ) . '" data-key="' . esc_attr( $key ) . '">';
                            $search_html .= '<div class="woosw-search-product-inner">';
                            $search_html .= '<span class="woosw-search-product-icon"></span>';
                            $search_html .= '<input type="text" class="woosw-search-product-input" placeholder="' . esc_attr( Woosw_Helper::localization( 'search_products_placeholder', esc_html__( 'Search products to add...', 'woo-smart-wishlist' ) ) ) . '" autocomplete="off"/>';
                            $search_html .= '<span class="woosw-search-product-clear"></span>';
                            $search_html .= '<span class="woosw-search-product-loading"></span>';
                            $search_html .= '</div>';
                            $search_html .= '<div class="woosw-search-product-results"></div>';
                            $search_html .= '</div>';

                            $return_html .= apply_filters( 'woosw_collabable_search_html', $search_html, $key );
                        }
                    }

                    $return_html .= self::get_items( $key, 'table' );

                    if ( apply_filters( 'woosw_show_actions_for_empty_wishlist', false ) || Woosw_Helper::get_count( $key ) ) {
                        $share_url   = Woosw_Helper::get_url( $key, true );
                        $return_html .= '<div class="woosw-actions">';

                        if ( Woosw_Helper::get_setting( 'page_share', 'yes' ) === 'yes' ) {
                            $facebook  = esc_html__( 'Facebook', 'woo-smart-wishlist' );
                            $twitter   = esc_html__( 'Twitter', 'woo-smart-wishlist' );
                            $pinterest = esc_html__( 'Pinterest', 'woo-smart-wishlist' );
                            $mail      = esc_html__( 'Mail', 'woo-smart-wishlist' );

                            if ( Woosw_Helper::get_setting( 'page_icon', 'yes' ) === 'yes' ) {
                                $facebook = $twitter = $pinterest = $mail = "<i class='woosw-icon'></i>";
                            }

                            $share_html  = '';
                            $share_items = Woosw_Helper::get_setting( 'page_items' );

                            if ( ! empty( $share_items ) ) {
                                $share_url_e = urlencode( $share_url );

                                $share_html .= '<div class="woosw-share">';
                                $share_html .= '<span class="woosw-share-label">' . esc_html__( 'Share on:', 'woo-smart-wishlist' ) . '</span>';
                                $share_html .= ( in_array( 'facebook', $share_items ) ) ? '<a class="woosw-share-facebook" href="https://www.facebook.com/sharer.php?u=' . $share_url_e . '" target="_blank">' . $facebook . '</a>' : '';
                                $share_html .= ( in_array( 'twitter', $share_items ) ) ? '<a class="woosw-share-twitter" href="https://twitter.com/share?url=' . $share_url_e . '" target="_blank">' . $twitter . '</a>' : '';
                                $share_html .= ( in_array( 'pinterest', $share_items ) ) ? '<a class="woosw-share-pinterest" href="https://pinterest.com/pin/create/button/?url=' . $share_url_e . '" target="_blank">' . $pinterest . '</a>' : '';
                                $share_html .= ( in_array( 'mail', $share_items ) ) ? '<a class="woosw-share-mail" href="mailto:?body=' . $share_url_e . '" target="_blank">' . $mail . '</a>' : '';
                                $share_html .= '</div><!-- /woosw-share -->';
                            }

                            $return_html .= apply_filters( 'woosw_page_share_html', $share_html, $share_items, $share_url );
                        }

                        if ( Woosw_Helper::get_setting( 'page_copy', 'yes' ) === 'yes' ) {
                            $copy_html = '<div class="woosw-copy">';
                            $copy_html .= '<span class="woosw-copy-label">' . esc_html__( 'Wishlist link:', 'woo-smart-wishlist' ) . '</span>';
                            $copy_html .= apply_filters( 'woosw_page_copy_url', '<span class="woosw-copy-url"><input id="woosw_copy_url" type="url" value="' . esc_attr( $share_url ) . '" readonly/></span>' );
                            $copy_html .= apply_filters( 'woosw_page_copy_btn', '<span class="woosw-copy-btn"><button id="woosw_copy_btn" type="button" class="button">' . esc_html__( 'Copy', 'woo-smart-wishlist' ) . '</button></span>' );
                            $copy_html .= '</div><!-- /woosw-copy -->';

                            $return_html .= apply_filters( 'woosw_page_copy_html', $copy_html, $share_url );
                        }

                        $return_html .= '</div><!-- /woosw-actions -->';
                    }

                    $return_html .= '</div><!-- /woosw-list -->';

                    return apply_filters( 'woosw_get_list', $return_html, $key );
                }

                function register_settings() {
                    // settings
                    register_setting( 'woosw_settings', 'woosw_settings', [
                            'type'              => 'array',
                            'sanitize_callback' => [ $this, 'sanitize_array' ],
                    ] );

                    // localization
                    register_setting( 'woosw_localization', 'woosw_localization', [
                            'type'              => 'array',
                            'sanitize_callback' => [ $this, 'sanitize_array' ],
                    ] );
                }

                function last_saved( $value, $option ) {
                    if ( $option == 'woosw_settings' || $option == 'woosw_localization' ) {
                        $value['_last_saved']    = current_time( 'timestamp' );
                        $value['_last_saved_by'] = get_current_user_id();
                    }

                    return $value;
                }

                function admin_menu() {
                    add_submenu_page( 'wpclever', 'WPC Smart Wishlist', 'Smart Wishlist', 'manage_options', 'wpclever-woosw', [
                            $this,
                            'admin_menu_content'
                    ] );
                }

                function admin_menu_content() {
                    $active_tab  = sanitize_key( wp_unslash( $_GET['tab'] ?? 'settings' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                    $title_badge = esc_html__( 'Settings', 'woo-smart-wishlist' );
                    if ( $active_tab === 'localization' ) {
                        $title_badge = esc_html__( 'Localization', 'woo-smart-wishlist' );
                    } elseif ( $active_tab === 'statistics' ) {
                        $title_badge = esc_html__( 'Statistics', 'woo-smart-wishlist' );
                    } elseif ( $active_tab === 'premium' ) {
                        $title_badge = esc_html__( 'Premium', 'woo-smart-wishlist' );
                    }
                    ?>
                    <div class="wrap woosw-settings-wrap">
                        <div class="woosw-settings-header">
                            <div class="woosw-settings-header-inner">
                                <div class="woosw-header-left">
                                    <div class="woosw-logo">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                                             stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h1>
                                            <?php echo esc_html__( 'WPC Smart Wishlist', 'woo-smart-wishlist' ) . ' ' . esc_html( WOOSW_VERSION ); ?>
                                            <?php if ( defined( 'WOOSW_PREMIUM' ) ) : ?>
                                                <span class="premium"><?php esc_html_e( 'Premium', 'woo-smart-wishlist' ); ?></span>
                                            <?php endif; ?>
                                        </h1>
                                        <p class="woosw-tagline">
                                            <?php esc_html_e( 'A powerful tool to help customers save products for buying later.', 'woo-smart-wishlist' ); ?>
                                        </p>
                                    </div>
                                </div>
                                <div class="woosw-settings-status-badge">
                                    <?php echo esc_html( $title_badge ); ?>
                                </div>
                            </div>
                        </div>

                        <div class="woosw-admin-nav">
                            <div class="woosw-nav-container">
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=settings' ) ); ?>"
                                   class="woosw-nav-item <?php echo $active_tab === 'settings' ? 'active' : ''; ?>">
                                    <?php esc_html_e( 'Settings', 'woo-smart-wishlist' ); ?>
                                </a>
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=localization' ) ); ?>"
                                   class="woosw-nav-item <?php echo $active_tab === 'localization' ? 'active' : ''; ?>">
                                    <?php esc_html_e( 'Localization', 'woo-smart-wishlist' ); ?>
                                </a>
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=statistics' ) ); ?>"
                                   class="woosw-nav-item <?php echo $active_tab === 'statistics' ? 'active' : ''; ?>">
                                    <?php esc_html_e( 'Statistics', 'woo-smart-wishlist' ); ?>
                                </a>
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=premium' ) ); ?>"
                                   class="woosw-nav-item wpc-premium <?php echo $active_tab === 'premium' ? 'active' : ''; ?>">
                                    <?php esc_html_e( 'Premium Version', 'woo-smart-wishlist' ); ?>
                                </a>
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wpclever-kit' ) ); ?>"
                                   class="woosw-nav-item">
                                    <?php esc_html_e( 'Essential Kit', 'woo-smart-wishlist' ); ?>
                                </a>
                            </div>
                        </div>

                        <?php if ( isset( $_GET['settings-updated'] ) && sanitize_text_field( wp_unslash( $_GET['settings-updated'] ?? '' ) ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
                            <div class="notice notice-success is-dismissible">
                                <p><?php esc_html_e( 'Settings updated.', 'woo-smart-wishlist' ); ?></p>
                            </div>
                        <?php endif; ?>

                        <div class="woosw-settings-page-content">
                            <?php if ( $active_tab === 'settings' ) {
                                if ( isset( $_REQUEST['settings-updated'] ) && ( sanitize_text_field( wp_unslash( $_REQUEST['settings-updated'] ) ) === 'true' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                                    flush_rewrite_rules();
                                }

                                $disable_unauthenticated = Woosw_Helper::get_setting( 'disable_unauthenticated', 'no' );
                                $auto_remove             = Woosw_Helper::get_setting( 'auto_remove', 'no' );
                                $reload_count            = Woosw_Helper::get_setting( 'reload_count', 'no' );
                                $variations              = Woosw_Helper::get_setting( 'variations', 'yes' );
                                $enable_statistics       = Woosw_Helper::get_setting( 'enable_statistics', 'yes' );
                                $enable_multiple         = Woosw_Helper::get_setting( 'enable_multiple', 'no' );
                                $choose_wishlist         = Woosw_Helper::get_setting( 'choose_wishlist', 'no' );
                                $button_type             = Woosw_Helper::get_setting( 'button_type', 'button' );
                                $button_icon             = Woosw_Helper::get_setting( 'button_icon', 'no' );
                                $button_normal_icon      = Woosw_Helper::get_setting( 'button_normal_icon', 'woosw-icon-5' );
                                $button_added_icon       = Woosw_Helper::get_setting( 'button_added_icon', 'woosw-icon-8' );
                                $button_loading_icon     = Woosw_Helper::get_setting( 'button_loading_icon', 'woosw-icon-4' );
                                $button_action           = Woosw_Helper::get_setting( 'button_action', 'list' );
                                $message_position        = Woosw_Helper::get_setting( 'message_position', 'right-top' );
                                $button_action_added     = Woosw_Helper::get_setting( 'button_action_added', 'popup' );
                                $popup_position          = Woosw_Helper::get_setting( 'popup_position', 'center' );
                                $perfect_scrollbar       = Woosw_Helper::get_setting( 'perfect_scrollbar', 'yes' );
                                $link                    = Woosw_Helper::get_setting( 'link', 'yes' );
                                $use_note                = Woosw_Helper::get_setting( 'use_note', 'yes' );
                                $show_note               = Woosw_Helper::get_setting( 'show_note', 'no' );
                                $show_price_change       = Woosw_Helper::get_setting( 'show_price_change', 'no' );
                                $empty_button            = Woosw_Helper::get_setting( 'empty_button', 'no' );
                                $popup_search            = Woosw_Helper::get_setting( 'popup_search', 'no' );
                                $suggested               = Woosw_Helper::get_setting( 'suggested', [] );
                                $suggested_limit         = Woosw_Helper::get_setting( 'suggested_limit', 0 );
                                $page_share              = Woosw_Helper::get_setting( 'page_share', 'yes' );
                                $page_icon               = Woosw_Helper::get_setting( 'page_icon', 'yes' );
                                $page_copy               = Woosw_Helper::get_setting( 'page_copy', 'yes' );
                                $page_myaccount          = Woosw_Helper::get_setting( 'page_myaccount', 'yes' );
                                $menu_action             = Woosw_Helper::get_setting( 'menu_action', 'open_page' );
                                ?>
                                <form method="post" action="options.php">
                                    <?php settings_fields( 'woosw_settings' ); ?>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'General', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'General settings for wishlist behavior and data.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Disable for unauthenticated users', 'woo-smart-wishlist' ); ?>
                                                </th>
                                                <td>
                                                    <label> <select name="woosw_settings[disable_unauthenticated]">
                                                            <option value="yes" <?php selected( $disable_unauthenticated, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $disable_unauthenticated, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Auto remove', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[auto_remove]">
                                                            <option value="yes" <?php selected( $auto_remove, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $auto_remove, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Auto remove product from the wishlist after adding to the cart.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Reload the count', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[reload_count]">
                                                            <option value="yes" <?php selected( $reload_count, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $reload_count, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Reload the count when opening the page?', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Wishlist variations', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[variations]">
                                                            <option value="yes" <?php selected( $variations, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $variations, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Wishlist selected variation instead of the main variable product.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Enable statistics', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[enable_statistics]">
                                                            <option value="yes" <?php selected( $enable_statistics, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $enable_statistics, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'When enabled, add or delete operations will be recorded in the wpc_wishlist_stats table in your database, and you can track detailed statistics over time on the Statistics tab.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title">
                                            <?php esc_html_e( 'Multiple Wishlist', 'woo-smart-wishlist' ); ?>
                                            <?php if ( ! defined( 'WOOSW_PREMIUM' ) ) : ?>
                                                <span class="woosw-badge-pro"><?php esc_html_e( 'Premium', 'woo-smart-wishlist' ); ?></span>
                                            <?php endif; ?>
                                        </h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Allow customers to create and manage multiple wishlists.', 'woo-smart-wishlist' ); ?></p>
                                        <?php if ( ! defined( 'WOOSW_PREMIUM' ) ) : ?>
                                            <div class="woosw-card-notice woosw-card-notice--premium">
                                                <div class="woosw-card-notice-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                </div>
                                                <div class="woosw-card-notice-content">
                                                    <?php
                                                    echo wp_kses_post( sprintf(
                                                        /* translators: %s: Link to premium version */
                                                        esc_html__( 'This feature is only available on the %s.', 'woo-smart-wishlist' ),
                                                        '<a href="' . esc_url( 'https://wpclever.net/downloads/smart-wishlist/' ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Premium Version', 'woo-smart-wishlist' ) . '</a>'
                                                    ) );
                                                    ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Enable', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[enable_multiple]"
                                                                    class="woosw_enable_multiple">
                                                            <option value="yes" <?php selected( $enable_multiple, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $enable_multiple, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Enable/disable multiple wishlist.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr class="woosw_multiple_row">
                                                <th scope="row"><?php esc_html_e( 'Maximum wishlists per user', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="number" min="1" max="100"
                                                               name="woosw_settings[maximum_wishlists]"
                                                               value="<?php echo esc_attr( Woosw_Helper::get_setting( 'maximum_wishlists', '5' ) ); ?>"/>
                                                    </label>
                                                    <span class="description"><?php esc_html_e( 'The maximum number of wishlists a user can create (does not include followed wishlists).', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr class="woosw_multiple_row">
                                                <th scope="row"><?php esc_html_e( 'Choose wishlist when adding', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[choose_wishlist]">
                                                            <option value="yes" <?php selected( $choose_wishlist, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $choose_wishlist, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Show a popup to choose which wishlist when adding a product. Only works when the user has more than one wishlist. If disabled, products will be added to the default wishlist set by the user in Manage wishlists.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr class="woosw_multiple_row">
                                                <th scope="row"><?php esc_html_e( 'Follow', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php $enable_follow = Woosw_Helper::get_setting( 'enable_follow', 'no' ); ?>
                                                    <label> <select name="woosw_settings[enable_follow]">
                                                            <option value="yes" <?php selected( $enable_follow, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $enable_follow, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span class="description"><?php esc_html_e( 'Allow users to follow others\' wishlists.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr class="woosw_multiple_row">
                                                <th scope="row"><?php esc_html_e( 'Collaboration', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php $enable_collab = Woosw_Helper::get_setting( 'enable_collab', 'no' ); ?>
                                                    <label> <select name="woosw_settings[enable_collab]">
                                                            <option value="yes" <?php selected( $enable_collab, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $enable_collab, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span class="description"><?php esc_html_e( 'Enable collaboration feature for wishlists.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Button', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Settings for "Add to wishlist" button.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Type', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[button_type]">
                                                            <option value="button" <?php selected( $button_type, 'button' ); ?>>
                                                                <?php esc_html_e( 'Button', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="link" <?php selected( $button_type, 'link' ); ?>>
                                                                <?php esc_html_e( 'Link', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Use icon', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <select name="woosw_settings[button_icon]"
                                                                class="woosw_button_icon">
                                                            <option value="left" <?php selected( $button_icon, 'left' ); ?>>
                                                                <?php esc_html_e( 'Icon on the left', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="right" <?php selected( $button_icon, 'right' ); ?>>
                                                                <?php esc_html_e( 'Icon on the right', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="only" <?php selected( $button_icon, 'only' ); ?>>
                                                                <?php esc_html_e( 'Icon only', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $button_icon, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr class="woosw-show-if-button-icon">
                                                <th><?php esc_html_e( 'Normal icon', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <select name="woosw_settings[button_normal_icon]"
                                                                class="woosw_icon_picker">
                                                            <?php for ( $i = 1; $i <= 41; $i ++ ) {
                                                                echo '<option value="woosw-icon-' . absint( $i ) . '" ' . selected( $button_normal_icon, 'woosw-icon-' . absint( $i ), false ) . '>woosw-icon-' . absint( $i ) . '</option>';
                                                            } ?>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr class="woosw-show-if-button-icon">
                                                <th><?php esc_html_e( 'Added icon', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <select name="woosw_settings[button_added_icon]"
                                                                class="woosw_icon_picker">
                                                            <?php for ( $i = 1; $i <= 41; $i ++ ) {
                                                                echo '<option value="woosw-icon-' . absint( $i ) . '" ' . selected( $button_added_icon, 'woosw-icon-' . absint( $i ), false ) . '>woosw-icon-' . absint( $i ) . '</option>';
                                                            } ?>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr class="woosw-show-if-button-icon">
                                                <th><?php esc_html_e( 'Loading icon', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <select name="woosw_settings[button_loading_icon]"
                                                                class="woosw_icon_picker">
                                                            <?php for ( $i = 1; $i <= 41; $i ++ ) {
                                                                echo '<option value="woosw-icon-' . absint( $i ) . '" ' . selected( $button_loading_icon, 'woosw-icon-' . absint( $i ), false ) . '>woosw-icon-' . absint( $i ) . '</option>';
                                                            } ?>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Action', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <select name="woosw_settings[button_action]"
                                                                class="woosw_button_action">
                                                            <option value="message" <?php selected( $button_action, 'message' ); ?>>
                                                                <?php esc_html_e( 'Show message', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="list" <?php selected( $button_action, 'list' ); ?>>
                                                                <?php esc_html_e( 'Open wishlist popup', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $button_action, 'no' ); ?>>
                                                                <?php esc_html_e( 'Add to wishlist solely', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Action triggered by clicking on the wishlist button.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr class="woosw_button_action_hide woosw_button_action_message">
                                                <th scope="row"><?php esc_html_e( 'Message position', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[message_position]">
                                                            <option value="right-top" <?php selected( $message_position, 'right-top' ); ?>>
                                                                <?php esc_html_e( 'right-top', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="right-bottom" <?php selected( $message_position, 'right-bottom' ); ?>>
                                                                <?php esc_html_e( 'right-bottom', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="fluid-top" <?php selected( $message_position, 'fluid-top' ); ?>>
                                                                <?php esc_html_e( 'center-top', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="fluid-bottom" <?php selected( $message_position, 'fluid-bottom' ); ?>>
                                                                <?php esc_html_e( 'center-bottom', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="left-top" <?php selected( $message_position, 'left-top' ); ?>>
                                                                <?php esc_html_e( 'left-top', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="left-bottom" <?php selected( $message_position, 'left-bottom' ); ?>>
                                                                <?php esc_html_e( 'left-bottom', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Action (added)', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[button_action_added]">
                                                            <option value="popup" <?php selected( $button_action_added, 'popup' ); ?>>
                                                                <?php esc_html_e( 'Open wishlist popup', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="page" <?php selected( $button_action_added, 'page' ); ?>>
                                                                <?php esc_html_e( 'Open wishlist page', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="remove" <?php selected( $button_action_added, 'remove' ); ?>>
                                                                <?php esc_html_e( 'Remove from wishlist', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <p class="description">
                                                        <?php esc_html_e( 'Action triggered by clicking on the wishlist button of a product that was added to wishlist.', 'woo-smart-wishlist' ); ?>
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Extra class (optional)', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_settings[button_class]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::get_setting( 'button_class', '' ) ); ?>"/>
                                                    </label>
                                                    <p class="description">
                                                        <?php esc_html_e( 'Add extra class for action button/link, split by one space.', 'woo-smart-wishlist' ); ?>
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Position on archive page', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php
                                                    $position_archive  = apply_filters( 'woosw_button_position_archive', 'default' );
                                                    $positions_archive = apply_filters( 'woosw_button_positions_archive', [
                                                            'before_title'       => esc_html__( 'Above title', 'woo-smart-wishlist' ),
                                                            'after_title'        => esc_html__( 'Under title', 'woo-smart-wishlist' ),
                                                            'after_rating'       => esc_html__( 'Under rating', 'woo-smart-wishlist' ),
                                                            'after_price'        => esc_html__( 'Under price', 'woo-smart-wishlist' ),
                                                            'before_add_to_cart' => esc_html__( 'Above add to cart button', 'woo-smart-wishlist' ),
                                                            'after_add_to_cart'  => esc_html__( 'Under add to cart button', 'woo-smart-wishlist' ),
                                                            '0'                  => esc_html__( 'None (hide it)', 'woo-smart-wishlist' ),
                                                    ] );
                                                    ?>
                                                    <label>
                                                        <select name="woosw_settings[button_position_archive]" <?php echo( $position_archive !== 'default' ? 'disabled' : '' ); ?>>
                                                            <?php
                                                            if ( $position_archive === 'default' ) {
                                                                $position_archive = Woosw_Helper::get_setting( 'button_position_archive', apply_filters( 'woosw_button_position_archive_default', 'after_add_to_cart' ) );
                                                            }

                                                            foreach ( $positions_archive as $k => $p ) {
                                                                echo '<option value="' . esc_attr( $k ) . '" ' . ( ( $k === $position_archive ) || ( empty( $position_archive ) && empty( $k ) ) ? 'selected' : '' ) . '>' . esc_html( $p ) . '</option>';
                                                            }
                                                            ?>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Position on single page', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php
                                                    $position_single  = apply_filters( 'woosw_button_position_single', 'default' );
                                                    $positions_single = apply_filters( 'woosw_button_positions_single', [
                                                            '6'  => esc_html__( 'Under title', 'woo-smart-wishlist' ),
                                                            '11' => esc_html__( 'Under rating', 'woo-smart-wishlist' ),
                                                            '21' => esc_html__( 'Under excerpt', 'woo-smart-wishlist' ),
                                                            '29' => esc_html__( 'Above add to cart button', 'woo-smart-wishlist' ),
                                                            '31' => esc_html__( 'Under add to cart button', 'woo-smart-wishlist' ),
                                                            '41' => esc_html__( 'Under meta', 'woo-smart-wishlist' ),
                                                            '51' => esc_html__( 'Under sharing', 'woo-smart-wishlist' ),
                                                            '0'  => esc_html__( 'None (hide it)', 'woo-smart-wishlist' ),
                                                    ] );
                                                    ?>
                                                    <label>
                                                        <select name="woosw_settings[button_position_single]" <?php echo( $position_single !== 'default' ? 'disabled' : '' ); ?>>
                                                            <?php
                                                            if ( $position_single === 'default' ) {
                                                                $position_single = Woosw_Helper::get_setting( 'button_position_single', apply_filters( 'woosw_button_position_single_default', '31' ) );
                                                            }

                                                            foreach ( $positions_single as $k => $p ) {
                                                                echo '<option value="' . esc_attr( $k ) . '" ' . ( ( strval( $k ) === strval( $position_single ) ) || ( $k === $position_single ) || ( empty( $position_single ) && empty( $k ) ) ? 'selected' : '' ) . '>' . esc_html( $p ) . '</option>';
                                                            }
                                                            ?>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Shortcode', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <span class="description">
                                                        <?php printf( /* translators: shortcode */ esc_html__( 'You can add a button manually by using the shortcode %1$s, e.g. %2$s for the product whose ID is 99.', 'woo-smart-wishlist' ), '<code>[woosw id="{product id}"]</code>', '<code>[woosw id="99"]</code>' ); ?>
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Categories', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php
                                                    $selected_cats = Woosw_Helper::get_setting( 'cats' );

                                                    if ( empty( $selected_cats ) ) {
                                                        $selected_cats = [ 0 ];
                                                    }

                                                    wc_product_dropdown_categories(
                                                            [
                                                                    'name'             => 'woosw_settings[cats]',
                                                                    'id'               => 'woosw_settings_cats',
                                                                    'hide_empty'       => 0,
                                                                    'value_field'      => 'id',
                                                                    'multiple'         => true,
                                                                    'show_option_all'  => esc_html__( 'All categories', 'woo-smart-wishlist' ),
                                                                    'show_option_none' => '',
                                                                    'selected'         => implode( ',', $selected_cats )
                                                            ]
                                                    );
                                                    ?>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Only show the wishlist button for products in selected categories.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Popup', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Settings for the wishlist popup.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Position', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[popup_position]">
                                                            <option value="center" <?php selected( $popup_position, 'center' ); ?>>
                                                                <?php esc_html_e( 'Center', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="right" <?php selected( $popup_position, 'right' ); ?>>
                                                                <?php esc_html_e( 'Right', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="left" <?php selected( $popup_position, 'left' ); ?>>
                                                                <?php esc_html_e( 'Left', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Use perfect-scrollbar', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[perfect_scrollbar]">
                                                            <option value="yes" <?php selected( $perfect_scrollbar, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $perfect_scrollbar, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php printf( /* translators: link */ esc_html__( 'Read more about %s', 'woo-smart-wishlist' ), '<a href="https://github.com/mdbootstrap/perfect-scrollbar" target="_blank">perfect-scrollbar</a>' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Color', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php $color_default = apply_filters( 'woosw_color_default', '#5fbd74' ); ?>
                                                    <label>
                                                        <input type="text" name="woosw_settings[color]"
                                                               class="woosw_color_picker"
                                                               value="<?php echo esc_attr( Woosw_Helper::get_setting( 'color', $color_default ) ); ?>"/>
                                                    </label>
                                                    <span
                                                            class="description"><?php printf( /* translators: color */ esc_html__( 'Choose the color, default %s', 'woo-smart-wishlist' ), '<code>' . esc_html( $color_default ) . '</code>' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Link to individual product', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[link]">
                                                            <option value="yes" <?php selected( $link, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes, open in the same tab', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="yes_blank" <?php selected( $link, 'yes_blank' ); ?>>
                                                                <?php esc_html_e( 'Yes, open in the new tab', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="yes_popup" <?php selected( $link, 'yes_popup' ); ?>>
                                                                <?php esc_html_e( 'Yes, open quick view popup', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $link, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <p class="description">If you choose "Open quick view popup", please
                                                        install
                                                        <a href="<?php echo esc_url( admin_url( 'plugin-install.php?tab=plugin-information&plugin=woo-smart-quick-view&TB_iframe=true&width=800&height=550' ) ); ?>"
                                                           class="thickbox" title="WPC Smart Quick View">WPC Smart Quick
                                                            View</a> to make it work.
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Show price change', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[show_price_change]">
                                                            <option value="no" <?php selected( $show_price_change, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="increase" <?php selected( $show_price_change, 'increase' ); ?>>
                                                                <?php esc_html_e( 'Increase only', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="decrease" <?php selected( $show_price_change, 'decrease' ); ?>>
                                                                <?php esc_html_e( 'Decrease only', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="both" <?php selected( $show_price_change, 'both' ); ?>>
                                                                <?php esc_html_e( 'Both increase and decrease', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Show price change since a product was added.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row">
                                                    <?php esc_html_e( 'Use notes', 'woo-smart-wishlist' ); ?>
                                                    <?php if ( ! defined( 'WOOSW_PREMIUM' ) ) : ?>
                                                        <span class="woosw-badge-pro"><?php esc_html_e( 'Premium', 'woo-smart-wishlist' ); ?></span>
                                                    <?php endif; ?>
                                                </th>
                                                <td>
                                                    <label> <select name="woosw_settings[use_note]">
                                                            <option value="yes" <?php selected( $use_note, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $use_note, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Allow the wishlist owner to add notes for each product.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Show notes publicly', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[show_note]">
                                                            <option value="yes" <?php selected( $show_note, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $show_note, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Show notes on each product for all visitors. The wishlist owner always can view/add/edit their notes.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Empty wishlist button', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[empty_button]">
                                                            <option value="yes" <?php selected( $empty_button, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $empty_button, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Show empty wishlist button on the popup?', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Search', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[popup_search]">
                                                            <option value="yes" <?php selected( $popup_search, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $popup_search, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Show search input on the popup to filter products by name or note.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Continue shopping link', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="url" name="woosw_settings[continue_url]"
                                                               value="<?php echo esc_attr( Woosw_Helper::get_setting( 'continue_url' ) ); ?>"
                                                               class="regular-text code"/>
                                                    </label>
                                                    <p class="description">
                                                        <?php esc_html_e( 'By default, the wishlist popup will only be closed when customers click on the "Continue Shopping" button.', 'woo-smart-wishlist' ); ?>
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Suggested products', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <p><?php esc_html_e( 'Show suggested products below products list.', 'woo-smart-wishlist' ); ?>
                                                        <?php esc_html_e( 'Limit', 'woo-smart-wishlist' ); ?>
                                                        <label>
                                                            <input type="number" min="0" step="1"
                                                                   name="woosw_settings[suggested_limit]"
                                                                   value="<?php echo esc_attr( $suggested_limit ); ?>"
                                                                   class="woosw-input-short"/>
                                                        </label>
                                                    </p>
                                                    <ul>
                                                        <li>
                                                            <label><input type="checkbox"
                                                                          name="woosw_settings[suggested][]"
                                                                          value="related" <?php echo esc_attr( in_array( 'related', $suggested ) ? 'checked' : '' ); ?> />
                                                                <?php esc_html_e( 'Related products', 'woo-smart-wishlist' ); ?>
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label><input type="checkbox"
                                                                          name="woosw_settings[suggested][]"
                                                                          value="up_sells" <?php echo esc_attr( in_array( 'up_sells', $suggested ) ? 'checked' : '' ); ?> />
                                                                <?php esc_html_e( 'Upsells products', 'woo-smart-wishlist' ); ?>
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label><input type="checkbox"
                                                                          name="woosw_settings[suggested][]"
                                                                          value="cross_sells"
                                                                        <?php echo esc_attr( in_array( 'cross_sells', $suggested ) ? 'checked' : '' ); ?> /> <?php esc_html_e( 'Cross-sells products', 'woo-smart-wishlist' ); ?>
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label><input type="checkbox"
                                                                          name="woosw_settings[suggested][]"
                                                                          value="compare" <?php echo esc_attr( in_array( 'compare', $suggested ) ? 'checked' : '' ); ?> />
                                                                <?php esc_html_e( 'Compare', 'woo-smart-wishlist' ); ?>
                                                            </label> <span class="description">(from
                                                                <a href="<?php echo esc_url( admin_url( 'plugin-install.php?tab=plugin-information&plugin=woo-smart-compare&TB_iframe=true&width=800&height=550' ) ); ?>"
                                                                   class="thickbox" title="WPC Smart Compare">WPC Smart Compare</a>)</span>
                                                        </li>
                                                    </ul>
                                                    <span class="description">You can use
                                                        <a href="<?php echo esc_url( admin_url( 'plugin-install.php?tab=plugin-information&plugin=wpc-custom-related-products&TB_iframe=true&width=800&height=550' ) ); ?>"
                                                           class="thickbox" title="WPC Custom Related Products">WPC Custom Related Products</a> or
                                                        <a href="<?php echo esc_url( admin_url( 'plugin-install.php?tab=plugin-information&plugin=wpc-smart-linked-products&TB_iframe=true&width=800&height=550' ) ); ?>"
                                                           class="thickbox" title="WPC Smart Linked Products">WPC Smart Linked Products</a> plugin
                                                        to configure related/upsells/cross-sells in bulk with smart conditions.
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Page', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Settings for wishlist page.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Wishlist page', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php wp_dropdown_pages( [
                                                            'selected'          => Woosw_Helper::get_setting( 'page_id', '' ),
                                                            'name'              => 'woosw_settings[page_id]',
                                                            'show_option_none'  => esc_html__( 'Choose a page', 'woo-smart-wishlist' ),
                                                            'option_none_value' => '',
                                                    ] ); ?>
                                                    <span
                                                            class="description"><?php printf( /* translators: shortcode */ esc_html__( 'Add shortcode %s to display the wishlist on a page.', 'woo-smart-wishlist' ), '<code>[woosw_list]</code>' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Share buttons', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[page_share]">
                                                            <option value="yes" <?php selected( $page_share, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $page_share, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Enable share buttons on the wishlist page?', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Use icon', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[page_icon]">
                                                            <option value="yes" <?php selected( $page_icon, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $page_icon, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Social links', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php
                                                    $share_items = Woosw_Helper::get_setting( 'page_items' );

                                                    if ( empty( $share_items ) ) {
                                                        $share_items = [];
                                                    }
                                                    ?>
                                                    <label for='woosw_page_items'></label><select
                                                            name="woosw_settings[page_items][]"
                                                            id='woosw_page_items' multiple>
                                                        <option value="facebook" <?php echo esc_attr( in_array( 'facebook', $share_items ) ? 'selected' : '' ); ?>><?php esc_html_e( 'Facebook', 'woo-smart-wishlist' ); ?></option>
                                                        <option value="twitter" <?php echo esc_attr( in_array( 'twitter', $share_items ) ? 'selected' : '' ); ?>><?php esc_html_e( 'Twitter', 'woo-smart-wishlist' ); ?></option>
                                                        <option value="pinterest" <?php echo esc_attr( in_array( 'pinterest', $share_items ) ? 'selected' : '' ); ?>><?php esc_html_e( 'Pinterest', 'woo-smart-wishlist' ); ?></option>
                                                        <option value="mail" <?php echo esc_attr( in_array( 'mail', $share_items ) ? 'selected' : '' ); ?>><?php esc_html_e( 'Mail', 'woo-smart-wishlist' ); ?></option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Copy link', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[page_copy]">
                                                            <option value="yes" <?php selected( $page_copy, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $page_copy, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Enable copy wishlist link to share?', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Add Wishlist link to My Account', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[page_myaccount]">
                                                            <option value="yes" <?php selected( $page_myaccount, 'yes' ); ?>>
                                                                <?php esc_html_e( 'Yes, open wishlist page', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="yes_popup" <?php selected( $page_myaccount, 'yes_popup' ); ?>>
                                                                <?php esc_html_e( 'Yes, open wishlist popup', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="no" <?php selected( $page_myaccount, 'no' ); ?>>
                                                                <?php esc_html_e( 'No', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Menu', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Settings for the wishlist menu item.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Menu(s)', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <?php
                                                    $nav_menus = get_terms( [
                                                            'taxonomy'   => 'nav_menu',
                                                            'hide_empty' => false,
                                                            'fields'     => 'id=>name',
                                                    ] );

                                                    if ( $nav_menus ) {
                                                        echo '<ul>';
                                                        $saved_menus = Woosw_Helper::get_setting( 'menus', [] );

                                                        foreach ( $nav_menus as $nav_id => $nav_name ) {
                                                            echo '<li><label><input type="checkbox" name="woosw_settings[menus][]" value="' . esc_attr( $nav_id ) . '" ' . ( is_array( $saved_menus ) && in_array( $nav_id, $saved_menus ) ? 'checked' : '' ) . '/> ' . esc_html( $nav_name ) . '</label></li>';
                                                        }

                                                        echo '</ul>';
                                                    } else {
                                                        echo '<p>' . esc_html__( 'Haven\'t any menu yet. Please go to Appearance > Menus to create one.', 'woo-smart-wishlist' ) . '</p>';
                                                    }
                                                    ?>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Choose the menu(s) you want to add the "wishlist menu" at the end.', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Action', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label> <select name="woosw_settings[menu_action]">
                                                            <option value="open_page" <?php selected( $menu_action, 'open_page' ); ?>>
                                                                <?php esc_html_e( 'Open wishlist page', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                            <option value="open_popup" <?php selected( $menu_action, 'open_popup' ); ?>>
                                                                <?php esc_html_e( 'Open wishlist popup', 'woo-smart-wishlist' ); ?>
                                                            </option>
                                                        </select> </label>
                                                    <span
                                                            class="description"><?php esc_html_e( 'Action when clicking on the "wishlist menu".', 'woo-smart-wishlist' ); ?></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-submit-row">
                                        <?php
                                        submit_button( esc_html__( 'Save Changes', 'woo-smart-wishlist' ), 'primary', 'submit', false );

                                        if ( function_exists( 'wpc_last_saved' ) ) {
                                            wpc_last_saved( Woosw_Helper::get_settings() );
                                        }
                                        ?>
                                        <a class="wpclever_export woosw-export-btn"
                                           data-key="woosw_settings"
                                           data-name="settings"
                                           href="#"><span
                                                    class="dashicons dashicons-database-export"></span> <?php esc_html_e( 'Import / Export', 'woo-smart-wishlist' ); ?>
                                        </a>
                                    </div>
                                </form>
                            <?php } elseif ( $active_tab === 'localization' ) { ?>
                                <form method="post" action="options.php">
                                    <?php settings_fields( 'woosw_localization' ); ?>
                                    <div class="woosw-card woosw-card-localization">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Localization', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Leave blank to use the default text and its equivalent translation in multiple languages.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th><?php esc_html_e( 'Button text', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[button]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'button' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Add to wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Button text (added)', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[button_added]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'button_added' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Browse wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Wishlist popup heading', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[popup_heading]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'popup_heading' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Empty wishlist button', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[empty_button]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'empty_button' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'remove all', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Search placeholder', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[search_placeholder]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'search_placeholder' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Search by name or note...', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Add note', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[add_note]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'add_note' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Add note', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Save note', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[save_note]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'save_note' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Save', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Price increase', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[price_increase]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'price_increase' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Increase {percentage} since added', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Price decrease', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[price_decrease]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'price_decrease' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Decrease {percentage} since added', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Open wishlist page', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[open_page]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'open_page' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Open wishlist page', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Continue shopping', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[continue]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'continue' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Continue shopping', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Suggested', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[suggested]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'suggested' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'You may be interested in&hellip;', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Menu item label', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[menu_label]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'menu_label' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title">
                                            <?php esc_html_e( 'Multiple Wishlist', 'woo-smart-wishlist' ); ?>
                                            <?php if ( ! defined( 'WOOSW_PREMIUM' ) ) : ?>
                                                <span class="woosw-badge-pro"><?php esc_html_e( 'Premium', 'woo-smart-wishlist' ); ?></span>
                                            <?php endif; ?>
                                        </h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Localization settings for multiple wishlist feature.', 'woo-smart-wishlist' ); ?></p>
                                        <?php if ( ! defined( 'WOOSW_PREMIUM' ) ) : ?>
                                            <div class="woosw-card-notice woosw-card-notice--premium">
                                                <div class="woosw-card-notice-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                </div>
                                                <div class="woosw-card-notice-content">
                                                    <?php
                                                    echo wp_kses_post( sprintf(
                                                        /* translators: %s: Link to premium version */
                                                        __( 'This feature is only available on the %s.', 'woo-smart-wishlist' ),
                                                        '<a href="' . esc_url( 'https://wpclever.net/downloads/smart-wishlist/' ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Premium Version', 'woo-smart-wishlist' ) . '</a>'
                                                    ) );
                                                    ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Primary wishlist name', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[primary_name]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'primary_name' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Manage wishlists', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[manage_wishlists]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'manage_wishlists' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Manage wishlists', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Set default', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[set_default]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'set_default' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'set default', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Default', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[is_default]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'is_default' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'default', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Delete', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[delete]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'delete' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'delete', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Wishlist name placeholder', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[placeholder_name]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'placeholder_name' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'New Wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><?php esc_html_e( 'Add new wishlist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" name="woosw_localization[add_wishlist]"
                                                               class="regular-text"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'add_wishlist' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Add New Wishlist', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Badge: Primary', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[badge_primary]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'badge_primary' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Primary', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Badge: Followed', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[badge_followed]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'badge_followed' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Followed', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Badge: Collabable', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[badge_collabable]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'badge_collabable' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Collabable', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Follow text', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[follow_text]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'follow_text' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Follow', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Unfollow text', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[unfollow_text]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'unfollow_text' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Unfollow', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Collab label', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[collab_label]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'collab_label' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Allow collaboration (any logged-in user with the link can add or remove items)', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-card">
                                        <h2 class="woosw-card-title"><?php esc_html_e( 'Message', 'woo-smart-wishlist' ); ?></h2>
                                        <p class="woosw-card-desc"><?php esc_html_e( 'Localization settings for popup notifications and messages.', 'woo-smart-wishlist' ); ?></p>
                                        <table class="woosw-form-table">
                                            <tr>
                                                <th><?php esc_html_e( 'Added to the wishlist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[added_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'added_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( '{name} has been added to Wishlist.', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Already in the wishlist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[already_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'already_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( '{name} is already in the Wishlist.', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Removed from wishlist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[removed_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'removed_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Product has been removed from the Wishlist.', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Empty wishlist confirm', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[empty_confirm]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'empty_confirm' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'This action cannot be undone. Are you sure?', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Empty wishlist notice', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[empty_notice]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'empty_notice' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'All products have been removed from the Wishlist!', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Empty wishlist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[empty_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'empty_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Delete wishlist confirm', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[delete_confirm]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'delete_confirm' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'This action cannot be undone. Are you sure?', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Product does not exist', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[not_exist_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'not_exist_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'The product does not exist on the Wishlist!', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Need to login', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[login_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'login_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Copied wishlist link', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[copied]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'copied' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Copied the wishlist link:', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th><?php esc_html_e( 'Have an error', 'woo-smart-wishlist' ); ?></th>
                                                <td>
                                                    <label>
                                                        <input type="text" class="regular-text"
                                                               name="woosw_localization[error_message]"
                                                               value="<?php echo esc_attr( Woosw_Helper::localization( 'error_message' ) ); ?>"
                                                               placeholder="<?php esc_attr_e( 'Have an error, please try again!', 'woo-smart-wishlist' ); ?>"/>
                                                    </label>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="woosw-submit-row">
                                        <?php submit_button( esc_html__( 'Save Changes', 'woo-smart-wishlist' ), 'primary', 'submit', false ); ?>
                                        <a class="wpclever_export woosw-export-btn"
                                           data-key="woosw_localization"
                                           data-name="settings"
                                           href="#"><span
                                                    class="dashicons dashicons-database-export"></span> <?php esc_html_e( 'Import / Export', 'woo-smart-wishlist' ); ?>
                                        </a>
                                    </div>
                                </form>
                            <?php } elseif ( $active_tab === 'premium' ) { ?>
                                <div class="woosw-card">
                                    <h2 class="woosw-card-title"><?php esc_html_e( 'Premium Version', 'woo-smart-wishlist' ); ?></h2>
                                    <p class="woosw-card-desc">
                                        <?php esc_html_e( 'Get the Premium Version just $29!', 'woo-smart-wishlist' ); ?>
                                        <a href="https://wpclever.net/downloads/smart-wishlist/?utm_source=pro&utm_medium=woosw&utm_campaign=wporg"
                                           target="_blank">https://wpclever.net/downloads/smart-wishlist/</a>
                                    </p>
                                    <p>
                                        <strong><?php esc_html_e( 'Extra features for Premium Version:', 'woo-smart-wishlist' ); ?></strong>
                                    </p>
                                    <ul class="woosw-premium-features">
                                        <li>
                                            - <?php esc_html_e( 'Enable multiple wishlist per user.', 'woo-smart-wishlist' ); ?></li>
                                        <li>
                                            - <?php esc_html_e( 'Enable notes for each product.', 'woo-smart-wishlist' ); ?></li>
                                        <li>
                                            - <?php esc_html_e( 'Get lifetime update & premium support.', 'woo-smart-wishlist' ); ?></li>
                                    </ul>
                                </div>
                            <?php } elseif ( $active_tab === 'statistics' ) {
                                Woosw_Statistics::instance()->render();
                            } ?>
                        </div><!-- /.woosw-settings-page-content -->
                    </div><!-- /.woosw-settings-wrap -->
                    <?php
                }

                function account_items( $items ) {
                    if ( isset( $items['customer-logout'] ) ) {
                        $logout = $items['customer-logout'];
                        unset( $items['customer-logout'] );
                    } else {
                        $logout = '';
                    }

                    if ( ! isset( $items['wishlist'] ) ) {
                        $items['wishlist'] = apply_filters( 'woosw_myaccount_wishlist_label', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );
                    }

                    if ( $logout ) {
                        $items['customer-logout'] = $logout;
                    }

                    return $items;
                }

                function account_endpoint() {
                    echo apply_filters( 'woosw_myaccount_wishlist_content', do_shortcode( '[woosw_list]' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                }

                function enqueue_scripts() {
                    // perfect srollbar
                    if ( Woosw_Helper::get_setting( 'perfect_scrollbar', 'yes' ) === 'yes' ) {
                        wp_enqueue_style( 'perfect-scrollbar', WOOSW_URI . 'assets/libs/perfect-scrollbar/css/perfect-scrollbar.min.css', [], WOOSW_VERSION );
                        wp_enqueue_style( 'perfect-scrollbar-wpc', WOOSW_URI . 'assets/libs/perfect-scrollbar/css/custom-theme.css', [], WOOSW_VERSION );
                        wp_enqueue_script( 'perfect-scrollbar', WOOSW_URI . 'assets/libs/perfect-scrollbar/js/perfect-scrollbar.jquery.min.js', [ 'jquery' ], WOOSW_VERSION, true );
                    }

                    if ( Woosw_Helper::get_setting( 'button_action', 'list' ) === 'message' ) {
                        wp_enqueue_style( 'notiny', WOOSW_URI . 'assets/libs/notiny/notiny.css', [], WOOSW_VERSION );
                        wp_enqueue_script( 'notiny', WOOSW_URI . 'assets/libs/notiny/notiny.js', [ 'jquery' ], WOOSW_VERSION, true );
                    }

                    // main style
                    wp_enqueue_style( 'woosw-icons', WOOSW_URI . 'assets/css/icons.css', [], WOOSW_VERSION );
                    wp_enqueue_style( 'woosw-frontend', WOOSW_URI . 'assets/css/frontend.css', [], WOOSW_VERSION );
                    $color_default = apply_filters( 'woosw_color_default', '#5fbd74' );
                    $color         = apply_filters( 'woosw_color', Woosw_Helper::get_setting( 'color', $color_default ) );
                    $custom_css    = ".woosw-popup .woosw-popup-inner .woosw-popup-content .woosw-popup-content-bot .woosw-notice { background-color: {$color}; } ";
                    $custom_css    .= ".woosw-popup .woosw-popup-inner .woosw-popup-content .woosw-popup-content-bot .woosw-popup-content-bot-inner a:hover { color: {$color}; border-color: {$color}; } ";
                    wp_add_inline_style( 'woosw-frontend', $custom_css );

                    // main js
                    wp_enqueue_script( 'woosw-frontend', WOOSW_URI . 'assets/js/frontend.js', [
                            'jquery',
                            'js-cookie'
                    ], WOOSW_VERSION, true );

                    $added_to_cart = 'no';
                    $requests      = apply_filters( 'woosw_added_to_cart_requests', [
                            'add-to-cart',
                            'product_added_to_cart',
                            'added_to_cart',
                            'set_cart',
                            'fill_cart'
                    ] );

                    if ( is_array( $requests ) && ! empty( $requests ) ) {
                        foreach ( $requests as $request ) {
                            if ( isset( $_REQUEST[ $request ] ) ) {
                                $added_to_cart = 'yes';
                                break;
                            }
                        }
                    }

                    // localize
                    wp_localize_script(
                            'woosw-frontend',
                            'woosw_vars',
                            [
                                    'wc_ajax_url'                   => WC_AJAX::get_endpoint( '%%endpoint%%' ),
                                    'cookie_secure'                 => Woosw_Helper::get_cookie_config()['secure'] ? 'yes' : 'no',
                                    'cookie_samesite'               => Woosw_Helper::get_cookie_config()['samesite'],
                                    'cookie_path'                   => Woosw_Helper::get_cookie_config()['path'],
                                    'cookie_domain'                 => Woosw_Helper::get_cookie_config()['domain'],
                                    'nonce'                         => wp_create_nonce( 'woosw-security' ),
                                    'added_to_cart'                 => apply_filters( 'woosw_added_to_cart', $added_to_cart ),
                                    'auto_remove'                   => Woosw_Helper::get_setting( 'auto_remove', 'no' ),
                                    'page_myaccount'                => Woosw_Helper::get_setting( 'page_myaccount', 'yes' ),
                                    'menu_action'                   => Woosw_Helper::get_setting( 'menu_action', 'open_page' ),
                                    'reload_count'                  => Woosw_Helper::get_setting( 'reload_count', 'no' ),
                                    'variations'                    => Woosw_Helper::get_setting( 'variations', 'yes' ),
                                    'perfect_scrollbar'             => Woosw_Helper::get_setting( 'perfect_scrollbar', 'yes' ),
                                    'wishlist_url'                  => Woosw_Helper::get_url(),
                                    'button_action'                 => Woosw_Helper::get_setting( 'button_action', 'list' ),
                                    'message_position'              => Woosw_Helper::get_setting( 'message_position', 'right-top' ),
                                    'button_action_added'           => Woosw_Helper::get_setting( 'button_action_added', 'popup' ),
                                    'empty_confirm'                 => Woosw_Helper::localization( 'empty_confirm', esc_html__( 'This action cannot be undone. Are you sure?', 'woo-smart-wishlist' ) ),
                                    'delete_confirm'                => Woosw_Helper::localization( 'delete_confirm', esc_html__( 'This action cannot be undone. Are you sure?', 'woo-smart-wishlist' ) ),
                                    'copied_text'                   => Woosw_Helper::localization( 'copied', esc_html__( 'Copied the wishlist link:', 'woo-smart-wishlist' ) ),
                                    'menu_text'                     => apply_filters( 'woosw_menu_item_label', Woosw_Helper::localization( 'menu_label', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) ) ),
                                    'button_text'                   => apply_filters( 'woosw_button_text', Woosw_Helper::localization( 'button', esc_html__( 'Add to wishlist', 'woo-smart-wishlist' ) ) ),
                                    'button_text_added'             => apply_filters( 'woosw_button_text_added', Woosw_Helper::localization( 'button_added', esc_html__( 'Browse wishlist', 'woo-smart-wishlist' ) ) ),
                                    'button_normal_icon'            => apply_filters( 'woosw_button_normal_icon', Woosw_Helper::get_setting( 'button_normal_icon', 'woosw-icon-5' ) ),
                                    'button_added_icon'             => apply_filters( 'woosw_button_added_icon', Woosw_Helper::get_setting( 'button_added_icon', 'woosw-icon-8' ) ),
                                    'button_loading_icon'           => apply_filters( 'woosw_button_loading_icon', Woosw_Helper::get_setting( 'button_loading_icon', 'woosw-icon-4' ) ),
                                    'popup_search'                  => Woosw_Helper::get_setting( 'popup_search', 'no' ),
                                    'search_placeholder'            => Woosw_Helper::localization( 'search_placeholder', esc_html__( 'Search by name or note...', 'woo-smart-wishlist' ) ),
                                    'login_message'                 => Woosw_Helper::localization( 'login_message', esc_html__( 'Please log in to use the Wishlist!', 'woo-smart-wishlist' ) ),
                                    'choose_wishlist'               => Woosw_Helper::get_setting( 'choose_wishlist', 'no' ),
                                    'enable_multiple'               => Woosw_Helper::is_multiple_enabled() ? 'yes' : 'no',
                                    'choose_wishlist_text'          => Woosw_Helper::localization( 'choose_wishlist', esc_html__( 'Choose a wishlist', 'woo-smart-wishlist' ) ),
                                    'collabable_enabled'            => Woosw_Helper::is_collabable_enabled() ? 'yes' : 'no',
                                    'added_to_my_wishlists_text'    => Woosw_Helper::localization( 'badge_followed', esc_html__( 'Followed', 'woo-smart-wishlist' ) ),
                                    'add_to_my_wishlists_text'      => Woosw_Helper::localization( 'follow_text', esc_html__( 'Follow', 'woo-smart-wishlist' ) ),
                                    'remove_from_my_wishlists_text' => Woosw_Helper::localization( 'unfollow_text', esc_html__( 'Unfollow', 'woo-smart-wishlist' ) ),
                                    'badge_primary_text'            => Woosw_Helper::localization( 'badge_primary', esc_html__( 'Primary', 'woo-smart-wishlist' ) ),
                                    'badge_followed_text'           => Woosw_Helper::localization( 'badge_followed', esc_html__( 'Followed', 'woo-smart-wishlist' ) ),
                                    'badge_collabable_text'         => Woosw_Helper::localization( 'badge_collabable', esc_html__( 'Collabable', 'woo-smart-wishlist' ) ),
                                    'badge_default_text'            => Woosw_Helper::localization( 'is_default', esc_html__( 'Default', 'woo-smart-wishlist' ) ),
                            ]
                    );
                }

                function admin_enqueue_scripts( $hook ) {
                    if ( apply_filters( 'woosw_ignore_backend_scripts', false, $hook ) ) {
                        return null;
                    }

                    add_thickbox();
                    wp_enqueue_style( 'wp-color-picker' );
                    wp_enqueue_style( 'fonticonpicker', WOOSW_URI . 'assets/libs/fonticonpicker/css/jquery.fonticonpicker.css', [], WOOSW_VERSION );
                    wp_enqueue_script( 'fonticonpicker', WOOSW_URI . 'assets/libs/fonticonpicker/js/jquery.fonticonpicker.min.js', [ 'jquery' ], WOOSW_VERSION, true );
                    wp_enqueue_style( 'woosw-icons', WOOSW_URI . 'assets/css/icons.css', [], WOOSW_VERSION );
                    wp_enqueue_style( 'woosw-backend', WOOSW_URI . 'assets/css/backend.css', [ 'woocommerce_admin_styles' ], WOOSW_VERSION );
                    wp_enqueue_script( 'woosw-backend', WOOSW_URI . 'assets/js/backend.js', [
                            'jquery',
                            'wp-color-picker',
                            'jquery-ui-dialog',
                            'selectWoo',
                    ], WOOSW_VERSION, true );
                    wp_localize_script(
                            'woosw-backend',
                            'woosw_vars',
                            [
                                    'nonce' => wp_create_nonce( 'woosw-security' ),
                            ]
                    );
                }

                function action_links( $links, $file ) {
                    static $plugin;

                    if ( ! isset( $plugin ) ) {
                        $plugin = plugin_basename( __FILE__ );
                    }

                    if ( $plugin === $file ) {
                        $settings             = '<a href="' . esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=settings' ) ) . '">' . esc_html__( 'Settings', 'woo-smart-wishlist' ) . '</a>';
                        $links['wpc-premium'] = '<a href="' . esc_url( admin_url( 'admin.php?page=wpclever-woosw&tab=premium' ) ) . '" style="color: #c9356e">' . esc_html__( 'Premium Version', 'woo-smart-wishlist' ) . '</a>';
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
                                'support' => '<a href="' . esc_url( WOOSW_DISCUSSION ) . '" target="_blank">' . esc_html__( 'Community support', 'woo-smart-wishlist' ) . '</a>',
                        ];

                        return array_merge( $links, $row_meta );
                    }

                    return (array) $links;
                }

                function get_items( $key, $layout = null ) {
                    ob_start();
                    // store $global_product
                    global $product;
                    $global_product     = $product;
                    $products           = apply_filters( 'woosw_get_items', Woosw_Helper::get_ids( $key ), $key );
                    $link               = Woosw_Helper::get_setting( 'link', 'yes' );
                    $table_tag          = $tr_tag = $td_tag = 'div';
                    $count              = count( $products ); // count saved products
                    $real_count         = 0; // count real products
                    $real_products      = [];
                    $suggested          = Woosw_Helper::get_setting( 'suggested', [] );
                    $suggested_limit    = Woosw_Helper::get_setting( 'suggested_limit', 0 );
                    $suggested_products = [];

                    if ( $layout === 'table' ) {
                        $table_tag = esc_attr( 'table' );
                        $tr_tag    = esc_attr( 'tr' );
                        $td_tag    = esc_attr( 'td' );
                    } else {
                        $table_tag = esc_attr( 'div' );
                        $tr_tag    = esc_attr( 'div' );
                        $td_tag    = esc_attr( 'div' );
                    }

                    do_action( 'woosw_before_items', $key, $products );

                    if ( is_array( $products ) && ( count( $products ) > 0 ) ) {
                        echo '<' . esc_attr( $table_tag ) . ' class="woosw-items" data-key="' . esc_attr( $key ) . '">';
                        do_action( 'woosw_wishlist_items_before', $key, $products );

                        foreach ( $products as $product_id => $product_data ) {
                            global $product;
                            $product = wc_get_product( $product_id );

                            if ( ! $product || $product->get_status() !== 'publish' ) {
                                continue;
                            }

                            if ( is_array( $product_data ) && isset( $product_data['time'] ) ) {
                                $product_time = wp_date( get_option( 'date_format' ), $product_data['time'] );
                            } else {
                                // for old version
                                $product_time = wp_date( get_option( 'date_format' ), $product_data );
                            }

                            if ( is_array( $product_data ) && ! empty( $product_data['note'] ) ) {
                                $product_note = $product_data['note'];
                            } else {
                                $product_note = '';
                            }

                            echo '<' . $tr_tag . ' class="' . esc_attr( 'woosw-item woosw-item-' . $product_id ) . '" data-id="' . esc_attr( $product_id ) . '" data-name="' . esc_attr( $product->get_name() ) . '" data-note="' . esc_attr( $product_note ) . '">';

                            if ( $layout !== 'table' ) {
                                echo '<div class="woosw-item-inner">';
                            }

                            do_action( 'woosw_wishlist_item_before', $product, $key );

                            if ( Woosw_Helper::can_edit( $key ) ) {
                                // remove
                                echo '<' . $td_tag . ' class="woosw-item--remove"><span></span></' . $td_tag . '>';
                            }

                            // image
                            echo '<' . $td_tag . ' class="woosw-item--image">';
                            do_action( 'woosw_wishlist_item_image_before', $product, $key );

                            if ( $link !== 'no' ) {
                                echo '<a ' . ( $link === 'yes_popup' ? 'class="woosq-link" data-id="' . esc_attr( $product_id ) . '" data-context="woosw"' : '' ) . ' href="' . esc_url( $product->get_permalink() ) . '" ' . ( $link === 'yes_blank' ? 'target="_blank"' : '' ) . '>';
                                echo wp_kses_post( apply_filters( 'woosw_item_image', $product->get_image(), $product ) );
                                echo '</a>';
                            } else {
                                echo wp_kses_post( apply_filters( 'woosw_item_image', $product->get_image(), $product ) );
                            }

                            do_action( 'woosw_wishlist_item_image', $product, $key );
                            do_action( 'woosw_wishlist_item_image_after', $product, $key );
                            echo '</' . $td_tag . '>';

                            // info
                            echo '<' . $td_tag . ' class="woosw-item--info">';
                            do_action( 'woosw_wishlist_item_info_before', $product, $key );

                            if ( $link !== 'no' ) {
                                echo '<div class="woosw-item--name"><a ' . ( $link === 'yes_popup' ? 'class="woosq-link" data-id="' . esc_attr( $product_id ) . '" data-context="woosw"' : '' ) . ' href="' . esc_url( $product->get_permalink() ) . '" ' . ( $link === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . wp_kses_post( apply_filters( 'woosw_item_name', $product->get_name(), $product ) ) . '</a></div>';
                            } else {
                                echo '<div class="woosw-item--name">' . wp_kses_post( apply_filters( 'woosw_item_name', $product->get_name(), $product ) ) . '</div>';
                            }

                            do_action( 'woosw_wishlist_item_price_before', $product, $key );

                            echo '<div class="woosw-item--price">' . wp_kses_post( apply_filters( 'woosw_item_price', $product->get_price_html(), $product ) ) . '</div>';

                            if ( Woosw_Helper::get_setting( 'show_price_change', 'no' ) !== 'no' ) {
                                if ( isset( $product_data['price'] ) ) {
                                    $product_price = (float) $product_data['price'];
                                    $price         = (float) $product->get_price();

                                    if ( $price != $product_price ) {
                                        // has price change
                                        if ( $product_price != 0 ) {
                                            if ( $price > $product_price ) {
                                                // increase
                                                $percentage    = 100 * ( $price - $product_price ) / $product_price;
                                                $percentage    = apply_filters( 'woosw_price_increase_percentage', round( $percentage ) . '%', $percentage, $product_data );
                                                $increase      = Woosw_Helper::localization( 'price_increase', esc_html__( 'Increase {percentage} since added', 'woo-smart-wishlist' ) );
                                                $increase_mess = str_replace( '{percentage}', $percentage, $increase );

                                                if ( Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'both' || Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'increase' ) {
                                                    echo '<div class="woosw-item--price-change woosw-item--price-increase">' . wp_kses_post( apply_filters( 'woosw_price_increase_message', $increase_mess, $percentage, $product_data ) ) . '</div>';
                                                }
                                            }

                                            if ( $price < $product_price ) {
                                                // decrease
                                                $percentage    = 100 * ( $product_price - $price ) / $product_price;
                                                $percentage    = apply_filters( 'woosw_price_decrease_percentage', round( $percentage ) . '%', $percentage, $product_data );
                                                $decrease      = Woosw_Helper::localization( 'price_decrease', esc_html__( 'Decrease {percentage} since added', 'woo-smart-wishlist' ) );
                                                $decrease_mess = str_replace( '{percentage}', $percentage, $decrease );

                                                if ( Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'both' || Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'decrease' ) {
                                                    echo '<div class="woosw-item--price-change woosw-item--price-decrease">' . wp_kses_post( apply_filters( 'woosw_price_decrease_message', $decrease_mess, $percentage, $product_data ) ) . '</div>';
                                                }
                                            }
                                        } else {
                                            if ( $price > $product_price ) {
                                                $percentage    = 100;
                                                $percentage    = apply_filters( 'woosw_price_increase_percentage', round( $percentage ) . '%', $percentage, $product_data );
                                                $increase      = Woosw_Helper::localization( 'price_increase', esc_html__( 'Increase {percentage} since added', 'woo-smart-wishlist' ) );
                                                $increase_mess = str_replace( '{percentage}', $percentage, $increase );

                                                if ( Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'both' || Woosw_Helper::get_setting( 'show_price_change', 'no' ) === 'increase' ) {
                                                    echo '<div class="woosw-item--price-change woosw-item--price-increase">' . wp_kses_post( apply_filters( 'woosw_price_increase_message', $increase_mess, $percentage, $product_data ) ) . '</div>';
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            do_action( 'woosw_wishlist_item_time_before', $product, $key );

                            echo '<div class="woosw-item--time">' . esc_html( apply_filters( 'woosw_item_time', $product_time, $product ) ) . '</div>';

                            if ( Woosw_Helper::is_note_enabled() ) {
                                if ( Woosw_Helper::can_edit( $key ) || ( Woosw_Helper::get_setting( 'show_note', 'no' ) === 'yes' ) ) {
                                    echo '<div class="woosw-item--note">';

                                    if ( empty( $product_note ) ) {
                                        if ( Woosw_Helper::can_edit( $key ) ) {
                                            echo Woosw_Helper::localization( 'add_note', esc_html__( 'Add note', 'woo-smart-wishlist' ) );
                                        }
                                    } else {
                                        echo nl2br( esc_html( $product_note ) );
                                    }

                                    echo '</div>';

                                    if ( Woosw_Helper::can_edit( $key ) ) {
                                        echo '<div class="woosw-item--note-add" style="display: none"><input type="text" value="' . esc_attr( $product_note ) . '"/><input type="button" class="woosw_add_note" value="' . esc_attr( Woosw_Helper::localization( 'save_note', esc_attr__( '✓', 'woo-smart-wishlist' ) ) ) . '"/></div>';
                                    }
                                }
                            }

                            do_action( 'woosw_wishlist_item_info', $product, $key );
                            do_action( 'woosw_wishlist_item_info_after', $product, $key );
                            echo '</' . $td_tag . '>';

                            // action
                            echo '<' . $td_tag . ' class="woosw-item--actions">';
                            do_action( 'woosw_wishlist_item_actions_before', $product, $key );

                            echo '<div class="woosw-item--stock">' . wp_kses_post( apply_filters( 'woosw_item_stock', wc_get_stock_html( $product ), $product ) ) . '</div>';
                            echo '<div class="woosw-item--atc">' . apply_filters( 'woosw_item_add_to_cart', do_shortcode( '[add_to_cart style="" show_price="false" id="' . esc_attr( $product_id ) . '"]' ), $product ) . '</div>';

                            do_action( 'woosw_wishlist_item_actions', $product, $key );
                            do_action( 'woosw_wishlist_item_actions_after', $product, $key );
                            echo '</' . $td_tag . '>';

                            do_action( 'woosw_wishlist_item_after', $product, $key );

                            if ( $layout !== 'table' ) {
                                echo '</div><!-- /woosw-item-inner -->';
                            }

                            echo '</' . $tr_tag . '>';

                            $real_products[ $product_id ] = $product_data;
                            $real_count ++;

                            // add suggested products
                            if ( is_array( $suggested ) && ! empty( $suggested ) && ! empty( $suggested_limit ) ) {
                                if ( in_array( 'related', $suggested ) ) {
                                    $suggested_products = array_merge( $suggested_products, wc_get_related_products( $product_id ) );
                                }

                                if ( in_array( 'cross_sells', $suggested ) ) {
                                    $suggested_products = array_merge( $suggested_products, $product->get_cross_sell_ids() );
                                }

                                if ( in_array( 'up_sells', $suggested ) ) {
                                    $suggested_products = array_merge( $suggested_products, $product->get_upsell_ids() );
                                }

                                if ( in_array( 'compare', $suggested ) && class_exists( 'WPCleverWoosc' ) ) {
                                    if ( method_exists( 'WPCleverWoosc', 'get_products' ) ) {
                                        // from woosc 6.1.4
                                        $compare_products   = WPCleverWoosc::get_products();
                                        $suggested_products = array_merge( $suggested_products, $compare_products );
                                    } else {
                                        $cookie = 'woosc_products_' . md5( 'woosc' . get_current_user_id() );

                                        if ( ! empty( $_COOKIE[ $cookie ] ) ) {
                                            $compare_products   = explode( ',', sanitize_text_field( wp_unslash( $_COOKIE[ $cookie ] ) ) );
                                            $suggested_products = array_merge( $suggested_products, $compare_products );
                                        }
                                    }
                                }
                            }
                        }

                        do_action( 'woosw_wishlist_items_after', $key, $products );
                        echo '</' . esc_attr( $table_tag ) . '>';
                    } else {
                        echo '<div class="woosw-popup-content-mid-message">' . Woosw_Helper::localization( 'empty_message', esc_html__( 'There are no products on the Wishlist!', 'woo-smart-wishlist' ) ) . '</div>';
                    }

                    do_action( 'woosw_after_items', $key, $products );

                    // suggested products
                    if ( ! empty( $suggested_limit ) && ! empty( $suggested_products ) ) {
                        $suggested_products = array_unique( $suggested_products );
                        $suggested_products = array_diff( $suggested_products, array_keys( $products ) );
                        $suggested_products = array_slice( $suggested_products, 0, $suggested_limit );
                        $suggested_products = apply_filters( 'woosw_suggested_products', $suggested_products, $products );

                        if ( is_array( $suggested_products ) && ! empty( $suggested_products ) ) {
                            echo '<div class="woosw-suggested"><div class="woosw-suggested-heading"><span>' . Woosw_Helper::localization( 'suggested', esc_html__( 'You may be interested in&hellip;', 'woo-smart-wishlist' ) ) . '</span></div></div>';
                            echo '<' . esc_attr( $table_tag ) . ' class="woosw-items woosw-suggested-items">';

                            foreach ( $suggested_products as $suggested_product ) {
                                global $product;
                                $product_id = $suggested_product;
                                $product    = wc_get_product( $product_id );

                                if ( ! $product || $product->get_status() !== 'publish' ) {
                                    continue;
                                }

                                echo '<' . $tr_tag . ' class="' . esc_attr( 'woosw-item woosw-item-' . $product_id ) . '" data-id="' . esc_attr( $product_id ) . '" data-product_name="' . esc_attr( $product->get_name() ) . '">';

                                if ( $layout !== 'table' ) {
                                    echo '<div class="woosw-item-inner">';
                                }

                                if ( Woosw_Helper::can_edit( $key ) ) {
                                    // add
                                    echo '<' . $td_tag . ' class="woosw-item--add"><span></span></' . $td_tag . '>';
                                }

                                // image
                                echo '<' . $td_tag . ' class="woosw-item--image">';

                                if ( $link !== 'no' ) {
                                    echo '<a ' . ( $link === 'yes_popup' ? 'class="woosq-link" data-id="' . esc_attr( $product_id ) . '" data-context="woosw"' : '' ) . ' href="' . esc_url( $product->get_permalink() ) . '" ' . ( $link === 'yes_blank' ? 'target="_blank"' : '' ) . '>';
                                    echo wp_kses_post( apply_filters( 'woosw_item_image', $product->get_image(), $product ) );
                                    echo '</a>';
                                } else {
                                    echo wp_kses_post( apply_filters( 'woosw_item_image', $product->get_image(), $product ) );
                                }

                                echo '</' . $td_tag . '>';

                                // info
                                echo '<' . $td_tag . ' class="woosw-item--info">';

                                if ( $link !== 'no' ) {
                                    echo '<div class="woosw-item--name"><a ' . ( $link === 'yes_popup' ? 'class="woosq-link" data-id="' . esc_attr( $product_id ) . '" data-context="woosw"' : '' ) . ' href="' . esc_url( $product->get_permalink() ) . '" ' . ( $link === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . wp_kses_post( apply_filters( 'woosw_item_name', $product->get_name(), $product ) ) . '</a></div>';
                                } else {
                                    echo '<div class="woosw-item--name">' . wp_kses_post( apply_filters( 'woosw_item_name', $product->get_name(), $product ) ) . '</div>';
                                }

                                echo '<div class="woosw-item--price">' . wp_kses_post( apply_filters( 'woosw_item_price', $product->get_price_html(), $product ) ) . '</div>';
                                echo '</' . $td_tag . '>';

                                // action
                                echo '<' . $td_tag . ' class="woosw-item--actions">';
                                echo '<div class="woosw-item--stock">' . wp_kses_post( apply_filters( 'woosw_item_stock', wc_get_stock_html( $product ), $product ) ) . '</div>';
                                echo '<div class="woosw-item--atc">' . apply_filters( 'woosw_item_add_to_cart', do_shortcode( '[add_to_cart style="" show_price="false" id="' . esc_attr( $product_id ) . '"]' ), $product ) . '</div>';
                                echo '</' . $td_tag . '>';

                                if ( $layout !== 'table' ) {
                                    echo '</div><!-- /woosw-item-inner -->';
                                }

                                echo '</' . $tr_tag . '>';
                            }

                            echo '</' . esc_attr( $table_tag ) . '>';
                        }
                    }

                    // restore $global_product
                    $product = $global_product;

                    // update products
                    if ( $real_count < $count ) {
                        update_option( 'woosw_list_' . $key, $real_products, false );
                        Woosw_Helper::clear_internal_cache( $key );
                    }

                    return apply_filters( 'woosw_wishlist_items', ob_get_clean(), $key, $products );
                }

                function nav_menu_items( $items, $args ) {
                    $selected    = false;
                    $saved_menus = Woosw_Helper::get_setting( 'menus', [] );

                    if ( ! is_array( $saved_menus ) || empty( $saved_menus ) || ! property_exists( $args, 'menu' ) ) {
                        return $items;
                    }

                    if ( $args->menu instanceof WP_Term ) {
                        // menu object
                        if ( in_array( $args->menu->term_id, $saved_menus ) ) {
                            $selected = true;
                        }
                    } elseif ( is_numeric( $args->menu ) ) {
                        // menu id
                        if ( in_array( $args->menu, $saved_menus ) ) {
                            $selected = true;
                        }
                    } elseif ( is_string( $args->menu ) ) {
                        // menu slug or name
                        $menu = get_term_by( 'name', $args->menu, 'nav_menu' );

                        if ( ! $menu ) {
                            $menu = get_term_by( 'slug', $args->menu, 'nav_menu' );
                        }

                        if ( $menu && in_array( $menu->term_id, $saved_menus ) ) {
                            $selected = true;
                        }
                    }

                    if ( $selected ) {
                        $items .= self::get_menu_item();
                    }

                    return $items;
                }

                function get_menu_item() {
                    return wp_kses_post( apply_filters( 'woosw_menu_item', '<li class="' . esc_attr( apply_filters( 'woosw_menu_item_class', 'menu-item woosw-menu-item menu-item-type-woosw' ) ) . '"><a href="' . esc_url( Woosw_Helper::get_url() ) . '"><span class="woosw-menu-item-inner" data-count="' . esc_attr( Woosw_Helper::get_count() ) . '">' . esc_html( apply_filters( 'woosw_menu_item_label', Woosw_Helper::localization( 'menu_label', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) ) ) ) . '</span></a></li>' ) );
                }

                function wp_footer() {
                    if ( is_admin() ) {
                        return;
                    }

                    echo '<div id="woosw_wishlist" class="woosw-popup ' . esc_attr( 'woosw-popup-' . Woosw_Helper::get_setting( 'popup_position', 'center' ) ) . '"></div>';

                    if ( Woosw_Helper::is_multiple_enabled() && is_user_logged_in() ) {
                        echo '<div id="woosw_manage" class="woosw-popup ' . esc_attr( 'woosw-popup-' . Woosw_Helper::get_setting( 'popup_position', 'center' ) ) . '"></div>';

                        if ( Woosw_Helper::get_setting( 'choose_wishlist', 'no' ) === 'yes' ) {
                            echo '<div id="woosw_choose" class="woosw-popup woosw-popup-center"></div>';
                        }
                    }
                }

                function wishlist_content( $key = false, $message = '' ) {
                    if ( empty( $key ) ) {
                        $key = Woosw_Helper::get_key();
                    }

                    $products = Woosw_Helper::get_ids( $key );
                    $count    = count( $products );
                    $name     = Woosw_Helper::localization( 'popup_heading', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );

                    if ( ( $user_id = get_current_user_id() ) && Woosw_Helper::is_multiple_enabled() ) {
                        $keys = Woosw_Helper::get_user_keys( $user_id );

                        if ( isset( $keys[ $key ] ) ) {
                            $name = Woosw_Helper::get_name( $key );
                        }
                    }

                    ob_start();
                    ?>
                    <div class="woosw-popup-inner" data-key="<?php echo esc_attr( $key ); ?>">
                        <div class="woosw-popup-content">
                            <div class="woosw-popup-content-top">
                                <span class="woosw-name"><?php echo esc_html( $name ); ?></span>
                                <?php
                                echo '<span class="woosw-count-wrapper">';
                                echo '<span class="woosw-count">' . esc_html( $count ) . '</span>';

                                if ( Woosw_Helper::get_setting( 'empty_button', 'no' ) === 'yes' ) {
                                    echo '<span class="woosw-empty"' . ( $count ? '' : ' style="display:none"' ) . ' data-key="' . esc_attr( $key ) . '">' . Woosw_Helper::localization( 'empty_button', esc_html__( 'remove all', 'woo-smart-wishlist' ) ) . '</span>';
                                }

                                echo '</span>';

                                if ( Woosw_Helper::is_multiple_enabled() && is_user_logged_in() ) {
                                    echo '<span class="woosw-manage">' . Woosw_Helper::localization( 'manage_wishlists', esc_html__( 'Manage wishlists', 'woo-smart-wishlist' ) ) . '</span>';
                                }
                                ?>
                                <span class="woosw-popup-close"></span>
                            </div>
                            <?php if ( Woosw_Helper::get_setting( 'popup_search', 'no' ) === 'yes' && $count > 0 && empty( $message ) ) { ?>
                                <div class="woosw-popup-content-search">
                                    <input type="search" class="woosw-search-input"
                                           placeholder="<?php echo esc_attr( Woosw_Helper::localization( 'search_placeholder', esc_html__( 'Search by name or note...', 'woo-smart-wishlist' ) ) ); ?>"
                                           autocomplete="off"/>
                                </div>
                            <?php } ?>
                            <div class="woosw-popup-content-mid">
                                <?php if ( ! empty( $message ) ) {
                                    echo '<div class="woosw-popup-content-mid-message">' . esc_html( $message ) . '</div>';
                                } else {
                                    echo self::get_items( $key );
                                } ?>
                            </div>
                            <div class="woosw-popup-content-bot">
                                <div class="woosw-popup-content-bot-inner">
                                    <a class="woosw-page"
                                       href="<?php echo esc_url( Woosw_Helper::get_url( $key, true ) ); ?>">
                                        <?php echo Woosw_Helper::localization( 'open_page', esc_html__( 'Open wishlist page', 'woo-smart-wishlist' ) ); ?>
                                    </a>
                                    <a class="woosw-continue"
                                       href="<?php echo esc_url( Woosw_Helper::get_setting( 'continue_url' ) ); ?>"
                                       data-url="<?php echo esc_url( Woosw_Helper::get_setting( 'continue_url' ) ); ?>">
                                        <?php echo Woosw_Helper::localization( 'continue', esc_html__( 'Continue shopping', 'woo-smart-wishlist' ) ); ?>
                                    </a>
                                </div>
                                <div class="woosw-notice"></div>
                            </div>
                        </div>
                    </div>
                    <?php
                    return ob_get_clean();
                }

                function manage_content() {
                    ?>
                    <div class="woosw-popup-inner">
                        <div class="woosw-popup-content">
                            <div class="woosw-popup-content-top">
                                <?php echo Woosw_Helper::localization( 'manage_wishlists', esc_html__( 'Manage wishlists', 'woo-smart-wishlist' ) ); ?>
                                <span class="woosw-popup-close"></span>
                            </div>
                            <div class="woosw-popup-content-mid">
                                <?php if ( ( $user_id = get_current_user_id() ) ) { ?>
                                    <div class="woosw-items">
                                        <?php
                                        $keys = Woosw_Helper::get_user_keys( $user_id );
                                        $key  = get_user_meta( $user_id, 'woosw_key', true );
                                        $max  = Woosw_Helper::get_setting( 'maximum_wishlists', '5' );

                                        $owned_count = 0;
                                        if ( is_array( $keys ) ) {
                                            foreach ( $keys as $wl ) {
                                                if ( ! isset( $wl['type'] ) || ! in_array( $wl['type'], [
                                                                'collab',
                                                                'follow'
                                                        ], true ) ) {
                                                    $owned_count ++;
                                                }
                                            }
                                        }

                                        if ( is_array( $keys ) && ! empty( $keys ) ) {
                                            foreach ( $keys as $k => $wl ) {
                                                if ( ! Woosw_Helper::is_follow_enabled() && isset( $wl['type'] ) && in_array( $wl['type'], [
                                                                'collab',
                                                                'follow'
                                                        ], true ) ) {
                                                    continue;
                                                }

                                                if ( isset( $wl['type'] ) && in_array( $wl['type'], [
                                                                'collab',
                                                                'follow'
                                                        ], true ) ) {
                                                    if ( get_option( 'woosw_list_' . $k ) === false ) {
                                                        continue;
                                                    }
                                                }
                                                $products = Woosw_Helper::get_ids( $k );
                                                $count    = count( $products );

                                                echo '<div class="woosw-item">';
                                                echo '<div class="woosw-item-inner">';
                                                echo '<div class="woosw-item--info">';

                                                if ( isset( $wl['type'] ) && ( $wl['type'] === 'primary' ) ) {
                                                    $display_name = Woosw_Helper::get_name( $k );
                                                    echo '<span class="woosw-item-name-wrap" data-key="' . esc_attr( $k ) . '">';
                                                    echo '<a class="woosw-view-wishlist" href="' . esc_url( Woosw_Helper::get_url( $k, true ) ) . '" data-key="' . esc_attr( $k ) . '">' . esc_html( $display_name ) . '</a> (' . absint( $count ) . ')';
                                                    echo ' <button type="button" class="woosw-rename-btn" data-key="' . esc_attr( $k ) . '" data-name="' . esc_attr( $display_name ) . '" title="' . esc_attr__( 'Rename', 'woo-smart-wishlist' ) . '">&#9998;</button>';
                                                    echo '</span>';
                                                    echo '<div class="woosw-item--badges"><small class="woosw-badge">' . Woosw_Helper::localization( 'badge_primary', esc_html__( 'Primary', 'woo-smart-wishlist' ) ) . '</small></div>';
                                                } else {
                                                    $is_collab   = isset( $wl['type'] ) && in_array( $wl['type'], [
                                                                    'collab',
                                                                    'follow'
                                                            ], true );
                                                    $name_suffix = '';
                                                    if ( $is_collab ) {
                                                        $name_suffix = '<div class="woosw-item--badges">';
                                                        $name_suffix .= '<small class="woosw-badge">' . Woosw_Helper::localization( 'badge_followed', esc_html__( 'Followed', 'woo-smart-wishlist' ) ) . '</small>';
                                                        if ( Woosw_Helper::can_edit( $k ) ) {
                                                            $name_suffix .= '<small class="woosw-badge">' . Woosw_Helper::localization( 'badge_collabable', esc_html__( 'Collabable', 'woo-smart-wishlist' ) ) . '</small>';
                                                        }
                                                        $name_suffix .= '</div>';
                                                    }
                                                    $display_name = Woosw_Helper::get_name( $k );
                                                    $can_rename   = ! $is_collab || Woosw_Helper::is_owner( $k );

                                                    echo '<span class="woosw-item-name-wrap" data-key="' . esc_attr( $k ) . '">';
                                                    echo '<a class="woosw-view-wishlist" href="' . esc_url( Woosw_Helper::get_url( $k, true ) ) . '" data-key="' . esc_attr( $k ) . '">' . esc_html( $display_name ) . '</a> (' . absint( $count ) . ')';
                                                    if ( $can_rename ) {
                                                        echo ' <button type="button" class="woosw-rename-btn" data-key="' . esc_attr( $k ) . '" data-name="' . esc_attr( $display_name ) . '" title="' . esc_attr__( 'Rename', 'woo-smart-wishlist' ) . '">&#9998;</button>';
                                                    }
                                                    echo '</span>';
                                                    echo $name_suffix;
                                                }

                                                echo '</div><div class="woosw-item--actions">';

                                                if ( $key === $k ) {
                                                    echo '<span class="woosw-default">' . Woosw_Helper::localization( 'is_default', esc_html__( 'Default', 'woo-smart-wishlist' ) ) . '</span>';
                                                } elseif ( Woosw_Helper::can_edit( $k ) ) {
                                                    echo '<a class="woosw-set-default" data-key="' . esc_attr( $k ) . '" href="#">' . Woosw_Helper::localization( 'set_default', esc_html__( 'set default', 'woo-smart-wishlist' ) ) . '</a>';
                                                }

                                                if ( ( ! isset( $wl['type'] ) || $wl['type'] !== 'primary' ) && ( $key !== $k ) ) {
                                                    $is_collab   = isset( $wl['type'] ) && in_array( $wl['type'], [
                                                                    'collab',
                                                                    'follow'
                                                            ], true );
                                                    $action_text = $is_collab ? esc_html__( 'unfollow', 'woo-smart-wishlist' ) : Woosw_Helper::localization( 'delete', esc_html__( 'delete', 'woo-smart-wishlist' ) );
                                                    echo '<a class="woosw-delete-wishlist" data-key="' . esc_attr( $k ) . '" href="#">' . $action_text . '</a>';
                                                }

                                                echo '</div></div></div>';
                                            }
                                        }
                                        ?>
                                        <div class="woosw-item <?php echo( is_array( $keys ) && ( $owned_count < (int) $max ) ? '' : 'woosw-disable' ); ?>">
                                            <div class="woosw-item-inner">
                                                <div class="woosw-new-wishlist">
                                                    <label for="woosw_wishlist_name"></label><input type="text"
                                                                                                    id="woosw_wishlist_name"
                                                                                                    placeholder="<?php echo esc_attr( Woosw_Helper::localization( 'placeholder_name', esc_html__( 'New Wishlist', 'woo-smart-wishlist' ) ) ); ?>"/>
                                                    <input type="button" id="woosw_add_wishlist"
                                                           value="<?php echo esc_attr( Woosw_Helper::localization( 'add_wishlist', esc_html__( 'Add', 'woo-smart-wishlist' ) ) ); ?>"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <?php } ?>
                            </div>
                        </div>
                    </div>
                    <?php
                }

                function update_product_count( $product_id, $action = 'add' ) {
                    $meta_count = 'woosw_count';
                    $meta_time  = ( $action === 'add' ? 'woosw_add' : 'woosw_remove' );
                    $count      = get_post_meta( $product_id, $meta_count, true );
                    $new_count  = 0;

                    if ( $action === 'add' ) {
                        if ( $count ) {
                            $new_count = absint( $count ) + 1;
                        } else {
                            $new_count = 1;
                        }
                    } elseif ( $action === 'remove' ) {
                        if ( $count && ( absint( $count ) > 1 ) ) {
                            $new_count = absint( $count ) - 1;
                        } else {
                            $new_count = 0;
                        }
                    }

                    update_post_meta( $product_id, $meta_count, $new_count );
                    update_post_meta( $product_id, $meta_time, time() );
                }

                function product_columns( $columns ) {
                    $columns['woosw'] = esc_html__( 'Wishlist', 'woo-smart-wishlist' );

                    return $columns;
                }

                function posts_custom_column( $column, $postid ) {
                    if ( $column == 'woosw' ) {
                        if ( ( $count = (int) get_post_meta( $postid, 'woosw_count', true ) ) > 0 ) {
                            echo '<a href="#" class="woosw_action" data-pid="' . esc_attr( $postid ) . '">' . esc_html( $count ) . '</a>';
                        }
                    }
                }

                function ajax_wishlist_quickview() {
                    if ( ! apply_filters( 'woosw_disable_nonce_check', false, 'wishlist_quickview' ) ) {
                        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['nonce'] ) ), 'woosw-security' ) || ! current_user_can( 'manage_options' ) ) {
                            die( 'Permissions check failed!' );
                        }
                    }

                    global $wpdb;
                    ob_start();
                    echo '<div class="woosw-quickview-items">';

                    if ( isset( $_POST['key'] ) && $_POST['key'] != '' ) {
                        $key      = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
                        $products = Woosw_Helper::get_ids( $key );
                        $count    = count( $products );

                        if ( count( $products ) > 0 ) {
                            $user = $wpdb->get_results( $wpdb->prepare( 'SELECT user_id FROM `' . $wpdb->usermeta . '` WHERE `meta_key` = "woosw_keys" AND `meta_value` LIKE %s LIMIT 1', '%"' . $key . '"%' ) );

                            echo '<div class="woosw-quickview-item">';
                            echo '<div class="woosw-quickview-item-image"><a href="' . esc_url( Woosw_Helper::get_url( $key, true ) ) . '" target="_blank">' . esc_html( $key ) . '</a></div>';
                            echo '<div class="woosw-quickview-item-info">';

                            if ( ! empty( $user ) ) {
                                $user_id   = $user[0]->user_id;
                                $user_data = get_userdata( $user_id );

                                echo '<div class="woosw-quickview-item-title"><a href="#" class="woosw_action" data-uid="' . esc_attr( $user_id ) . '">' . esc_html( $user_data->user_login ) . '</a></div>';
                                echo '<div class="woosw-quickview-item-data">' . esc_html( $user_data->user_email ) . ' | ' . sprintf( /* translators: count */ _n( '%s product', '%s products', $count, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $count ) ) ) . '</div>';
                            } else {
                                echo '<div class="woosw-quickview-item-title">' . esc_html__( 'Guest', 'woo-smart-wishlist' ) . '</div>';
                                echo '<div class="woosw-quickview-item-data">' . sprintf( /* translators: count */ _n( '%s product', '%s products', $count, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $count ) ) ) . '</div>';
                            }

                            echo '</div><!-- /woosw-quickview-item-info -->';
                            echo '</div><!-- /woosw-quickview-item -->';

                            foreach ( $products as $pid => $data ) {
                                if ( $_product = wc_get_product( $pid ) ) {
                                    echo '<div class="woosw-quickview-item">';
                                    echo '<div class="woosw-quickview-item-image">' . wp_kses_post( $_product->get_image() ) . '</div>';
                                    echo '<div class="woosw-quickview-item-info">';
                                    echo '<div class="woosw-quickview-item-title"><a href="' . esc_url( get_edit_post_link( $pid ) ) . '" target="_blank">' . $_product->get_name() . '</a></div>';
                                    echo '<div class="woosw-quickview-item-data">' . wp_date( get_option( 'date_format' ), $data['time'] ) . ' <span class="woosw-quickview-item-links">| ' . sprintf( /* translators: product id */ esc_html__( 'Product ID: %s', 'woo-smart-wishlist' ), absint( $pid ) ) . ' | <a href="#" class="woosw_action" data-pid="' . esc_attr( $pid ) . '">' . esc_html__( 'See in wishlist', 'woo-smart-wishlist' ) . '</a></span></div>';
                                    echo '</div><!-- /woosw-quickview-item-info -->';
                                    echo '</div><!-- /woosw-quickview-item -->';
                                } else {
                                    echo '<div class="woosw-quickview-item">';
                                    echo '<div class="woosw-quickview-item-image">' . wp_kses_post( wc_placeholder_img() ) . '</div>';
                                    echo '<div class="woosw-quickview-item-info">';
                                    echo '<div class="woosw-quickview-item-title">' . sprintf( /* translators: product id */ esc_html__( 'Product ID: %s', 'woo-smart-wishlist' ), absint( $pid ) ) . '</div>';
                                    echo '<div class="woosw-quickview-item-data">' . esc_html__( 'This product is not available!', 'woo-smart-wishlist' ) . '</div>';
                                    echo '</div><!-- /woosw-quickview-item-info -->';
                                    echo '</div><!-- /woosw-quickview-item -->';
                                }
                            }
                        } else {
                            echo '<div class="woosw-quickview-item">';
                            echo '<div class="woosw-quickview-item-image">' . wp_kses_post( wc_placeholder_img() ) . '</div>';
                            echo '<div class="woosw-quickview-item-info">';
                            echo '<div class="woosw-quickview-item-title">' . sprintf( /* translators: wishlist key */ esc_html__( 'Wishlist #%s', 'woo-smart-wishlist' ), $key ) . '</div>';
                            echo '<div class="woosw-quickview-item-data">' . esc_html__( 'This wishlist have no product!', 'woo-smart-wishlist' ) . '</div>';
                            echo '</div><!-- /woosw-quickview-item-info -->';
                            echo '</div><!-- /woosw-quickview-item -->';
                        }
                    } elseif ( isset( $_POST['pid'] ) ) {
                        $pid       = absint( sanitize_text_field( wp_unslash( $_POST['pid'] ?? 0 ) ) );
                        $per_page  = absint( apply_filters( 'woosw_quickview_per_page', 10 ) );
                        $page      = absint( wp_unslash( $_POST['page'] ?? 1 ) );
                        $offset    = ( $page - 1 ) * $per_page;
                        $like_name = $wpdb->esc_like( 'woosw_list_' ) . '%';
                        $like_val  = '%i:' . $pid . ';%';
                        $total     = $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM `' . $wpdb->prefix . 'options` WHERE `option_name` LIKE %s AND `option_value` LIKE %s', $like_name, $like_val ) );
                        $keys      = $wpdb->get_results( $wpdb->prepare( 'SELECT option_name FROM `' . $wpdb->prefix . 'options` WHERE `option_name` LIKE %s AND `option_value` LIKE %s LIMIT %d OFFSET %d', $like_name, $like_val, $per_page, $offset ) );

                        if ( $total && is_countable( $keys ) && count( $keys ) ) {
                            echo '<div class="woosw-quickview-item">';

                            if ( $_product = wc_get_product( $pid ) ) {
                                echo '<div class="woosw-quickview-item-image">' . wp_kses_post( $_product->get_image() ) . '</div>';
                                echo '<div class="woosw-quickview-item-info">';
                                echo '<div class="woosw-quickview-item-title"><a href="' . esc_url( get_edit_post_link( $pid ) ) . '" target="_blank">' . $_product->get_name() . '</a></div>';
                                echo '<div class="woosw-quickview-item-data">' . sprintf( /* translators: product id */ esc_html__( 'Product ID: %s', 'woo-smart-wishlist' ), absint( $pid ) ) . ' | ' . sprintf( /* translators: count */ _n( '%s wishlist', '%s wishlists', $total, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $total ) ) ) . '</div>';
                            } else {
                                echo '<div class="woosw-quickview-item-image">' . wp_kses_post( wc_placeholder_img() ) . '</div>';
                                echo '<div class="woosw-quickview-item-info">';
                                echo '<div class="woosw-quickview-item-title">' . sprintf( /* translators: product id */ esc_html__( 'Product ID: %s', 'woo-smart-wishlist' ), absint( $pid ) ) . '</div>';
                                echo '<div class="woosw-quickview-item-data">' . esc_html__( 'This product is not available!', 'woo-smart-wishlist' ) . '</div>';
                            }

                            // paging
                            if ( $total > $per_page ) {
                                $pages = ceil( $total / $per_page );
                                echo '<div class="woosw-quickview-item-paging">Page ';

                                echo '<select class="woosw_paging" data-pid="' . absint( $pid ) . '">';

                                for ( $i = 1; $i <= $pages; $i ++ ) {
                                    echo '<option value="' . absint( $i ) . '" ' . selected( $page, $i, false ) . '>' . absint( $i ) . '</option>';
                                }

                                echo '</select> / ' . absint( $pages );

                                echo '</div><!-- /woosw-quickview-item-paging -->';
                            }

                            echo '</div><!-- /woosw-quickview-item-info -->';
                            echo '</div><!-- /woosw-quickview-item -->';

                            foreach ( $keys as $item ) {
                                $products       = get_option( $item->option_name );
                                $products_count = count( $products );
                                $key            = str_replace( 'woosw_list_', '', $item->option_name );
                                $user           = $wpdb->get_results( $wpdb->prepare( 'SELECT user_id FROM `' . $wpdb->usermeta . '` WHERE `meta_key` = "woosw_keys" AND `meta_value` LIKE %s LIMIT 1', '%"' . $key . '"%' ) );

                                echo '<div class="woosw-quickview-item">';
                                echo '<div class="woosw-quickview-item-image"><a href="' . esc_url( Woosw_Helper::get_url( $key, true ) ) . '" target="_blank">' . esc_html( $key ) . '</a></div>';
                                echo '<div class="woosw-quickview-item-info">';

                                if ( ! empty( $user ) ) {
                                    $user_id   = $user[0]->user_id;
                                    $user_data = get_userdata( $user_id );

                                    echo '<div class="woosw-quickview-item-title"><a href="#" class="woosw_action" data-uid="' . esc_attr( $user_id ) . '">' . esc_html( $user_data->user_login ) . '</a></div>';
                                    echo '<div class="woosw-quickview-item-data">' . esc_html( $user_data->user_email ) . '  | <a href="#" class="woosw_action woosw_action_' . absint( $products_count ) . '" data-key="' . esc_attr( $key ) . '">' . sprintf( /* translators: count */ _n( '%s product', '%s products', $products_count, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $products_count ) ) ) . '</a></div>';
                                } else {
                                    echo '<div class="woosw-quickview-item-title">' . esc_html__( 'Guest', 'woo-smart-wishlist' ) . '</div>';
                                    echo '<div class="woosw-quickview-item-data"><a href="#" class="woosw_action" data-key="' . esc_attr( $key ) . '">' . sprintf( /* translators: count */ _n( '%s product', '%s products', $products_count, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $products_count ) ) ) . '</a></div>';
                                }

                                echo '</div><!-- /woosw-quickview-item-info -->';
                                echo '</div><!-- /woosw-quickview-item -->';
                            }
                        }
                    } elseif ( isset( $_POST['uid'] ) ) {
                        $user_id = (int) sanitize_text_field( wp_unslash( $_POST['uid'] ?? 0 ) );
                        $keys    = get_user_meta( $user_id, 'woosw_keys', true ) ?: [];

                        if ( $user = get_user_by( 'id', $user_id ) ) {
                            echo '<div class="woosw-quickview-item">';
                            echo '<div class="woosw-quickview-item-image"><img src="' . esc_url( get_avatar_url( $user_id ) ) . '"  alt=""/></div>';
                            echo '<div class="woosw-quickview-item-info">';
                            echo '<div class="woosw-quickview-item-title"><a href="' . esc_url( get_edit_user_link( $user_id ) ) . '" target="_blank">' . esc_html( $user->user_login ) . '</a></div>';
                            echo '<div class="woosw-quickview-item-data">' . esc_html( $user->user_email ) . '</div>';
                            echo '</div><!-- /woosw-quickview-item-info -->';
                            echo '</div><!-- /woosw-quickview-item -->';
                        }

                        if ( is_array( $keys ) && count( $keys ) ) {
                            foreach ( $keys as $key => $data ) {
                                $products       = Woosw_Helper::get_ids( $key );
                                $products_count = count( $products );

                                echo '<div class="woosw-quickview-item">';
                                echo '<div class="woosw-quickview-item-image"><a href="' . esc_url( Woosw_Helper::get_url( $key, true ) ) . '" target="_blank">' . esc_html( $key ) . '</a></div>';
                                echo '<div class="woosw-quickview-item-info">';
                                echo '<div class="woosw-quickview-item-title">' . ( ! empty( $data['name'] ) ? esc_html( $data['name'] ) : 'Primary' ) . '</div>';
                                echo '<div class="woosw-quickview-item-data"><a href="#" class="woosw_action woosw_action_' . absint( $products_count ) . '" data-key="' . esc_attr( $key ) . '">' . sprintf( /* translators: count */ _n( '%s product', '%s products', $products_count, 'woo-smart-wishlist' ), esc_html( number_format_i18n( $products_count ) ) ) . '</a></div>';
                                echo '</div><!-- /woosw-quickview-item-info -->';
                                echo '</div><!-- /woosw-quickview-item -->';
                            }
                        }
                    }

                    echo '</div><!-- /woosw-quickview-items -->';
                    echo wp_kses_post( apply_filters( 'woosw_wishlist_quickview', ob_get_clean() ) );
                    die();
                }

                function sortable_columns( $columns ) {
                    $columns['woosw'] = 'woosw';

                    return $columns;
                }

                function request( $vars ) {
                    if ( isset( $vars['orderby'] ) && 'woosw' == $vars['orderby'] ) {
                        $vars = array_merge( $vars, [
                                'meta_key' => 'woosw_count',
                                'orderby'  => 'meta_value_num'
                        ] );
                    }

                    return $vars;
                }

                function wp_login( $user_login, $user ) {
                    if ( isset( $user->data->ID ) ) {
                        $key = get_user_meta( $user->data->ID, 'woosw_key', true );

                        if ( empty( $key ) ) {
                            $key = Woosw_Helper::generate_key();

                            while ( Woosw_Helper::exists_key( $key ) ) {
                                $key = Woosw_Helper::generate_key();
                            }

                            // set a new key
                            update_user_meta( $user->data->ID, 'woosw_key', $key );
                            update_option( 'woosw_list_' . $key, [], false );
                        }

                        // multiple wishlist
                        if ( ! get_user_meta( $user->data->ID, 'woosw_keys', true ) ) {
                            update_user_meta( $user->data->ID, 'woosw_keys', [
                                    $key => [
                                            'type' => 'primary',
                                            'name' => '',
                                            'time' => ''
                                    ]
                            ] );
                        }

                        if ( ! empty( $_COOKIE['woosw_key'] ) ) {
                            Woosw_Helper::set_cookie( 'woosw_key_ori', sanitize_text_field( wp_unslash( $_COOKIE['woosw_key'] ) ), null, true );
                        }

                        Woosw_Helper::set_cookie( 'woosw_key', $key );
                    }
                }

                function wp_logout( $user_id ) {
                    if ( ! empty( $_COOKIE['woosw_key_ori'] ) ) {
                        Woosw_Helper::set_cookie( 'woosw_key', sanitize_text_field( wp_unslash( $_COOKIE['woosw_key_ori'] ) ) );
                    } else {
                        Woosw_Helper::delete_cookie( 'woosw_key_ori', true );
                        Woosw_Helper::delete_cookie( 'woosw_key' );
                        unset( $_COOKIE['woosw_key_ori'] );
                        unset( $_COOKIE['woosw_key'] );
                    }
                }

                function display_post_states( $states, $post ) {
                    if ( 'page' == get_post_type( $post->ID ) && $post->ID === absint( Woosw_Helper::get_setting( 'page_id' ) ) ) {
                        $states[] = esc_html__( 'Wishlist', 'woo-smart-wishlist' );
                    }

                    return $states;
                }

                function users_columns( $column ) {
                    $column['woosw'] = esc_html__( 'Wishlist', 'woo-smart-wishlist' );

                    return $column;
                }

                function users_columns_content( $val, $column_name, $user_id ) {
                    if ( $column_name === 'woosw' ) {
                        $keys = get_user_meta( $user_id, 'woosw_keys', true );

                        if ( is_array( $keys ) && ! empty( $keys ) ) {
                            $val = '<a href="#" class="woosw_action" data-uid="' . esc_attr( $user_id ) . '">' . count( $keys ) . '</a>';
                        }
                    }

                    return $val;
                }

                function dropdown_cats_multiple( $output, $r ) {
                    if ( isset( $r['multiple'] ) && $r['multiple'] ) {
                        $output = preg_replace( '/^<select/i', '<select multiple', $output );
                        $output = str_replace( "name='{$r['name']}'", "name='{$r['name']}[]'", $output );

                        foreach ( array_map( 'trim', explode( ",", $r['selected'] ) ) as $value ) {
                            $output = str_replace( "value=\"{$value}\"", "value=\"{$value}\" selected", $output );
                        }
                    }

                    return $output;
                }

                function wpcsm_locations( $locations ) {
                    $locations['WPC Smart Wishlist'] = [
                            'woosw_before_items'                 => esc_html__( 'Before container', 'woo-smart-wishlist' ),
                            'woosw_after_items'                  => esc_html__( 'After container', 'woo-smart-wishlist' ),
                            'woosw_wishlist_items_before'        => esc_html__( 'Before product list', 'woo-smart-wishlist' ),
                            'woosw_wishlist_items_after'         => esc_html__( 'After product list', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_before'         => esc_html__( 'Before product', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_after'          => esc_html__( 'After product', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_image_before'   => esc_html__( 'Before product image', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_image_after'    => esc_html__( 'After product image', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_info_before'    => esc_html__( 'Before product info', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_info_after'     => esc_html__( 'After product info', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_actions_before' => esc_html__( 'Before product buttons', 'woo-smart-wishlist' ),
                            'woosw_wishlist_item_actions_after'  => esc_html__( 'After product buttons', 'woo-smart-wishlist' ),
                    ];

                    return $locations;
                }

                function wcml_multi_currency( $ajax_actions ) {
                    $ajax_actions[] = 'view_wishlist';
                    $ajax_actions[] = 'wishlist_add';
                    $ajax_actions[] = 'wishlist_remove';
                    $ajax_actions[] = 'wishlist_load';
                    $ajax_actions[] = 'woosw_view_wishlist';
                    $ajax_actions[] = 'woosw_add';
                    $ajax_actions[] = 'woosw_remove';
                    $ajax_actions[] = 'woosw_load';
                    $ajax_actions[] = 'woosw_get_data';

                    return $ajax_actions;
                }

                function get_fragments() {
                    return apply_filters(
                            'woosw_fragments',
                            [
                                    '.woosw-menu-item' => self::get_menu_item()
                            ]
                    );
                }

                // backward compatibility

                public static function sanitize_array( $arr ) {
                    return Woosw_Helper::sanitize_array( $arr );
                }

                public static function generate_key() {
                    return Woosw_Helper::generate_key();
                }

                public static function can_edit( $key ) {
                    return Woosw_Helper::can_edit( $key );
                }

                public static function is_owner( $key ) {
                    return Woosw_Helper::is_owner( $key );
                }

                public static function is_collabable( $key ) {
                    return Woosw_Helper::is_collabable( $key );
                }

                public static function is_collabable_enabled() {
                    return Woosw_Helper::is_collabable_enabled();
                }

                public static function get_page_id() {
                    return Woosw_Helper::get_page_id();
                }

                public static function get_key( $new = false ) {
                    return Woosw_Helper::get_key( $new );
                }

                public static function exists_key( $key ) {
                    return Woosw_Helper::exists_key( $key );
                }

                public static function get_ids( $key = null ) {
                    return Woosw_Helper::get_ids( $key );
                }

                public static function get_products() {
                    return Woosw_Helper::get_products();
                }

                public static function get_url( $key = null, $full = false ) {
                    return Woosw_Helper::get_url( $key, $full );
                }

                public static function get_count( $key = null ) {
                    return Woosw_Helper::get_count( $key );
                }
            } // end class

            return WPCleverWoosw::instance();
        } // end function

        return null;
    } // end if
} // end check

if ( ! function_exists( 'woosw_plugin_activate' ) ) {
    function woosw_plugin_activate() {
        // create a wishlist page
        $wishlist_page = get_page_by_path( 'wishlist' );

        if ( empty( $wishlist_page ) ) {
            $wishlist_page_data = [
                    'post_status'    => 'publish',
                    'post_type'      => 'page',
                    'post_author'    => 1,
                    'post_name'      => 'wishlist',
                    'post_title'     => esc_html__( 'Wishlist', 'woo-smart-wishlist' ),
                    'post_content'   => '[woosw_list]',
                    'post_parent'    => 0,
                    'comment_status' => 'closed'
            ];
            $wishlist_page_id   = wp_insert_post( $wishlist_page_data );

            update_option( 'woosw_page_id', $wishlist_page_id );
        }
    }
}

if ( ! function_exists( 'woosw_notice_wc' ) ) {
    function woosw_notice_wc() {
        ?>
        <div class="error">
            <p><strong>WPC Smart Wishlist</strong> requires WooCommerce version 3.0 or greater.</p>
        </div>
        <?php
    }
}
