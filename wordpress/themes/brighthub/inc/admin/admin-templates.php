<?php

if( !defined( 'ABSPATH' ) )
	exit; 

class BrightHub_Admin_Templates extends BrightHub_Base{

	public function __construct() {
		$this->add_action( 'admin_menu', 'register_page', 20 );
	}
 
	public function register_page() {
		add_submenu_page(
			'pxlart',
		    esc_html__( 'Templates', 'brighthub' ),
		    esc_html__( 'Templates', 'brighthub' ),
		    'manage_options',
		    'edit.php?post_type=pxl-template',
		    false
		);
	}
}
new BrightHub_Admin_Templates;
