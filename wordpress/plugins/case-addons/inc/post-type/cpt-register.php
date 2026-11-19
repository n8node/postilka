<?php
/**
 * Custom post types register.
 * @since   1.0
 * @author PixelArt Team
 *
 */

class PXL_CPT_Register
{
    /**
     * Core singleton class
     *
     * @var self - pattern realization
     * @access private
     */
    private static $_instance;

    /**
     * Store supported post types in an array
     * @var array
     * @access private
     */
    private $post_types = array();

    private $post_type = '';

    /**
     * Constructor
     *
     * @access private
     */
    private function __construct()
    {
        add_action('init', array($this, 'init'), 0);
        add_action('init', array($this, 'pxl_featured_handlers'));
        add_action('admin_menu', array($this, 'pxl_remove_post_custom_fields'),99);
 
        /*add "type" column for pxl-template post type*/
        add_filter('manage_pxl-template_posts_columns', function($columns) {
            return array_merge($columns, ['template_type' => esc_html__('Type', PXL_TEXT_DOMAIN)]);
        }); 
        add_action('manage_pxl-template_posts_custom_column', function($column_key, $post_id) {
            if ($column_key == 'template_type') {
                $type = get_post_meta($post_id, 'template_type', true);
                $type_dp = ucfirst(str_replace('-', ' ', $type));
                echo '<span>'; echo $type_dp; echo '</span>';
            }
        }, 10, 2);
         
        add_filter( 'manage_edit-pxl-template_sortable_columns', array($this, 'sort_by_template_type_meta'), 10, 1 );

    }
    function sort_by_template_type_meta( $columns ) {
        $columns['template_type'] = 'template_type';
        return $columns;
    }
      
