<?php
defined('ABSPATH') || exit();

class Theme_Builder_Admin
{
	public function __construct(){
		add_filter( 'views_edit-pxl-template', [ $this, 'admin_tabs_theme_builder' ] );
		add_filter( 'parse_query', [ $this, 'admin_tabs_theme_builder_posts_filter' ] );
    }

    public function admin_tabs_theme_builder( $views ) {

		$current_type = '';
		$active_class = 'nav-tab-active';

		if ( ! empty( $_REQUEST['tp_type'] ) ) {
			$current_type = $_REQUEST['tp_type'];
			$active_class = '';
		}
 

		$all_url = add_query_arg( ['post_type' => 'pxl-template'], admin_url( 'edit.php' ) );
 
		$template_types = array(
            'header'       => esc_html__('Header', PXL_TEXT_DOMAIN), 
            'footer'       => esc_html__('Footer', PXL_TEXT_DOMAIN), 
            'mega-menu'    => esc_html__('Mega Menu', PXL_TEXT_DOMAIN) 
        );
        $template_types = apply_filters('pxl_template_type_support',$template_types);
		?>

        <div id="pxl-theme-builder-wrapp"></div>
		<div id="pxl-theme-builder-tabs" class="nav-tab-wrapper">
			<a class="nav-tab <?php echo $active_class; ?>" href="<?php echo $all_url; ?>">
				<?php echo  __( 'All', PXL_TEXT_DOMAIN ); ?>
			</a>
			<?php
			foreach ($template_types as $type => $label) {
				$active_class = '';
				if ( $current_type === $type ) {
					$active_class = 'nav-tab-active';
				}
				$type_url = add_query_arg( 'tp_type', $type, $all_url );
				echo '<a class="nav-tab '.$active_class.'" href="'.$type_url.'">'.$label.'</a>';
			}
			?>
		</div>
		<?php
		return $views;
	}


	public function admin_tabs_theme_builder_posts_filter( $query ){
	    global $pagenow;
	    $type = 'pxl-template';
	    if (isset($_GET['post_type'])) {
	        $type = $_GET['post_type'];
	    }
	    if ( $type == 'pxl-template' && is_admin() && $pagenow=='edit.php' && isset($_GET['tp_type']) && $_GET['tp_type'] != '') {
	        $query->query_vars['meta_key'] = 'template_type';
	        $query->query_vars['meta_value'] = $_GET['tp_type'];
	    }
	} 
}
new Theme_Builder_Admin();