<?php
/**
 * Mega menu register
 *
 * @since   1.0
 * @author PixelArt Team
 *
 */
if (!defined('ABSPATH')) {
    die();
}

require_once(PXL_PATH . 'inc/mega-menu/class-megamenu-walker.php');

class PXL_MegaMenu_Register
{
    /**
     * Core singleton class
     *
     * @var self - pattern realization
     * @access private
     */
    private static $_instance;

    private $enable_megamenu;

    private $menu_meta_extra = array();


    /**
     * Constructor
     *
     * @access private
     */
    function __construct()
    {

        add_action('admin_enqueue_scripts', array($this, 'pxl_enqueue_style'),1);
        
        add_action('admin_init', array($this, 'pxl_admin_init'), 20);

        // Custom Fields - Add
        add_filter('wp_setup_nav_menu_item', array($this, 'setup_nav_menu_item'));
        
        // Custom Fields - Save
        add_action('wp_update_nav_menu_item', array($this, 'update_nav_menu_item'), 100, 3);

        // Custom Walker - Edit
        add_filter('wp_edit_nav_menu_walker', array($this, 'edit_nav_menu_walker'), 100, 2);
 
        add_action('init', array($this, 'register_mega_menu_type'));
 
    }

    function register_mega_menu_type()
    {
        unregister_nav_menu('key');
    }
      
    function pxl_admin_init()
    {
        $this->menu_meta_extra = apply_filters("pxl_menu_edit", array());
    }
 
    // Custom Fields - Add
    function setup_nav_menu_item($menu_item)
    {
        $menu_item->pxl_megaprofile = get_post_meta($menu_item->ID, '_menu_item_pxl_megaprofile', true);
        $menu_item->pxl_page_popup = get_post_meta($menu_item->ID, '_menu_item_pxl_page_popup', true);
        $menu_item->pxl_icon = get_post_meta($menu_item->ID, '_menu_item_pxl_icon', true);
        $menu_item->pxl_onepage = get_post_meta($menu_item->ID, '_menu_item_pxl_onepage', true);
        $menu_item->pxl_onepage_offset = get_post_meta($menu_item->ID, '_menu_item_pxl_onepage_offset', true);
        foreach ($this->menu_meta_extra as $key => $fields) {
            $menu_item->$key = get_post_meta($menu_item->ID, '_menu_item_' . $key, true);
        }
 
        return $menu_item;
    }

    
    // Custom Fields - Save
    function update_nav_menu_item($menu_id, $menu_item_db_id, $menu_item_data)
    {
        if (isset($_REQUEST['menu-item-pxl-megaprofile'][$menu_item_db_id])) {
            update_post_meta($menu_item_db_id, '_menu_item_pxl_megaprofile', $_REQUEST['menu-item-pxl-megaprofile'][$menu_item_db_id]);
        }
        if (isset($_REQUEST['menu-item-pxl-page-popup'][$menu_item_db_id])) {
            update_post_meta($menu_item_db_id, '_menu_item_pxl_page_popup', $_REQUEST['menu-item-pxl-page-popup'][$menu_item_db_id]);
        }
        if (isset($_REQUEST['menu-item-pxl-icon'][$menu_item_db_id])) {
            update_post_meta($menu_item_db_id, '_menu_item_pxl_icon', $_REQUEST['menu-item-pxl-icon'][$menu_item_db_id]);
        }

        if (isset($_REQUEST['menu-item-pxl-onepage'][$menu_item_db_id])) {
            update_post_meta($menu_item_db_id, '_menu_item_pxl_onepage', $_REQUEST['menu-item-pxl-onepage'][$menu_item_db_id]);
        }

        if (isset($_REQUEST['menu-item-pxl-onepage-offset'][$menu_item_db_id])) {
            update_post_meta($menu_item_db_id, '_menu_item_pxl_onepage_offset', $_REQUEST['menu-item-pxl-onepage-offset'][$menu_item_db_id]);
        }

        foreach ($this->menu_meta_extra as $key => $fields) {
            if (isset($_REQUEST['menu-item-' . $key][$menu_item_db_id])) {
                update_post_meta($menu_item_db_id, '_menu_item_' . $key, $_REQUEST['menu-item-' . $key][$menu_item_db_id]);
            }
        }
    }

    // Custom Backend Walker - Edit
    function edit_nav_menu_walker($walker, $menu_id)
    {
        if (!class_exists('PXL_Mega_Menu_Edit_Walker')) {
            global $extra_menu_custom;
            $extra_menu_custom = $this->menu_meta_extra;
            require_once(PXL_PATH . 'inc/mega-menu/class-mega-menu-edit.php');
        }

        return 'PXL_Mega_Menu_Edit_Walker';
    }

    function pxl_enqueue_style(){
        $awesome_pro_support = apply_filters( 'pxl_support_awesome_pro', true );
           
        wp_enqueue_style('jquery.fonticonpicker.min.css', PXL_URL . 'assets/libs/iconpicker/css/jquery.fonticonpicker.min.css', array(), 'all');
        wp_enqueue_style('jquery.fonticonpicker.grey.min.css', PXL_URL . 'assets/libs/iconpicker/themes/grey-theme/jquery.fonticonpicker.grey.min.css', array(), 'all');
        wp_enqueue_script('jquery.fonticonpicker.js', PXL_URL . 'assets/libs/iconpicker/jquery.fonticonpicker.min.js', array('jquery'));
       
        if($awesome_pro_support)
            wp_enqueue_style( 'font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro' );
        else
            if ( defined( 'ELEMENTOR_VERSION' ) && is_callable( 'Elementor\Plugin::instance' ) )
                wp_enqueue_style('font-awesome', ELEMENTOR_ASSETS_URL . 'lib/font-awesome/css/all.min.css', [], '5.15.3' );
            else 
                wp_enqueue_style( 'font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro' );
    }


    /**
     * Get instance of the class
     *
     * @access public
     * @return object this
     */
    public static function get_instance()
    {
        if (!(self::$_instance instanceof self)) {
            self::$_instance = new self();
        }

        return self::$_instance;
    }
}

PXL_MegaMenu_Register::get_instance();