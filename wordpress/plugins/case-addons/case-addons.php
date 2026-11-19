<?php

/**
 * Plugin Name: Case Addons
 * Description: Add many widgets, shortcodes and custom post types for your theme.
 * Plugin URI:  http://casethemes.net/
 * Version:     1.3.1
 * Author:      Case Themes
 * Author URI:  https://themeforest.net/user/case-themes/
 * Update URI:  https://api.casethemes.net/
 * Text Domain: pixelart-core
 */

use Elementor\Plugin;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

define('PXL_TEXT_DOMAIN', 'pixelart-core');
define('PXL_PATH', plugin_dir_path(__FILE__));
define('PXL_URL', plugin_dir_url(__FILE__));

class Pxltheme_Core
{

    const VERSION = '1.3.0';

    const MINIMUM_ELEMENTOR_VERSION = '3.0.0';

    const MINIMUM_PHP_VERSION = '7.0';
    private static $_instance = null;
    public $post_metabox = null;
    public $taxonomy_meta = null;
    public $plugin_name = '';

    public function __construct()
    {
        if (!function_exists('get_plugin_data'))
            require_once(ABSPATH . 'wp-admin/includes/plugin.php');

        $this->includes();

        add_action('admin_init', [$this, 'pxl_admin_init'], 10, 1);
        add_action('init', [$this, 'pxl_init']);
        add_action('admin_enqueue_scripts', array($this, 'pxl_admin_enqueue_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'pxl_register_script'), 3);
        add_action('plugins_loaded', [$this, 'pxl_handler']);
        add_action('plugins_loaded', [$this, 'pxl_elementor']);

        add_action('admin_notices', [$this, 'activate_theme_notice'], 100);

        add_action('admin_bar_menu', [$this, 'register_admin_bar_menu']);
        add_action('admin_bar_menu', [$this, 'remove_from_admin_bar'], 999);

        add_action('redux/construct', [$this, 'pxl_validate_redux_framework']);
    }

    public function includes()
    {

        require_once(__DIR__ . '/inc/functions.php');
        require_once(__DIR__ . '/inc/elementor/el-functions.php');

        if (!class_exists('PXL_CPT_Register')) {
            require_once PXL_PATH . 'inc/post-type/cpt-register.php';
        }

        if (!class_exists('PXL_CTax_Register')) {
            require_once PXL_PATH . 'inc/post-type/ctax-register.php';
        }
        if (!class_exists('PXL_MegaMenu_Register')) {
            require_once PXL_PATH . 'inc/mega-menu/class-megamenu.php';
        }
    }

    public static function instance()
    {

        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    function pxl_admin_init()
    {
        $plugin_data = get_plugin_data(__FILE__);
        $this->plugin_name = $plugin_data['Name'];
        // import demo data 
        if (!class_exists('Pxl_Importer')) {
            require_once PXL_PATH . 'src/core-importer/importer-handles.php';
        }
    }


    public function pxl_init()
    {

        //update woo attribute after imported
        $woo_term_imported = get_option('pxl_woo_term_imported', "null");
        if ($woo_term_imported === "not_imported" && !class_exists('PXL_Woo_Attributes_Handle')) {
            require_once PXL_PATH . 'src/core-importer/woo_attributes_handles.php';
        }
        //load_scss_lib
        $scssc_lib = apply_filters('pxl_scssc_lib', 'old');
        $pxl_scssc_on = apply_filters('pxl_scssc_on', false);
        if ($pxl_scssc_on && $scssc_lib === 'old' && !class_exists('scssc')) {
            require_once __DIR__ . '/src/scss.inc.php';
        }
        if ($pxl_scssc_on && $scssc_lib === 'new' && !class_exists('\ScssPhp\ScssPhp\Compiler')) {
            require_once __DIR__ . '/src/scss/scss.inc.php';
        }

        //load_meta_redux_opt
        if (!class_exists('ReduxFramework')) {
            add_action('admin_notices', array($this, 'redux_framework_notice'));
        } else {
            if (!class_exists('PXL_Post_Metabox')) {
                require_once PXL_PATH . 'inc/meta-box/class-post-metabox.php';

                if (empty($this->post_metabox)) {
                    $this->post_metabox = new PXL_Post_Metabox();
                }
            }
            if (!class_exists('PXL_Taxonomy_Meta')) {
                require_once PXL_PATH . 'inc/meta-box/class-taxonomy-meta.php';

                if (empty($this->taxonomy_meta)) {
                    $this->taxonomy_meta = new PXL_Taxonomy_Meta();
                }
            }
        }
    }

    public function pxl_admin_enqueue_scripts()
    {
        wp_enqueue_style('pxl-admin-css', PXL_URL . 'assets/css/admin.css', [], '1.0.0');
        wp_enqueue_script('pxl-admin-js', PXL_URL . 'assets/js/pxl-admin.js', ['jquery'], '1.0.0', true);
    }

    public function pxl_register_script()
    {
        $awesome_pro_support = apply_filters('pxl_support_awesome_pro', true);
        /* Styles */
        wp_enqueue_style('pxl-main-css', PXL_URL . 'assets/css/main.css', [], '1.0.0');
        if ($awesome_pro_support)
            wp_register_style('font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro');

        wp_register_style('pxl-slick-css', PXL_URL . 'assets/js/libs/slick/slick.css', [], '1.0.0');

        /* Scripts */
        wp_register_script('waypoints', PXL_URL . 'assets/js/libs/waypoints.min.js', ['jquery'], '2.0.5');
        wp_register_script('imagesloaded', PXL_URL . 'assets/js/libs/imagesloaded.pkgd.min.js', ['jquery'], '3.1.8');
        wp_register_script('isotope', PXL_URL . 'assets/js/libs/isotope.pkgd.min.js', ['jquery'], '3.0.6');
        wp_register_script('pxl-counter', PXL_URL . 'assets/js/libs/counter.min.js', ['jquery'], '');
        wp_register_script('pxl-progressbar', PXL_URL . 'assets/js/libs/progressbar.min.js', ['jquery'], '0.7.1');
        if (!wp_script_is('jquery-slick')) {
            wp_register_script('jquery-slick', PXL_URL . 'assets/js/libs/slick/slick.min.js', ['jquery'], '1.8.1');
        }

        wp_enqueue_script('pxl-core-main', PXL_URL . 'assets/js/main.js', ['jquery', 'waypoints'], '1.0.0', true);

        $swiper_version = apply_filters('pxl-swiper-version-active', '5.3.6');

        switch ($swiper_version) {
            case '8.4.5':
                wp_register_style('swiper', PXL_URL . 'assets/js/libs/swiper/v8/css/swiper.min.css', [], '8.4.5');
                wp_register_script('swiper', PXL_URL . 'assets/js/libs/swiper/v8/swiper.min.js', [], '8.4.5');
                break;
            case '10.1.0':
                wp_register_style('swiper', PXL_URL . 'assets/js/libs/swiper/v10/css/swiper.min.css', [], '10.1.0');
                wp_register_script('swiper', PXL_URL . 'assets/js/libs/swiper/v10/swiper.min.js', [], '10.1.0');
                break;
            case '11.2.8':
                wp_register_style('swiper', PXL_URL . 'assets/js/libs/swiper/v11/swiper-bundle.min.css', [], '11.2.8');
                wp_register_script('swiper', PXL_URL . 'assets/js/libs/swiper/v11/swiper-bundle.min.js', [], '11.2.8');
                break;
            default:
                wp_register_style('swiper', PXL_URL . 'assets/js/libs/swiper/css/swiper.min.css', [], '5.3.6');
                wp_register_script('swiper', PXL_URL . 'assets/js/libs/swiper/swiper.min.js', [], '5.3.6');
                break;
        }
    }

    public function pxl_handler()
    {
        if (class_exists('ReduxFramework') && !class_exists('PXL_Redux_Extensions')) {
            require_once PXL_PATH . 'inc/redux-fields/redux-fields.php';
        }
        require_once PXL_PATH . 'inc/admin/auto-update.php';
    }

    public function pxl_elementor()
    {

        if (!did_action('elementor/loaded')) {
            add_action('admin_notices', [$this, 'admin_notice_missing_main_plugin']);
            return;
        }

        // Check for required Elementor version
        if (!version_compare(ELEMENTOR_VERSION, self::MINIMUM_ELEMENTOR_VERSION, '>=')) {
            add_action('admin_notices', [$this, 'admin_notice_minimum_elementor_version']);
            return;
        }

        // Check for required PHP version
        if (version_compare(PHP_VERSION, self::MINIMUM_PHP_VERSION, '<')) {
            add_action('admin_notices', [$this, 'admin_notice_minimum_php_version']);
            return;
        }

        if (is_admin() && class_exists('\Elementor\Plugin')) {
            require_once PXL_PATH . 'inc/elementor/theme-builder/class-admin.php';
        }

        if (defined('ELEMENTOR_VERSION') && is_callable('Elementor\Plugin::instance')) {
            include_once PXL_PATH . 'inc/elementor/pxl-elementor.php';
        }
        if (defined('ELEMENTOR_VERSION') && is_callable('Elementor\Plugin::instance')) {
            include_once PXL_PATH . 'inc/elementor/template-library/manager.php';
        }
    }


    public function activate_theme_notice()
    {

        if (did_action('pxltheme_init') > 0) {
            return;
        }
?>
        <div class="updated not-h2">
            <p>
                <strong><?php echo sprintf(esc_html__('Please activate the right theme to use "%1$s" plugin.', PXL_TEXT_DOMAIN), $this->plugin_name); ?></strong>
            </p>
            <?php
            $screen = get_current_screen();
            if ($screen->base != 'themes'):
            ?>
                <p>
                    <a href="<?php echo esc_url(admin_url('themes.php')); ?>"><?php esc_html_e('Activate theme', PXL_TEXT_DOMAIN); ?></a>
                </p>
            <?php endif; ?>
        </div>
<?php
    }

    public function register_admin_bar_menu($wp_admin_bar)
    {
        $site_name = '';

        $theme = wp_get_theme();
        $site_name = $theme->get("Name");

        $wp_site = get_bloginfo();
        $wp_site_title = get_bloginfo("Name");
        if (!empty($wp_site_title)) {
            $site_name = $wp_site_title;
        }

        $wp_admin_bar->add_node([
            'id' => $theme->get("TextDomain"),
            'title' => '<span class="ab-icon dashicons-admin-home"></span>' . $site_name,
            'href' => is_admin() ? home_url('/') : admin_url('admin.php?page=pxlart'),
            'meta' => array(
                'class' => 'dashicons dashicons-admin-generic pxl-item-bar-mobile',
                'title' => $theme->get("TextDomain"),
            )
        ]);

        $wp_admin_bar->add_node([
            'id' => 'pxlart-visit-site',
            'title' => esc_html__('Visit Site', PXL_TEXT_DOMAIN),
            'href' => home_url('/'),
            'parent' => $theme->get("TextDomain"),
            'meta' => array(
                'class' => '',
                'title' => esc_html__('Visit Site', PXL_TEXT_DOMAIN),
            )
        ]);

        $wp_admin_bar->add_node([
            'id' => 'pxlart-dashboard',
            'title' => esc_html__('Dashboard', PXL_TEXT_DOMAIN),
            'href' => admin_url('admin.php?page=pxlart'),
            'parent' => $theme->get("TextDomain"),
            'meta' => array(
                'class' => '',
                'title' => esc_html__('Dashboard', PXL_TEXT_DOMAIN),
            )
        ]);

        if (class_exists('ReduxFramework')) {
            $wp_admin_bar->add_node([
                'id' => 'theme-options',
                'title' => 'Theme Options',
                'href' => admin_url('admin.php?page=pxlart-theme-options'),
                'parent' => $theme->get("TextDomain"),
                'meta' => array(
                    'class' => '',
                    'title' => esc_html__('Theme Options', PXL_TEXT_DOMAIN),
                )
            ]);
        }
        $wp_admin_bar->add_node([
            'id' => 'pxl-themes',
            'title' => esc_html__('Themes', PXL_TEXT_DOMAIN),
            'href' => admin_url('themes.php'),
            'parent' => $theme->get("TextDomain"),
            'meta' => array(
                'class' => '',
                'title' => esc_html__('Themes', PXL_TEXT_DOMAIN),
            )
        ]);
        $wp_admin_bar->add_node([
            'id' => 'pxl-widgets',
            'title' => esc_html__('Widgets', PXL_TEXT_DOMAIN),
            'href' => admin_url('widgets.php'),
            'parent' => $theme->get("TextDomain"),
            'meta' => array(
                'class' => '',
                'title' => esc_html__('Widgets', PXL_TEXT_DOMAIN),
            )
        ]);
        $wp_admin_bar->add_node([
            'id' => 'pxl-menus',
            'title' => esc_html__('Menus', PXL_TEXT_DOMAIN),
            'href' => admin_url('nav-menus.php'),
            'parent' => $theme->get("TextDomain"),
            'meta' => array(
                'class' => '',
                'title' => esc_html__('Menus', PXL_TEXT_DOMAIN),
            )
        ]);
    }

    public function remove_from_admin_bar($wp_admin_bar)
    {
        $wp_admin_bar->remove_node('site-name');
    }


    public function admin_notice_missing_main_plugin()
    {

        if (isset($_GET['activate'])) unset($_GET['activate']);

        $message = sprintf(
            esc_html__('"%1$s" requires "%2$s" to be installed and activated.', PXL_TEXT_DOMAIN),
            '<strong>' . $this->plugin_name . '</strong>',
            '<strong>' . esc_html__('Elementor Plugin', PXL_TEXT_DOMAIN) . '</strong>'
        );

        printf('<div class="notice notice-warning is-dismissible"><p>%1$s</p></div>', $message);
    }

    public function admin_notice_minimum_elementor_version()
    {

        if (isset($_GET['activate'])) unset($_GET['activate']);

        $message = sprintf(
            esc_html__('"%1$s" requires "%2$s" version %3$s or greater.', PXL_TEXT_DOMAIN),
            '<strong>' . $this->plugin_name . '</strong>',
            '<strong>' . esc_html__('Elementor Plugin', PXL_TEXT_DOMAIN) . '</strong>',
            self::MINIMUM_ELEMENTOR_VERSION
        );

        printf('<div class="notice notice-warning is-dismissible"><p>%1$s</p></div>', $message);
    }

    public function admin_notice_minimum_php_version()
    {

        if (isset($_GET['activate'])) unset($_GET['activate']);

        $message = sprintf(
            esc_html__('"%1$s" requires "%2$s" version %3$s or greater.', PXL_TEXT_DOMAIN),
            '<strong>' . $this->plugin_name . '</strong>',
            '<strong>' . esc_html__('PHP', PXL_TEXT_DOMAIN) . '</strong>',
            self::MINIMUM_PHP_VERSION
        );

        printf('<div class="notice notice-warning is-dismissible"><p>%1$s</p></div>', $message);
    }

    function redux_framework_notice()
    {
        $plugin_name = '<strong>' . $this->plugin_name . '</strong>';
        $redux_name = '<strong>' . esc_html__("Redux Framework", PXL_TEXT_DOMAIN) . '</strong>';

        echo '<div class="notice notice-warning is-dismissible">';
        echo '<p>';
        printf(
            esc_html__('%1$s require %2$s installed and activated. Please active %3$s plugin', PXL_TEXT_DOMAIN),
            $plugin_name,
            $redux_name,
            $redux_name
        );
        echo '</p>';
        printf('<button type="button" class="notice-dismiss"><span class="screen-reader-text">%s</span></button>', esc_html__('Dismiss this notice.', PXL_TEXT_DOMAIN));
        echo '</div>';
    }

    public function pxl_validate_redux_framework($redux)
    {
        $redux->filesystem = Redux_Filesystem::get_instance($redux);
    }
}

function pixelart()
{
    return Pxltheme_Core::instance();
}

// Install
pixelart();

Pxltheme_Core::instance();
