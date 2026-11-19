<?php
if (! defined ( 'ABSPATH' )) {
	exit (); // Exit if accessed directly
}
//$is_preview_mode = \Elementor\Plugin::$instance->preview->is_preview_mode();
/**
 *
 * @name Case Theme User_shortcodes
 * @since 1.0.0
 */
if (! class_exists ( 'Case_User_Shortcodes' )) {
	class Case_User_Shortcodes {
		function __construct() {
			
			// shortcode login form.
			add_shortcode ( 'case-user-form', array (
					$this,
					'add_shortcode_case_user' 
			) );
		}
		
		/**
		 * display shortcode user press login form.
		 *
		 * @package Case Theme User
		 * @version 1.0.0
		 */
		function add_shortcode_case_user($atts, $content = '') {
			global $case_user;
			
			// if options null.
			if (! $atts)
				$atts = array ();
				
				// default array.
			$atts = array_merge ( array (
					'el_title' => '',
					'other_page' => '',
					'label' => '',
					'text_link' => '',
					'link' => '',
					'template' => get_option ( 'case_user_layout', 'default' ),
					'form_type' => 'login',
					'is_logged' => 'profile',
					'is_logged_text' => esc_html__ ( "Logout", "case-user" ) 
			), $atts );
			
			// if template null.
			if (! $atts ['template']) {
				$atts ['template'] = 'default';
			}
			
			$case_user = $atts;
			
			ob_start();
			
			// if user logned.
			if (is_user_logged_in ()) {
				
				up_get_template_part ( $atts ['template'] . '/profile' );

			} else {
			
    			up_get_template_part ( $atts ['template'] . '/layout' );
			}

			return ob_get_clean();
		}
	}
	// start.
	new Case_User_Shortcodes ();
}
