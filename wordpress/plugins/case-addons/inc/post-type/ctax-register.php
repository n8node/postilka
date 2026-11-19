<?php
/**
 * Custom taxonomies register
 *
 * @package PixelArt Team
 * @since   1.0
 */

class PXL_CTax_Register
{
    /**
     * Core singleton class
     *
     * @var self - pattern realization
     * @access private
     */
    private static $_instance;

    /**
     * Store supported taxonomies in an array
     * @var array
     * @access private
     */
    private $taxonomies = array();

    /**
     * Constructor
     *
     * @access private
     */
    function __construct()
    {
        add_action('init', array($this, 'init'), 0);
    }

    /**
     * init hook - 0
     */
    function init()
    {
        $this->taxonomies = apply_filters('pxl_extra_taxonomies', array());
        if(empty($this->taxonomies)) return;
        foreach ($this->taxonomies as $key => $pxl_taxonomy) {
            if ($pxl_taxonomy['status'] === true) {
                $categories = array_merge(array(
                    'hierarchical'       => true,
                    'show_ui'            => true,
                    'show_in_menu'       => true,
                    'show_in_nav_menus'  => true,
                    'show_admin_column'  => true,
                    'show_in_rest'       => true,
                    'show_in_quick_edit' => true,
                    'labels'             => array_merge(array(
                        'name'              => $pxl_taxonomy['taxonomies'],
                        'singular_name'     => $pxl_taxonomy['taxonomy'],
                        'edit_item'         => esc_html__('Edit', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'update_item'       => esc_html__('Update', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'add_new_item'      => esc_html__('Add New', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'new_item_name'     => esc_html__('New Type', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'all_items'         => esc_html__('All', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomies'],
                        'search_items'      => esc_html__('Search', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'parent_item'       => esc_html__('Parent', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'],
                        'parent_item_colon' => esc_html__('Parent', PXL_TEXT_DOMAIN) . ' ' . $pxl_taxonomy['taxonomy'] . ':',
                    ), $pxl_taxonomy['labels']),
                    'rewrite'      => array(
	                    'slug' => $key
                    )
                ), $pxl_taxonomy['args']);

                register_taxonomy($key, $pxl_taxonomy['post_type'], $categories);
            }
        }

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

PXL_CTax_Register::get_instance();