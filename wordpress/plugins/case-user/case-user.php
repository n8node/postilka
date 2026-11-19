<?php
/**
 * Plugin Name: Case User
 * Plugin URI: https://themeforest.net/user/case-themes
 * Description: A wordpress login
 * Version: 1.0.0
 * Author: Case-Themes
 * Author URI: https://themeforest.net/user/case-themes
 * License: GPLv2 or later
 * Text Domain: case-user
 */
if (! defined('ABSPATH')) {
    exit();
}

/**
 * Main Class
 *
 * @class Case_User
 *
 * @version 1.0.0
 */

if (! class_exists('Case_User')) {

    final class Case_User
    {
        /**
         * Action argument used by the nonce validating the AJAX request.
         *
         * @var string
         */
        const NONCE = 'up-nonce-ajax';
        public $file;
        public $basename;
        public $plugin_dir;
        public $plugin_url;
        public $templates_dir;
        public $templates_url;
        public $style_dir;
        public $style_url;
        public $theme_dir;
        public $theme_url;

        public static function instance()
        {
            static $instance = null;
            
            if (null === $instance) {
                
                $instance = new Case_User();
                
                // globals.
                $instance->setup_globals();
                
                // includes.
                $instance->includes();
                
                // actions.
                $instance->setup_actions();
            }
            return $instance;
        }

        /**
         * globals value.
         *
         * @package WR
         * @global path + uri.
         */
        public function setup_globals()
        {
            $this->file = __FILE__;
            $this->basename = plugin_basename($this->file);
            $this->plugin_dir = plugin_dir_path($this->file);
            $this->plugin_url = plugin_dir_url($this->file);
            
            $this->templates_dir = trailingslashit($this->plugin_dir . 'templates');
            $this->templates_url = trailingslashit($this->plugin_url . 'templates');
            
            $this->style_dir = trailingslashit($this->plugin_dir . 'style');
            $this->style_url = trailingslashit($this->plugin_url . 'style');
            
            $this->theme_dir = trailingslashit(get_template_directory() . '/case-user');
            $this->theme_url = trailingslashit(get_template_directory_uri() . '/case-user');
        }

        /**
         * setup all actions + filter.
         *
         * @package WR
         * @version 1.0.0
         */
        private function setup_actions()
        {
            /* add front-end scripts. */
            add_action('wp_enqueue_scripts', array(
                $this,
                'add_scrips'
            ));
            
            /* add template scripts. */
            add_action('wp_enqueue_scripts', array(
                $this,
                'add_template_script'
            ));
            
            /* add admin scripts. */
            add_action('admin_enqueue_scripts', array(
                $this,
                'add_admin_script'
            ));
        }

        /**
         * include files.
         *
         * @package WR
         * @version 1.0.0
         */
        private function includes()
        {
            require_once caseuser()->plugin_dir . 'inc/class.ajax.php';
            require_once caseuser()->plugin_dir . 'inc/class.hook.php';
            require_once caseuser()->plugin_dir . 'admin/class.admin.php';
            require_once caseuser()->plugin_dir . 'inc/class.shortcodes.php';
            require_once caseuser()->plugin_dir . 'inc/templates.php';
            require_once caseuser()->plugin_dir . 'inc/class.core.php';
        }

        /**
         * add front-end scripts.
         *
         * @package WR
         * @version 1.0.0
         */
        function add_scrips()
        {
            
            /* load jquery. */
            wp_enqueue_script('jquery');
            /* jquery lib. */
            wp_enqueue_script( 'notify', caseuser()->style_url . 'js/notify.min.js', array('jquery'), '1.0.0' , true);
            
            $layout = 'default';
            
            /* load Remodal popup */
            wp_enqueue_script('remodal', $this->style_url . 'js/remodal.min.js', array('jquery'), '1.0.0' , true);
            
            wp_register_script( 'pxl-user-form', caseuser()->style_url . 'js/user-form.js', array('jquery'), '1.0.0' , true);
            wp_localize_script( 'pxl-user-form', 'caseuser', array( 'ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce(Case_User::NONCE) ) );
            wp_enqueue_script( 'pxl-user-form');
        }

        /**
         * add back-end scripts.
         *
         * @package Case_User
         * @version 1.0.0
         */
        function add_admin_script()
        {
            
            $screen = get_current_screen();
            // if page not pxl-user-form_admin.
            if(!isset($screen->base))
                return ;
            
            if($screen->base != 'users_page_pxl-user-form_admin')
                return ;
                
            // load media scripts.
            wp_enqueue_media();
            wp_enqueue_script('media-upload');
            
            // admin custom script
            wp_enqueue_script('admin.options', caseuser()->style_url . 'js/admin.options.js');
            wp_enqueue_style('admin.options', caseuser()->style_url . 'css/admin.options.css');
        }
        
        /**
         * load custom template scripts.
         * 
         * @author CaseThemes Team
         * @version 1.0.0
         */
        function add_template_script(){
            
            global $post;
            
            if(!is_a( $post, 'WP_Post' ))
                return ;
            
            if(!has_shortcode( $post->post_content, 'case-user'))
                return ;
            
            preg_match_all ("/\[pxl-user-form(.*)\]/U", $post->post_content, $matches);
            
            if(empty($matches[0]))
                return ;
            
            foreach ($matches[0] as $item){
            
                preg_match_all('/layout="([^"]+)"/', $item, $_matches);
            
                $layout = isset($_matches[1][0]) ? $_matches[1][0] : 'default' ;
            
                up_get_template_css($layout);
            }
        }

    }
    
    if (! function_exists('caseuser')) {

        function caseuser()
        {
            return Case_User::instance();
        }
    }
    
    if (defined('USERPRESS_LATE_LOAD')) {
        
        add_action('plugins_loaded', 'caseuser', (int) USERPRESS_LATE_LOAD);
    } else {
        caseuser();
    }
}