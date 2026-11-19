<?php
/**
 * Theme functions: init, enqueue scripts and styles, include required files and widgets.
 *
 * @package Case-Themes
 * @since BrightHub 1.0
 */

if(!defined('THEME_DEV_MODE_ELEMENTS') && is_user_logged_in()){
    define('THEME_DEV_MODE_ELEMENTS', true);
}
 
require_once get_template_directory() . '/inc/classes/class-main.php';

if ( is_admin() ){ 
	require_once get_template_directory() . '/inc/admin/admin-init.php'; } 

/**
 * Theme Require
*/
brighthub()->require_folder('inc');
brighthub()->require_folder('inc/classes');
brighthub()->require_folder('inc/theme-options');
brighthub()->require_folder('template-parts/widgets');

// Load performance optimizations
require_once get_template_directory() . '/inc/theme-performance.php';

if(class_exists('Woocommerce')){
    require_once get_template_directory() . '/woocommerce/woo-functions.php';
}
