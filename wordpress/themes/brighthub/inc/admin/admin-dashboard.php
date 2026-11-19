<?php
/**
* The BrightHub_Admin_Dashboard base class
*/

if( !defined( 'ABSPATH' ) )
	exit; 

class BrightHub_Admin_Dashboard extends BrightHub_Admin_Page {
	protected $id = null;
	protected $page_title = null;
	protected $menu_title = null;
	public $position = null;
	public function __construct() {
		$this->id = 'pxlart';
		$this->page_title = brighthub()->get_name();
		$this->menu_title = brighthub()->get_name();
		$this->position = '50';

		parent::__construct();
	}

	public function display() {
		include_once( get_template_directory() . '/inc/admin/views/admin-dashboard.php' );
	
		do_action('brighthub_admin_dashboard_after');
	}
 
	public function save() {

	}
}
new BrightHub_Admin_Dashboard;
