<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Pxl_Auto_Updater {

    private $theme_slug;
    private $json_url   = 'https://api.casethemes.net/themes/theme-list.json';
    private $cache_key  = 'pxl_theme_update_metadata';

    public function __construct() {
        //$this->theme_slug = get_stylesheet();
        $this->theme_slug = get_option( 'template' );
        add_filter( 'update_plugins_api.casethemes.net', [ $this, 'pxl_update_plugins_api' ], 10, 4 );
        add_action( 'pxl_admin_dashboard_auto_update_theme', [ $this, 'pxl_view_theme_update_button' ] );
        add_action( 'admin_post_pxl_update_theme', [ $this, 'handle_update_theme' ] );
    }

    public function pxl_update_plugins_api($update, $plugin_data, $plugin_file, $locales){
        $url      = 'http://api.casethemes.net/';
        $http_url = $url;
        $ssl      = wp_http_supports( array( 'ssl' ) );
        if ( $ssl ) {
            $url = set_url_scheme( $url, 'https' );
        } 
        $raw_response = wp_remote_get(
            add_query_arg( ['action' => 'pxl_get_update_plugins', 'plugin_file' => $plugin_file], $url ),
            array( 'timeout' => 15 )
        );
        if ( $ssl && is_wp_error( $raw_response ) ) {
            $raw_response = wp_remote_get(
                add_query_arg( ['action' => 'pxl_get_update_plugins', 'plugin_file' => $plugin_file], $http_url ),
                array( 'timeout' => 15 )
            );
        }
        
        if ( is_wp_error( $raw_response ) || 200 !== wp_remote_retrieve_response_code( $raw_response ) ) {
            return $update;
        }
        $response = json_decode( wp_remote_retrieve_body( $raw_response ), true ); 
        if ( $response && is_array( $response ) ) {
            $update = [
                'version' => $response[$plugin_file]['version'],
                'package' => $response[$plugin_file]['package']
            ];
        }
        return $update;
    } 
 
    public function pxl_view_theme_update_button(){
        $metadata = $this->get_remote_metadata();
        $local_theme = wp_get_theme( $this->theme_slug );
        $has_update = false;

        if ( $metadata && ! empty( $metadata['version'] ) && version_compare( $metadata['version'], $local_theme->get( 'Version' ), '>' ) ) {
            $has_update = true;
        }
        ?>
        <div class="pxl-iconbox">
            <span class="pxl-icon-container">
                <img src="<?php echo esc_url(get_template_directory_uri() . '/inc/admin/assets/img/check.png' ) ?>" alt="<?php esc_attr_e( 'Check', 'brighthub' ); ?>">
            </span>
            <div class="pxl-iconbox-contents">
            <?php 
                if ( $has_update ) {
                    echo '<h6>'.esc_html__('Theme Updater: ', PXL_TEXT_DOMAIN).'<span>'.esc_html__('Current version ', PXL_TEXT_DOMAIN).'('.$local_theme->get( 'Version' ).')</span></h6>';
                    echo '<form method="post" class="pxl-form-auto-update" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
                    wp_nonce_field( 'pxl_update_theme_action', 'pxl_uptheme_nonce' );
                    echo '<input type="hidden" name="action" value="pxl_update_theme">';
                    echo '<p><button class="btn button" name="submit" type="submit">'.esc_html__('Update To Version: ', PXL_TEXT_DOMAIN).$metadata['version'].'</button></p>';
                    echo '</form>';
                } else {
                    echo '<h6>'.esc_html__('Theme Updater', PXL_TEXT_DOMAIN).'</h6>';
                    echo '<p>'.esc_html__('Theme is Up To Date:', PXL_TEXT_DOMAIN).' <strong>' . esc_html( $local_theme->get( 'Version' ) ) . '</strong></p>';
                }
            ?>
            </div>
        </div>
        <?php 
    }
    
    private function inject_theme_update( $metadata ) {
        $updates = get_site_transient( 'update_themes' );
        if ( ! is_object( $updates ) ) {
            $updates = new stdClass();
        }

        $updates->response[ $this->theme_slug ] = [
            'theme'       => $this->theme_slug,
            'new_version' => $metadata['version'],
            'url'         => $metadata['download_url'],
            'package'     => $metadata['download_url']
        ];

        set_site_transient( 'update_themes', $updates );
    }

    public function handle_update_theme() {
        if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'pxl_update_theme_action', 'pxl_uptheme_nonce' ) ) {
            wp_die( 'Permission denied or invalid nonce.' );
        }

        $metadata = $this->get_remote_metadata();
        if ( ! $metadata || empty( $metadata['download_url'] ) ) {
            wp_die( 'Get update information false' );
        }

        $this->inject_theme_update( $metadata );

        include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/theme.php';

        $upgrader = new Theme_Upgrader( new Automatic_Upgrader_Skin() );

        $result = $upgrader->upgrade( $this->theme_slug );
  
        if ( is_wp_error( $result ) || $result === false ) {
            $msg = is_wp_error( $result ) ? $result->get_error_message() : 'No update was performed';
            wp_die( 'Update failed: ' . esc_html( $msg ) );
        }

        wp_safe_redirect( admin_url( 'admin.php?page=pxlart&updated=1' ) );
        exit;
    }

    
    private function get_remote_metadata() {
        $cached = get_transient( $this->cache_key );
        if ( is_array( $cached ) && ! empty( $cached ) ) {
            return $cached;
        }

        $response = wp_remote_get( $this->json_url, [ 'timeout' => 15, 'sslverify' => true ] );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            set_transient( $this->cache_key, [], 5 * MINUTE_IN_SECONDS );
            return false;
        }
 
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( ! is_array( $data ) || empty( $data['themes'][ $this->theme_slug ] ) ) {
            set_transient( $this->cache_key, [], 10 * MINUTE_IN_SECONDS );
            return false;
        }

        $theme_data = $data['themes'][ $this->theme_slug ];
        set_transient( $this->cache_key, $theme_data, 24 * HOUR_IN_SECONDS );
        return $theme_data;
    }
}

new Pxl_Auto_Updater();


