<?php
/**
 * The Pxl_Elementor initiate the theme admin
 */

use Elementor\Plugin;
use Elementor\Core\Files\CSS\Post as Post_CSS;
use Elementor\Core\DynamicTags\Dynamic_CSS;
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Pxl_Elementor
{
    /**
     * Instance
     *
     * @since 1.2.0
     * @access private
     * @static
     *
     * @var Plugin The single instance of the class.
     */
    private static $_instance = null;

    /**
     *  Plugin class constructor
     *
     * Register plugin action hooks and filters
     *
     * @since 1.0.0
     * @access public
     */
    public function __construct()
    {
        //load header, footer, megamenu, hidden panels builder templates
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        //add_action( 'elementor/css-file/post/enqueue', [ $this, 'pxl_after_enqueue_post_css' ] );
        //add_action( 'elementor/css-file/post/parse', [ $this, 'pxl_add_all_post_css' ] );
        add_action('elementor/element/parse_css',[$this,'pxl_add_post_css'], 10, 2);

        add_action('template_redirect', [$this, 'block_template_frontend']);
        add_filter('single_template', [$this, 'load_canvas_template']);
        //end load builder template
        add_action('init', [$this, 'pxl_elementor_init']);

        if (is_file(get_template_directory() . '/elements/element-functions.php')) {
            require_once(get_template_directory() . '/elements/element-functions.php');
        }

        if (is_file(get_template_directory() . '/elements/element-templates.php')) {
            require_once(get_template_directory() . '/elements/element-templates.php');
        }

        if (is_file(get_template_directory() . '/elements/element-custom.php')) {
            require_once(get_template_directory() . '/elements/element-custom.php');
        }

        add_action('after_switch_theme', [$this, 'set_el_defaults']);

        add_action('elementor/editor/before_enqueue_scripts', function () {
            wp_enqueue_style('pxl-editor-css', PXL_URL . 'assets/css/elementor-editor.css', array(), '1.0.0');
            
        });

        add_action('elementor/frontend/after_enqueue_scripts', function () {
            $awesome_pro_support = apply_filters('pxl_support_awesome_pro', true);
            if ($awesome_pro_support)
                wp_enqueue_style('font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro');
            
        });

        add_action('elementor/editor/after_enqueue_scripts', function () {
            $awesome_pro_support = apply_filters('pxl_support_awesome_pro', true);
            if ($awesome_pro_support)
                wp_enqueue_style('font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro');
           
        });

        add_action('elementor/editor/v2/scripts/enqueue/after', function () {
            wp_enqueue_script('pxl-core-base', PXL_URL . 'assets/js/base.js', [ 'jquery' ], '1.0.0', true);
        });
        
        add_action('elementor/editor/after_enqueue_styles', function () {
             
        });
        
        add_action( 'elementor/elements/elements_registered', [ $this, 'elements_registered' ] );

        // Widget Categories
        add_action('elementor/elements/categories_registered', [$this, 'register_elementor_categories']);

        // Add Plugin actions
        add_action('elementor/widgets/register', [$this, 'register_widgets']);
        add_action('elementor/controls/controls_registered', [$this, 'init_controls']);

    }

    /**
     * Instance
     *
     * Ensures only one instance of the class is loaded or can be loaded.
     *
     * @return Plugin An instance of the class.
     * @since 1.0.0
     * @access public
     *
     */
    public static function instance()
    {
        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }
     
    public function enqueue_scripts(){ 
        // not active pxl theme
        $theme_builder_layout_ids = [];
        $bd_layout_ids = apply_filters('pxl_theme_builder_layout_ids', $theme_builder_layout_ids);
 
        if (empty($bd_layout_ids)) return;

        if (class_exists('\Elementor\Plugin')) {
            $elementor = Plugin::instance();
            $elementor->frontend->enqueue_styles();
        }

        /*if (class_exists('\ElementorPro\Plugin')) {
            $elementor_pro = \ElementorPro\Plugin::instance();
            $elementor_pro->enqueue_styles();
        }*/

        foreach ($bd_layout_ids as $bd_id) {
            $pid = (int)$bd_id;
            if ($pid > 0) { 
                if (class_exists('\Elementor\Core\Files\CSS\Post')) {
                    $css_file = Post_CSS::create( $pid );
                    $css_file->enqueue();
                }  
            }
        }
    }

    public function pxl_after_enqueue_post_css($css_file){ 
        $pid = $css_file->get_post_id();
        $post_type = get_post_type($pid);
        if( $post_type == 'pxl-template' || $post_type == 'pxl-slider'){
            $css_file = Post_CSS::create( $pid );
            $css_file->enqueue();
        } 
         
    }

    public function pxl_add_all_post_css($post_css){
        $pid = $post_css->get_post_id();
        $post_type = get_post_type($pid);
        if( $post_type == 'pxl-template' || $post_type == 'pxl-slider'){
            $css_file = Post_CSS::create( $pid );
            $css_file->enqueue();
        }
    }

    public function pxl_add_post_css($post_css, $element){
        $wg_datas = apply_filters('pxl_wg_get_source_id_builder', []);
        if( empty($wg_datas) ) return;
        $element_name = $element->get_name();
        if(!empty($wg_datas[$element_name])){
            $element_settings = $element->get_settings();
            $val = $wg_datas[$element_name];
            if(is_array($val)){
                $source_id = [];
                foreach ($element_settings[$val['control_name']] as $v) {
                    $source_id[] = !empty($v[$val['source_name']]) ? $v[$val['source_name']] : '';
                }
            }else{  
                $source_id = !empty( $element_settings[$val] ) ? $element_settings[$val] : '';    
            }
            if(!empty($source_id)){
                if(is_array($source_id)){
                    foreach ($source_id as $bd_id) {
                        $pid = (int)$bd_id; 
                        if ($pid > 0) {  
                            $css_file = Post_CSS::create( $pid );
                            $css_file = Dynamic_CSS::create( $pid, $css_file );
                            $css_file->enqueue();
                        }
                    }
                }else{
                    $pid = (int)$source_id;
                    if ($pid > 0) { 
                        $css_file = Post_CSS::create( $pid );
                        $css_file = Dynamic_CSS::create( $pid, $css_file );
                        $css_file->enqueue();
                    }
                }
            }
        }
    }

    /**
     * Don't display the elementor Elementor Header & Footer Builder templates on the frontend for non edit_posts capable users.
     *
     * @since  1.0.0
     */
    public function block_template_frontend()
    {
        $post_type_df = ['pxl-template'];
        $post_type_builder = apply_filters('pxl_theme_builder_post_types', $post_type_df);
        $post_types = array_merge($post_type_df, $post_type_builder);
        foreach ($post_types as $pt) {
            if (is_singular($pt) && !current_user_can('edit_posts')) {
                wp_redirect(site_url(), 301);
                die;
            }
        }

    }

    /**
     * Single template function which will choose our template
     *
     * @param String $single_template Single template.
     * @since  1.0.1
     *
     */
    function load_canvas_template($single_template)
    {
        global $post;
        $post_type_df = ['pxl-template'];
        $post_type_builder = apply_filters('pxl_theme_builder_post_types', $post_type_df);
        $post_types = array_merge($post_type_df, $post_type_builder);

        if (in_array($post->post_type, $post_types)) {
            $elementor_2_0_canvas = ELEMENTOR_PATH . '/modules/page-templates/templates/canvas.php';
            if (file_exists($elementor_2_0_canvas)) {
                return $elementor_2_0_canvas;
            } else {
                return ELEMENTOR_PATH . '/includes/page-templates/canvas.php';
            }
        }

        return $single_template;
    }

    public function set_el_defaults()
    {
        //update_option( 'elementor_css_print_method', 'internal' );
        //update_option( 'elementor_disable_color_schemes', 'yes' );
        //update_option( 'elementor_disable_typography_schemes', 'yes' );
        update_option('elementor_font_display', 'swap');
        update_option('elementor_experiment-e_dom_optimization', 'active');

        //if exists, assign to $cpt_support var
        $cpt_support = get_option('elementor_cpt_support');

        //check if option DOESN'T exist in db
        if (!$cpt_support) {
            $cpt_support = ['page', 'post', 'portfolio', 'pxl-template']; //create array of our default supported post types
            $cpt_support = apply_filters('pxl_add_cpt_support', $cpt_support);
            update_option('elementor_cpt_support', $cpt_support); //write it to the database
        } else {
            $cpt_support = apply_filters('pxl_add_cpt_support', $cpt_support);
            update_option('elementor_cpt_support', array_unique($cpt_support));
        }
    }


    public function register_elementor_categories($elements_manager)
    {

        $categories = [];
        $categories['pxltheme-core'] =
            [
                'title' => pixelart()->plugin_name, // esc_html__( 'Pxlart Core', PXL_TEXT_DOMAIN ),  
                'icon' => 'fa fa-plug'
            ];

        $existent_categories = $elements_manager->get_categories();
        $categories = array_merge($categories, $existent_categories);

        $set_categories = function ($categories) {
            $this->categories = $categories;
        };

        $set_categories->call($elements_manager, $categories);

    }

    public function elements_registered($el_manager){
        require_once( __DIR__ . '/elements/section.php' );
        require_once( __DIR__ . '/elements/column.php' );
        require_once( __DIR__ . '/elements/container.php' );
        $el_manager->register_element_type( new \Elementor\PXL_Element_Section() );
        $el_manager->register_element_type( new \Elementor\PXL_Element_Column() );
        $el_manager->register_element_type( new \Elementor\Includes\Elements\PXL_Container() );
    }

    public function register_widgets()
    {
        // Include Widget files
        require_once(PXL_PATH . 'inc/elementor/widgets/abstract-class-widget-base.php');

        // Scan element (need add to bottom of this file)
        $folder = apply_filters( 'pxl-register-widgets-folder', get_template_directory() . '/elements/widgets/' );
        $files = scandir($folder);
         
        foreach ($files as $file) {
            $pos = strrpos($file, ".php");
            if ($pos !== false) {
                require_once $folder . $file;
            }
        }

    }

    public function init_controls()
    {

        // Include Control files
        $controls_manager = Plugin::$instance->controls_manager;
        require_once(__DIR__ . '/pxl-controls/class-control-layout.php');
   
        $controls_manager->register_control(null, new Pxltheme_Core_Layout_Control());

        $is_sp_control_icons = apply_filters( 'pxl_support_e_control_icons', true );
        if( $is_sp_control_icons){
            require_once(__DIR__ . '/pxl-controls/class-control-icons.php');
            $controls_manager->register_control(null, new Pxltheme_Core_Icons_Control());
        }

        $is_sp_control_list = apply_filters( 'pxl_support_e_control_list', true );
        if( $is_sp_control_list){
            require_once(__DIR__ . '/pxl-controls/class-control-list.php');
            $controls_manager->register_control(null, new Pxltheme_Core_List_Control());
        }

        $is_sp_control_link = apply_filters( 'pxl_support_e_control_link', true );
        if( $is_sp_control_link){
            require_once(__DIR__ . '/pxl-controls/class-control-links.php');
            $controls_manager->register_control(null, new Pxltheme_Core_Links_Control());
        }

        $is_sp_control_table = apply_filters( 'pxl_support_e_control_table', true );
        if( $is_sp_control_table){
            require_once(__DIR__ . '/pxl-controls/class-control-table.php');
            $controls_manager->register_control(null, new Pxltheme_Core_Table_Control());
        }

        // Add Tab
        $controls_manager->add_tab('bratheme_core', pixelart()->plugin_name);
    }

    public function pxl_elementor_init(){
        if( is_admin() ){
            $e_font_icon_svg_opt = get_option( 'elementor_experiment-e_font_icon_svg', 'default' );
            $e_font_icon_svg_filter = apply_filters( 'pxl-e-font-icon-svg-force-inactive', true);
            if( $e_font_icon_svg_filter && $e_font_icon_svg_opt !== 'inactive'){
                update_option( 'elementor_experiment-e_font_icon_svg', 'inactive', 'yes' );
            }
             
            /*$feature_container_opt = get_option( 'elementor_experiment-container', '' );
            if( $feature_container_opt == ''){
                update_option( 'elementor_experiment-container', 'inactive', 'yes' );
            }*/
            
            /*$feature_container_opt = get_option( 'elementor_experiment-container', 'default' );
            $feature_container_filter = apply_filters( 'pxl-feature-container-force-inactive', true);
            if( $feature_container_filter && $feature_container_opt !== 'inactive'){
                update_option( 'elementor_experiment-container', 'inactive', 'yes' );
            }*/
        }
    }

}

// Instantiate Plugin Class
Pxl_Elementor::instance();