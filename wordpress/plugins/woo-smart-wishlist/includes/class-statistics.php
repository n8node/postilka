<?php
defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'Woosw_Statistics' ) ) {
    class Woosw_Statistics {
        protected static $instance = null;

        public static function instance() {
            if ( is_null( self::$instance ) ) {
                self::$instance = new self();
            }

            return self::$instance;
        }


        public static function create_tables() {
            global $wpdb;
            $table_name      = $wpdb->prefix . 'wpc_wishlist_stats';
            $charset_collate = $wpdb->get_charset_collate();

            $sql = "CREATE TABLE IF NOT EXISTS $table_name (
				id bigint(20) NOT NULL AUTO_INCREMENT,
				product_id bigint(20) NOT NULL,
				user_id bigint(20) NOT NULL,
				action varchar(10) NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY product_id (product_id),
				KEY created_at (created_at)
			) $charset_collate;";

            require_once ABSPATH . 'wp-admin/includes/upgrade.php';
            dbDelta( $sql );
        }

        public function __construct() {
            $enable_statistics = Woosw_Helper::get_setting( 'enable_statistics', 'yes' );

            if ( $enable_statistics === 'yes' ) {
                add_action( 'woosw_add', [ $this, 'track_add' ], 10, 2 );
                add_action( 'woosw_remove', [ $this, 'track_remove' ], 10, 2 );
                add_action( 'woosw_empty', [ $this, 'track_empty' ] );
                add_action( 'wp_ajax_woosw_get_stats', [ $this, 'ajax_get_stats' ] );
            }
        }

        public function enqueue_assets() {
            wp_enqueue_style( 'woosw-statistics', WOOSW_URI . 'assets/css/statistics.css', [], WOOSW_VERSION );
            wp_enqueue_script( 'chart-js', WOOSW_URI . 'assets/libs/chart.js/chart.umd.min.js', [], '4.5.1', true );
            wp_enqueue_script( 'woosw-statistics', WOOSW_URI . 'assets/js/statistics.js', [
                    'jquery',
                    'chart-js'
            ], WOOSW_VERSION, true );

            wp_localize_script( 'woosw-statistics', 'woosw_stats', [
                    'nonce'        => wp_create_nonce( 'woosw-stats' ),
                    'no_data_text' => esc_html__( 'No data yet.', 'woo-smart-wishlist' ),
                    'added_text'   => esc_html__( 'Added', 'woo-smart-wishlist' ),
                    'removed_text' => esc_html__( 'Removed', 'woo-smart-wishlist' ),
            ] );
        }

        public function track_add( $product_id, $key ) {
            global $wpdb;

            if ( ! empty( $product_id ) ) {
                $wpdb->insert(
                        $wpdb->prefix . 'wpc_wishlist_stats',
                        [
                                'product_id' => $product_id,
                                'user_id'    => get_current_user_id(),
                                'action'     => 'add',
                                'created_at' => current_time( 'mysql' ),
                        ],
                        [ '%d', '%d', '%s', '%s' ]
                );
            }
        }

        public function track_remove( $product_id, $key ) {
            global $wpdb;

            if ( ! empty( $product_id ) ) {
                $wpdb->insert(
                        $wpdb->prefix . 'wpc_wishlist_stats',
                        [
                                'product_id' => $product_id,
                                'user_id'    => get_current_user_id(),
                                'action'     => 'remove',
                                'created_at' => current_time( 'mysql' ),
                        ],
                        [ '%d', '%d', '%s', '%s' ]
                );
            }
        }

        public function track_empty( $key ) {
            global $wpdb;
            $products = Woosw_Helper::get_ids( $key );

            if ( ! empty( $products ) ) {
                foreach ( array_keys( $products ) as $product_id ) {
                    $wpdb->insert(
                            $wpdb->prefix . 'wpc_wishlist_stats',
                            [
                                    'product_id' => $product_id,
                                    'user_id'    => get_current_user_id(),
                                    'action'     => 'remove',
                                    'created_at' => current_time( 'mysql' ),
                            ],
                            [ '%d', '%d', '%s', '%s' ]
                    );
                }
            }
        }

        public function ajax_get_stats() {
            check_ajax_referer( 'woosw-stats', 'nonce' );

            if ( ! current_user_can( 'manage_options' ) ) {
                wp_send_json_error( 'Permission denied' );
            }

            global $wpdb;
            $table_name = $wpdb->prefix . 'wpc_wishlist_stats';
            $period     = sanitize_text_field( wp_unslash( $_POST['period'] ?? '7days' ) );
            $from       = sanitize_text_field( wp_unslash( $_POST['from'] ?? '' ) );
            $to         = sanitize_text_field( wp_unslash( $_POST['to'] ?? '' ) );

            $start_date = '';
            $end_date   = current_time( 'mysql' );

            if ( $period === '7days' ) {
                $start_date = gmdate( 'Y-m-d 00:00:00', strtotime( '-6 days' ) );
            } elseif ( $period === '30days' ) {
                $start_date = gmdate( 'Y-m-d 00:00:00', strtotime( '-29 days' ) );
            } elseif ( $period === 'custom' && ! empty( $from ) && ! empty( $to ) ) {
                $start_date = $from . ' 00:00:00';
                $end_date   = $to . ' 23:59:59';
            } else {
                $start_date = gmdate( 'Y-m-d 00:00:00', strtotime( '-6 days' ) );
            }

            $results = $wpdb->get_results( $wpdb->prepare(
                    "SELECT action, DATE(created_at) as date, COUNT(*) as count 
                        FROM %i 
                        WHERE created_at BETWEEN %s AND %s 
                        GROUP BY action, DATE(created_at) 
                        ORDER BY date ASC",
                    $table_name,
                    $start_date,
                    $end_date
            ) );

            $labels        = [];
            $added         = [];
            $removed       = [];
            $total_added   = 0;
            $total_removed = 0;

            $current = strtotime( $start_date );
            $last    = strtotime( $end_date );

            while ( $current <= $last ) {
                $date             = gmdate( 'Y-m-d', $current );
                $labels[]         = $date;
                $added[ $date ]   = 0;
                $removed[ $date ] = 0;
                $current          = strtotime( '+1 day', $current );
            }

            foreach ( $results as $row ) {
                if ( $row->action === 'add' ) {
                    $added[ $row->date ] = (int) $row->count;
                    $total_added         += (int) $row->count;
                } else {
                    $removed[ $row->date ] = (int) $row->count;
                    $total_removed         += (int) $row->count;
                }
            }

            // top added
            $top_added_results = $wpdb->get_results( $wpdb->prepare(
                    "SELECT product_id, COUNT(*) as count 
                        FROM %i 
                        WHERE action = 'add' AND created_at BETWEEN %s AND %s 
                        GROUP BY product_id 
                        ORDER BY count DESC 
                        LIMIT 5",
                    $table_name,
                    $start_date,
                    $end_date
            ) );

            $top_added = [];
            foreach ( $top_added_results as $row ) {
                $product     = wc_get_product( $row->product_id );
                $top_added[] = [
                        'name'  => $product ? $product->get_name() : '#' . $row->product_id,
                        'count' => $row->count,
                        'url'   => get_permalink( $row->product_id )
                ];
            }

            // top removed
            $top_removed_results = $wpdb->get_results( $wpdb->prepare(
                    "SELECT product_id, COUNT(*) as count 
                        FROM %i 
                        WHERE action = 'remove' AND created_at BETWEEN %s AND %s 
                        GROUP BY product_id 
                        ORDER BY count DESC 
                        LIMIT 5",
                    $table_name,
                    $start_date,
                    $end_date
            ) );

            $top_removed = [];
            foreach ( $top_removed_results as $row ) {
                $product       = wc_get_product( $row->product_id );
                $top_removed[] = [
                        'name'  => $product ? $product->get_name() : '#' . $row->product_id,
                        'count' => $row->count,
                        'url'   => get_edit_post_link( $row->product_id )
                ];
            }

            wp_send_json_success( [
                    'labels'        => $labels,
                    'added'         => array_values( $added ),
                    'removed'       => array_values( $removed ),
                    'total_added'   => $total_added,
                    'total_removed' => $total_removed,
                    'top_added'     => $top_added,
                    'top_removed'   => $top_removed
            ] );
        }

        public function render() {
            $enable_statistics = Woosw_Helper::get_setting( 'enable_statistics', 'yes' );

            if ( $enable_statistics !== 'yes' ) {
                ?>
                <div class="woosw-card woosw-statistics-disabled">
                    <div class="woosw-notice-info">
                        <p><?php
                                // translators: %s is a link to the Settings page.
                                printf( esc_html__( 'Statistics is currently disabled. Please enable it in %s to start tracking and viewing data.', 'woo-smart-wishlist' ), '<a href="' . esc_url( admin_url( 'admin.php?page=wpclever-woosw' ) ) . '">' . esc_html__( 'Settings', 'woo-smart-wishlist' ) . '</a>' );
                            ?></p>
                    </div>
                </div>
                <?php
                return;
            }

            $this->enqueue_assets();
            ?>
            <div class="woosw-statistics">
                <div class="woosw-statistics-header">
                    <div class="woosw-statistics-filters">
                        <select id="woosw-stats-period">
                            <option value="7days"><?php esc_html_e( 'Last 7 days', 'woo-smart-wishlist' ); ?></option>
                            <option value="30days"><?php esc_html_e( 'Last 30 days', 'woo-smart-wishlist' ); ?></option>
                            <option value="custom"><?php esc_html_e( 'Custom range', 'woo-smart-wishlist' ); ?></option>
                        </select>
                        <div id="woosw-stats-custom-range">
                            <input type="date" id="woosw-stats-from">
                            <input type="date" id="woosw-stats-to">
                            <button type="button" class="button"
                                    id="woosw-stats-apply"><?php esc_html_e( 'Apply', 'woo-smart-wishlist' ); ?></button>
                        </div>
                    </div>
                </div>
                <div class="woosw-statistics-content">
                    <div class="woosw-statistics-chart-container">
                        <canvas id="woosw-stats-chart"></canvas>
                    </div>
                </div>
                <div class="woosw-statistics-top-products">
                    <div class="woosw-top-section">
                        <div class="woosw-top-header">
                            <h3><?php esc_html_e( 'Top 5 Added', 'woo-smart-wishlist' ); ?></h3>
                            <div class="woosw-stat-box count-add">
                                <span class="label"><?php esc_html_e( 'Total Added', 'woo-smart-wishlist' ); ?></span>
                                <span class="value" id="woosw-total-added">0</span>
                            </div>
                        </div>
                        <ul id="woosw-top-added-list" class="woosw-top-list">
                            <li><?php esc_html_e( 'No data yet.', 'woo-smart-wishlist' ); ?></li>
                        </ul>
                    </div>
                    <div class="woosw-top-section">
                        <div class="woosw-top-header">
                            <h3><?php esc_html_e( 'Top 5 Removed', 'woo-smart-wishlist' ); ?></h3>
                            <div class="woosw-stat-box count-remove">
                                <span class="label"><?php esc_html_e( 'Total Removed', 'woo-smart-wishlist' ); ?></span>
                                <span class="value" id="woosw-total-removed">0</span>
                            </div>
                        </div>
                        <ul id="woosw-top-removed-list" class="woosw-top-list">
                            <li><?php esc_html_e( 'No data yet.', 'woo-smart-wishlist' ); ?></li>
                        </ul>
                    </div>
                </div>
            </div>
            <?php
        }
    }

    return Woosw_Statistics::instance();
}