    function init()
    {
        $cpt_default = $this->pxl_default_post_type();
        $post_types_extra = apply_filters('pxl_extra_post_types', array());
        $this->post_types = array_merge($cpt_default, $post_types_extra);
        if(empty($this->post_types)) return;
        foreach ($this->post_types as $key => $post_type_support) {
            if ($post_type_support['status'] === true):
                $post_type_support_args = !empty($post_type_support['args']) ? $post_type_support['args'] : array();
                $post_type_support_labels = !empty($post_type_support['labels']) ? $post_type_support['labels'] : array();
                $args = array_merge(array(
                    'labels' => array_merge(array(
                        'name'                  => $post_type_support['item_name'],
                        'singular_name'         => $post_type_support['item_name'],
                        'add_new'               => _x('Add New', 'add new on admin panel', PXL_TEXT_DOMAIN),
                        'add_new_item'          => __('Add New', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'],
                        'edit_item'             => __('Edit', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'],
                        'new_item'              => __('New', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'],
                        'view_item'             => __('View', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'],
                        'view_items'            => __('View', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['items_name'],
                        'search_items'          => __('Search', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['items_name'],
                        'not_found'             => __('No', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['items_name'] . ' ' . __('Found', PXL_TEXT_DOMAIN),
                        'not_found_in_trash'    => __('No', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['items_name'] . ' ' . __('Found in Trash', PXL_TEXT_DOMAIN),
                        'parent_item_colon'     => __('Parent', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'] . ':',
                        'all_items'             => __('All', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['items_name'],
                        'archives'              => $post_type_support['item_name'] . ' ' . __('Archives', PXL_TEXT_DOMAIN),
                        'attributes'            => $post_type_support['item_name'] . ' ' . __('Entry Attributes', PXL_TEXT_DOMAIN),
                        'uploaded_to_this_item' => __('Uploaded to this', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'],
                        'menu_name'             => $post_type_support['item_name'],
                        'filter_items_list'     => __('Filter', PXL_TEXT_DOMAIN) . ' ' . $post_type_support['item_name'] . ' ' . __('list', PXL_TEXT_DOMAIN),
                        'items_list_navigation' => $post_type_support['item_name'] . ' ' . __('list navigation', PXL_TEXT_DOMAIN),
                        'items_list'            => $post_type_support['item_name'] . ' ' . __('list', PXL_TEXT_DOMAIN),
                        'name_admin_bar'        => $post_type_support['item_name']
                    ), $post_type_support_labels),
                    'hierarchical'        => false,
                    'description'         => '',
                    'public'              => true,
                    'show_ui'             => true,
                    'show_in_menu'        => true,
                    'show_in_admin_bar'   => true,
                    'menu_position'       => null,
                    'menu_icon'           => 'dashicons-portfolio',
                    'show_in_nav_menus'   => true,
                    'publicly_queryable'  => true,
                    'exclude_from_search' => false,
                    'has_archive'         => true,
                    'query_var'           => true,
                    'can_export'          => true,
                    'capability_type'     => 'post',
                    'supports'            => array(
                        'title',
                        'editor',
                        'thumbnail',
                        'excerpt',
                        'revisions',
                        'author'
                    )
                ), $post_type_support_args);
                register_post_type($key, $args);
                flush_rewrite_rules();
                $this->post_type = $key;
                if (isset($post_type_support['post_featured']) && $post_type_support['post_featured'] === true) {
                    add_filter('manage_' . $key . '_posts_columns', array($this, 'pxl_add_column_featured'));
                    add_filter('manage_' . $key . '_posts_custom_column', array($this, 'pxl_add_content_featured_column'), 10, 2);
                }

            endif;
        }
    }
    
    function pxl_default_post_type(){
        $postypes_default = [];
        $cpt_defaults = apply_filters( 'pxl_support_default_cpt', ['pxl-template'] );
        
        if( in_array('pxl-template', $cpt_defaults) ){
            $postypes_default['pxl-template'] = [
                'status'     => true,
                'item_name'  => esc_html__( 'Templates', PXL_TEXT_DOMAIN ),
                'items_name' => esc_html__( 'Templates', PXL_TEXT_DOMAIN ),
                'args'       => array(
                    'menu_icon'          => 'dashicons-align-center',
                    'supports'           => array(
                        'title',
                        'editor',
                    ),
                    'public'             => true,
                    'publicly_queryable' => true,
                    'show_in_menu'      => false,
                    'show_in_nav_menus'   => false,
                    'has_archive'   => false,
                    'exclude_from_search'   => true,
                ),
                'labels'     => array()
            ];
        } 
        return $postypes_default; 

    }

    function pxl_remove_post_custom_fields()
    {
        remove_meta_box('postcustom', 'page', 'normal');
        remove_meta_box('postcustom', 'page', 'side');
        remove_meta_box('postcustom', 'page', 'advanced');
    }

    /**
     * Registers portfolio post type, this function should be called in an init hook function.
     * @uses $wp_post_types Inserts new post type object into the list
     *
     * @access protected
     */
    protected function type_portfolio_register() {
    }
 
    public function pxl_add_column_featured($defaults)
    {
        $defaults['post_featured'] = esc_html__('Featured', PXL_TEXT_DOMAIN);
        return $defaults;
    }

    public function pxl_add_content_featured_column($colum_name, $post_id)
    {
        if ($colum_name === "post_featured") {
            $pt = get_post_type($post_id);
            if ($pt !== false) {
                $href = admin_url("edit.php?post_type=" . $pt);
                $meta_featured = get_post_meta($post_id, 'pxl_post_featured', true);
                if ($meta_featured === "featured") {
                    echo '<a href="' . $href . '&pxl_post_id=' . $post_id . '"><span class="fs-show-featured dashicons dashicons-star-filled"></span></a>';
                } else {
                    echo '<a href="' . $href . '&pxl_post_id=' . $post_id . '"><span class="fs-show-featured dashicons dashicons-star-empty"></span></a>';
                }
            }
        }
    }

    public function pxl_featured_handlers()
    {
        if (!empty($_REQUEST['pxl_post_id']) && get_post(intval($_REQUEST['pxl_post_id'])) !== null) {
            $pid = intval($_REQUEST['pxl_post_id']);
            $featured_meta = get_post_meta($pid, 'pxl_post_featured', true);
            if ($featured_meta === "featured") {
                update_post_meta($pid, 'pxl_post_featured', '');
            } else {
                update_post_meta($pid, 'pxl_post_featured', 'featured');
            }
            $pt = get_post_type($pid);
            if ($pt !== false) {
                wp_redirect(admin_url("edit.php?post_type=" . $pt));
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

PXL_CPT_Register::get_instance();
