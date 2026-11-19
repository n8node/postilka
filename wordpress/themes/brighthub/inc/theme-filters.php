<?php
/**
 * Filters hook for the theme
 *
 * @package Case-Themes
 */


function brighthub_html_classes( $output ) {
	$output = '';
	$smooth_scroll = brighthub()->get_theme_opt( 'smooth_scroll', 'off' );
	if($smooth_scroll == 'on') {
		$output .= ' class="html-smooth-scroll"';
	}
    return $output;
}
add_filter( 'language_attributes', 'brighthub_html_classes' );

/* Custom Classs - Body */
function brighthub_body_classes( $classes ) {   

	$classes[] = '';
    if (class_exists('ReduxFramework')) {
        $classes[] = ' pxl-redux-page';

	    $footer_fixed = brighthub()->get_theme_opt('footer_fixed');
	    $p_footer_fixed = brighthub()->get_page_opt('p_footer_fixed');

	    if($p_footer_fixed != false && $p_footer_fixed != 'inherit') {
	    	$footer_fixed = $p_footer_fixed;
	    }

	    if(isset($footer_fixed) && $footer_fixed == 'on') {
	        $classes[] = ' pxl-footer-fixed';
	    }

	    $header_layout = brighthub()->get_opt('header_layout');
	    if(isset($header_layout) && $header_layout) {
		    $post_header = get_post($header_layout);
		    $header_type = get_post_meta( $post_header->ID, 'header_type', true );
		    if(isset($header_type)) {
		    	$classes[] = ' bd-'.$header_type.'';
		    }
		}

	    $get_gradient_color = brighthub()->get_opt('gradient_color');
		if($get_gradient_color['from'] == $get_gradient_color['to'] ) {
		    $classes[] = ' site-color-normal ';
		} else {
			$classes[] = ' site-color-gradient ';
		}

		$shop_layout = brighthub()->get_theme_opt('shop_layout', 'grid');
		if(isset($_GET['shop-layout'])) {
	        $shop_layout = $_GET['shop-layout'];
	    }
		$classes[] = ' woocommerce-layout-'.$shop_layout;

		$body_custom_class = brighthub()->get_page_opt('body_custom_class');
		if(!empty($body_custom_class)) {
			$classes[] = $body_custom_class;
		}
    }
    return $classes;
}
add_filter( 'body_class', 'brighthub_body_classes' );

/* Post Type Support */
function brighthub_add_cpt_support() {
    $cpt_support = get_option( 'elementor_cpt_support' );
    
    if( ! $cpt_support ) {
        $cpt_support = [ 'page', 'post', 'template', 'career', 'b2b', 'footer', 'pxl-template' ];
        update_option( 'elementor_cpt_support', $cpt_support );
    }

    else if( ! in_array( 'template', $cpt_support ) ) {
        $cpt_support[] = 'template';
        update_option( 'elementor_cpt_support', $cpt_support );
    }

	else if( ! in_array( 'career', $cpt_support ) ) {
        $cpt_support[] = 'career';
        update_option( 'elementor_cpt_support', $cpt_support );
    }

	else if( ! in_array( 'b2b', $cpt_support ) ) {
        $cpt_support[] = 'b2b';
        update_option( 'elementor_cpt_support', $cpt_support );
    }

    else if( ! in_array( 'footer', $cpt_support ) ) {
        $cpt_support[] = 'footer';
        update_option( 'elementor_cpt_support', $cpt_support );
    }

    else if( ! in_array( 'pxl-template', $cpt_support ) ) {
        $cpt_support[] = 'pxl-template';
        update_option( 'elementor_cpt_support', $cpt_support );
    }

}
add_action( 'after_switch_theme', 'brighthub_add_cpt_support');

add_filter( 'pxl_support_default_cpt', 'brighthub_support_default_cpt' );
function brighthub_support_default_cpt($postypes){
	return $postypes; // pxl-template
}

add_filter( 'pxl_extra_post_types', 'brighthub_add_post_type' );
function brighthub_add_post_type( $postypes ) {
	$template_display = brighthub()->get_theme_opt('template_display', 'on');
	$template_slug = brighthub()->get_theme_opt('template_slug', 'template');
	$template_name = brighthub()->get_theme_opt('template_name', 'Post Template');

	$career_display = brighthub()->get_theme_opt('career_display', 'on');
	$career_slug = brighthub()->get_theme_opt('career_slug', 'career');
	$career_name = brighthub()->get_theme_opt('career_name', 'Post Careers');

	$b2b_display = brighthub()->get_theme_opt('b2b_display', 'on');
	$b2b_slug = brighthub()->get_theme_opt('b2b_slug', 'b2b');
	$b2b_name = brighthub()->get_theme_opt('b2b_name', 'Post B2B');

	if($template_display == 'on') {
		$template_status = true;
	} else {
		$template_status = false;
	}

	$postypes['template'] = array(
		'status' => $template_status,
		'item_name'  => $template_name,
		'items_name' => $template_name,
		'args'       => array(
			'rewrite'             => array(
                'slug'       => $template_slug,
 		 	),
		),
	);

	if($career_display == 'on') {
		$career_status = true;
	} else {
		$career_status = false;
	}

	$postypes['career'] = array(
		'status' => $career_status,
		'item_name'  => $career_name,
		'items_name' => $career_name,
		'args'       => array(
			'rewrite'             => array(
                'slug'       => $career_slug,
 		 	),
		),
	);
  
	if($b2b_display == 'on') {
		$b2b_status = true;
	} else {
		$b2b_status = false;
	}

	$postypes['b2b'] = array(
		'status' => $b2b_status,
		'item_name'  => $b2b_name,
		'items_name' => $b2b_name,
		'args'       => array(
			'rewrite'             => array(
                'slug'       => $b2b_slug,
 		 	),
		),
	);
  
	return $postypes;
}

add_filter( 'pxl_extra_taxonomies', 'brighthub_add_tax' );
function brighthub_add_tax( $taxonomies ) {

	$taxonomies['template-category'] = array(
		'status'     => true,
		'post_type'  => array( 'template' ),
		'taxonomy'   => 'Template Categories',
		'taxonomies' => 'Template Categories',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'template-category'
 		 	),
		),
		'labels'     => array()
	);

	$taxonomies['template-tag'] = array(
		'status'     => true,
		'post_type'  => array( 'template' ),
		'taxonomy'   => 'Template Tag',
		'taxonomies' => 'Template Tag',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'template-tag'
 		 	),
		),
		'labels'     => array()
	);

	$taxonomies['career-category'] = array(
		'status'     => true,
		'post_type'  => array( 'career' ),
		'taxonomy'   => 'Career Categories',
		'taxonomies' => 'Career Categories',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'career-category'
 		 	),
		),
		'labels'     => array()
	);

	$taxonomies['career-tag'] = array(
		'status'     => true,
		'post_type'  => array( 'career' ),
		'taxonomy'   => 'Career Tag',
		'taxonomies' => 'Career Tag',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'career-tag'
 		 	),
		),
		'labels'     => array()
	);

	$taxonomies['b2b-category'] = array(
		'status'     => true,
		'post_type'  => array( 'b2b' ),
		'taxonomy'   => 'B2B Categories',
		'taxonomies' => 'B2B Categories',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'b2b-category'
 		 	),
		),
		'labels'     => array()
	);

	$taxonomies['b2b-tag'] = array(
		'status'     => true,
		'post_type'  => array( 'b2b' ),
		'taxonomy'   => 'B2B Tag',
		'taxonomies' => 'B2B Tag',
		'args'       => array(
			'rewrite'             => array(
                'slug'       => 'b2b-tag'
 		 	),
		),
		'labels'     => array()
	);
	
	return $taxonomies;
}

/* Custom Archive Post Type Link */
add_filter( 'post_type_archive_link', 'brighthub_get_post_type_archive_link', 10, 2 );
function brighthub_get_post_type_archive_link($link, $post_type){

	if( $post_type == 'template'){
		$port_archive_link = brighthub()->get_theme_opt('archive_template_link', '');
		    if( !empty($port_archive_link) ){ 
		  	$link = get_permalink($port_archive_link);
		}
	}

	if( $post_type == 'career'){
		$port_archive_link = brighthub()->get_theme_opt('archive_career_link', '');
		    if( !empty($port_archive_link) ){ 
		  	$link = get_permalink($port_archive_link);
		}
	}

	if( $post_type == 'b2b'){
		$port_archive_link = brighthub()->get_theme_opt('archive_b2b_link', '');
		    if( !empty($port_archive_link) ){ 
		  	$link = get_permalink($port_archive_link);
		}
	}

  return $link;
}

add_filter( 'pxl_theme_builder_post_types', 'brighthub_theme_builder_post_type' );
function brighthub_theme_builder_post_type($postypes){
	return $postypes;
}

add_filter( 'pxl_theme_builder_layout_ids', 'brighthub_theme_builder_layout_id' );
function brighthub_theme_builder_layout_id($layout_ids){
	$header_layout        = (int)brighthub()->get_opt('header_layout');
	$header_sticky_layout = (int)brighthub()->get_opt('header_sticky_layout');
	$footer_layout        = (int)brighthub()->get_opt('footer_layout');
	$ptitle_layout        = (int)brighthub()->get_opt('ptitle_layout');
	$product_bottom_content        = (int)brighthub()->get_opt('product_bottom_content');
	if( $header_layout > 0) 
		$layout_ids[] = $header_layout;
	if( $header_sticky_layout > 0) 
		$layout_ids[] = $header_sticky_layout;
	if( $footer_layout > 0) 
		$layout_ids[] = $footer_layout;
	if( $ptitle_layout > 0) 
		$layout_ids[] = $ptitle_layout;
	if( $product_bottom_content > 0) 
		$layout_ids[] = $product_bottom_content;

	$slider_template = brighthub_get_templates_option('slider');
	if( count($slider_template) > 0){
		foreach ($slider_template as $key => $value) {
			$layout_ids[] = $key;
		}
	}

	$tab_template = brighthub_get_templates_option('tab');
	if( count($tab_template) > 0){
		foreach ($tab_template as $key => $value) {
			$layout_ids[] = $key;
		}
	}

	$accordion_template = brighthub_get_templates_option('accordion');
	if( count($accordion_template) > 0){
		foreach ($accordion_template as $key => $value) {
			$layout_ids[] = $key;
		}
	}
	
	$mega_menu_id = brighthub_get_mega_menu_builder_id();
	if(!empty($mega_menu_id))
		$layout_ids = array_merge($layout_ids, $mega_menu_id);

	$page_popup_id = brighthub_get_page_popup_builder_id();
	if(!empty($page_popup_id))
		$layout_ids = array_merge($layout_ids, $page_popup_id);

	return $layout_ids;
}

add_filter( 'pxl_wg_get_source_id_builder', 'brighthub_wg_get_source_builder' );
function brighthub_wg_get_source_builder($wg_datas){
  $wg_datas['tabs'] = ['control_name' => 'tabs', 'source_name' => 'content_template'];
  $wg_datas['accordion'] = ['control_name' => 'accordion', 'source_name' => 'accordion_template'];
  $wg_datas['slides'] = ['control_name' => 'slides', 'source_name' => 'slide_template'];
  return $wg_datas;
}

/* Update primary color in Editor Builder */
add_action( 'elementor/preview/enqueue_styles', 'brighthub_add_editor_preview_style', 99 );
function brighthub_add_editor_preview_style(){
    wp_add_inline_style( 'editor-preview', brighthub_editor_preview_inline_styles() );
}
function brighthub_editor_preview_inline_styles(){
    $theme_colors = brighthub_configs('theme_colors');
    ob_start();
        echo '.elementor-edit-area-active, .elementor-edit-area-active .e-con {';
            foreach ($theme_colors as $color => $value) {
                printf('--%1$s-color: %2$s;', str_replace('#', '',$color),  $value['value']);
            }
        echo '}';
    return ob_get_clean();
}
 
add_filter( 'get_the_archive_title', 'brighthub_archive_title_remove_label' );
function brighthub_archive_title_remove_label( $title ) {
	if ( is_category() ) {
		$title = single_cat_title( '', false );
	} elseif ( is_tag() ) {
		$title = single_tag_title( '', false );
	} elseif ( is_author() ) {
		$title = get_the_author();
	} elseif ( is_post_type_archive() ) {
		$title = post_type_archive_title( '', false );
	} elseif ( is_tax() ) {
		$title = single_term_title( '', false );
	} elseif ( is_home() ) {
		$title = single_post_title( '', false );
	}

	return $title;
}

add_filter( 'comment_reply_link', 'brighthub_comment_reply_text' );
function brighthub_comment_reply_text( $link ) {
	$link = str_replace( 'Reply', ''.esc_attr__('Reply', 'brighthub').'', $link );
	return $link;
}
add_filter( 'pxl_enable_pagepopup', 'brighthub_enable_pagepopup' );
function brighthub_enable_pagepopup() {
	return false;
}
add_filter( 'pxl_enable_megamenu', 'brighthub_enable_megamenu' );
function brighthub_enable_megamenu() {
	return true;
}
add_filter( 'pxl_enable_onepage', 'brighthub_enable_onepage' );
function brighthub_enable_onepage() {
	return true;
}

add_filter( 'pxl_support_awesome_pro', 'brighthub_support_awesome_pro' );
function brighthub_support_awesome_pro() {
	return true;
}
 
add_filter( 'redux_pxl_iconpicker_field/get_icons', 'brighthub_add_icons_to_pxl_iconpicker_field' );
function brighthub_add_icons_to_pxl_iconpicker_field($icons){
	$custom_icons = []; 
	$icons = array_merge($custom_icons, $icons);
	return $icons;
}


add_filter("pxl_mega_menu/get_icons", "brighthub_add_icons_to_megamenu");
function brighthub_add_icons_to_megamenu($icons){
	$custom_icons = [];
	$icons = array_merge($custom_icons, $icons);
	return $icons;
}

/**
 * Extra Elementor Icons
*/
if(!function_exists('brighthub_register_custom_icon_library')){
    add_filter('elementor/icons_manager/native', 'brighthub_register_custom_icon_library');
    function brighthub_register_custom_icon_library($tabs){
        $custom_tabs = [
            'pxl_phosphor_icons' => [
                'name' => 'phosphor_icons',
                'label' => esc_html__( 'Phosphor Icons', 'brighthub' ),
                'url' => false,
                'enqueue' => false,
                'prefix' => 'ph ',
                'displayPrefix' => 'phosphor-icons',
                'labelIcon' => 'ph-acorn',
                'ver' => '1.0.1',
                'fetchJson' => get_template_directory_uri() . '/assets/fonts/phosphor/pxl-phosphor-icons.js',
                'native' => true,
            ],
        ];
        $tabs = array_merge($custom_tabs, $tabs);
        return $tabs;
    }
}

 

/**
 * Move comment field to bottom
 */
add_filter( 'comment_form_fields', 'brighthub_comment_field_to_bottom' );
function brighthub_comment_field_to_bottom( $fields ) {
	$comment_field = $fields['comment'];
	unset( $fields['comment'] );
	$fields['comment'] = $comment_field;
	return $fields;
}


/* ------Lazy loading control---- */
add_filter( 'wp_lazy_loading_enabled', 'brighthub_control_lazy_loading' );
function brighthub_control_lazy_loading($enabled) {
    // Check theme option
    $lazy_loading_enabled = brighthub()->get_theme_opt('enable_lazy_loading', true);
    return $lazy_loading_enabled;
}

/* ------Auto add lazy loading to all img tags---- */
add_filter('the_content', 'brighthub_add_lazy_loading_to_content', 999);
add_filter('widget_text', 'brighthub_add_lazy_loading_to_content', 999);
function brighthub_add_lazy_loading_to_content($content) {
    // Check theme option
    $lazy_loading_enabled = brighthub()->get_theme_opt('enable_lazy_loading', true);
    if (!$lazy_loading_enabled) {
        $content = preg_replace_callback(
            '/<img([^>]*?)(?:\s+loading=["\']lazy["\'])?([^>]*?)>/i',
            function($matches) {
                $before_attrs = $matches[1];
                $after_attrs = $matches[2];
                
                if (preg_match('/class=["\']([^"\']*no-lazyload[^"\']*)["\']/i', $before_attrs . $after_attrs)) {
                    return '<img' . $before_attrs . $after_attrs . '>';
                }
                
                $attrs = $before_attrs . $after_attrs;
                $attrs = preg_replace('/\s+loading=["\']lazy["\']/i', '', $attrs);
                if (strpos($attrs, 'loading=') === false) {
                    $attrs .= ' loading="eager"';
                }
                return '<img' . $attrs . '>';
            },
            $content
        );
    } else {
        $content = preg_replace_callback(
            '/<img([^>]*?)>/i',
            function($matches) {
                $attrs = $matches[1];
                
                if (preg_match('/\s+loading=["\']/i', $attrs)) {
                    return '<img' . $attrs . '>';
                }
                
                if (preg_match('/class=["\']([^"\']*no-lazyload[^"\']*)["\']/i', $attrs)) {
                    return '<img' . $attrs . ' loading="eager">';
                }
                
                return '<img' . $attrs . ' loading="lazy">';
            },
            $content
        );
    }
    
    return $content;
}

/* ------ Export Settings ---- */
add_filter( 'pxl_export_wp_settings', 'brighthub_export_wp_settings' );
function brighthub_export_wp_settings($wp_options){
  $wp_options[] = 'mc4wp_default_form_id';
  return $wp_options;
}

/* ------ Theme Info ---- */
add_filter( 'pxl_server_info', 'brighthub_add_server_info');
function brighthub_add_server_info($infos){
  $infos = [
    'api_url' => 'https://api.casethemes.net/',
    'docs_url' => 'https://doc.casethemes.net/brighthub/',
    'plugin_url' => 'https://api.casethemes.net/plugins/',
    'demo_url' => 'https://brighthub.casethemes.net/',
    'support_url' => 'https://casethemes.net/support/',
	'help_url' => 'https://casethemes.net/support/',
	'email_support' => 'support@casethemes.net',
	'video_url' => 'https://www.youtube.com/@casethemes'
  ];
  
  return $infos;
}

/* ------ Template Filter ---- */
add_filter( 'pxl_template_type_support', 'brighthub_template_type_support' );
function brighthub_template_type_support($type) {
	$extra_type = [
		'header'       => esc_html__('Header Desktop', 'brighthub'),
		'header-mobile'          => esc_html__('Header Mobile', 'brighthub'),
		'widget'          => esc_html__('Widget Sidebar', 'brighthub'),
        'footer'       => esc_html__('Footer', 'brighthub'), 
        'mega-menu'    => esc_html__('Mega Menu', 'brighthub') ,
		'page-title'          => esc_html__('Page Title', 'brighthub'), 
		'hidden-panel'          => esc_html__('Hidden Panel', 'brighthub'), 
		'tab'          => esc_html__('Tab', 'brighthub'), 
		'accordion'          => esc_html__('Accordion', 'brighthub'), 
		'page'          => esc_html__('Popup', 'brighthub'),
		'slider'          => esc_html__('Slider', 'brighthub'),
		'404'          => esc_html__('404', 'brighthub'),
	];
	return $extra_type;
}

/* Switch Swiper Version  */
add_filter( 'pxl-swiper-version-active', 'brighthub_set_swiper_version_active' );
function brighthub_set_swiper_version_active($version){
  $version = '8.4.5'; //5.3.6, 8.4.5, 10.1.0
  return $version;
}

/* Search Result  */
function brighthub_custom_post_types_in_search_results( $query ) {
    if ( $query->is_main_query() && $query->is_search() && ! is_admin() ) {
        $query->set( 'post_type', array( 'page', 'post', 'template', 'career', 'b2b', 'product' ) );
    }
}
add_action( 'pre_get_posts', 'brighthub_custom_post_types_in_search_results' );

/* Add Custom Font Face */
add_filter( 'elementor/fonts/groups', 'brighthub_update_elementor_font_groups_control' );
function brighthub_update_elementor_font_groups_control($font_groups){
  $pxlfonts_group = array( 'pxlfonts' => esc_html__( 'BrightHub Fonts', 'brighthub' ) );
  return array_merge( $pxlfonts_group, $font_groups );
}

add_filter( 'elementor/fonts/additional_fonts', 'brighthub_update_elementor_font_control' );
function brighthub_update_elementor_font_control($additional_fonts){
  $additional_fonts['Arapey'] = 'pxlfonts';
  $additional_fonts['Rubik'] = 'pxlfonts';
  $additional_fonts['Allura'] = 'pxlfonts';
  $additional_fonts['Geist'] = 'pxlfonts';
  $additional_fonts['Sora'] = 'pxlfonts';
  $additional_fonts['Rethink Sans'] = 'pxlfonts';
  $additional_fonts['Poppins'] = 'pxlfonts';
  return $additional_fonts;
}

// Fix menu active
add_filter('nav_menu_css_class', 'custom_nav_menu_classes', 10, 2);
function custom_nav_menu_classes($classes, $item) {
    if (strpos($item->url, '/blog-listing/') !== false) {
        $classes = array_diff($classes, ['current-menu-item', 'current_page_item']);

        $request_uri = strtok($_SERVER['REQUEST_URI'], '?');

        if (strpos($request_uri, '/blog-listing/') !== false) {
            $query = parse_url($item->url, PHP_URL_QUERY);
            $query_args = [];
            if ($query) {
                parse_str($query, $query_args);
            }

            $current_sidebar = isset($_GET['sidebar-blog']) ? trim($_GET['sidebar-blog'], "/") : null;
            $item_sidebar = isset($query_args['sidebar-blog']) ? trim($query_args['sidebar-blog'], "/") : null;

            if ($item_sidebar === 'left' && $current_sidebar === 'left') {
                $classes[] = 'current-menu-item';
            }
            elseif ($item_sidebar === 'none' && $current_sidebar === 'none') {
                $classes[] = 'current-menu-item';
            }
            elseif (!isset($query_args['sidebar-blog'])) {
                if ($current_sidebar === null || $current_sidebar === 'right') {
                    $classes[] = 'current-menu-item';
                }
            }
        }
    }
    return $classes;
}



// add custom font to redux
add_filter( 'redux/'.brighthub()->get_option_name().'/field/typography/custom_fonts', 'brighthub_add_redux_option_typo_customfont', 10, 1 ); 
function brighthub_add_redux_option_typo_customfont($fonts){
	$fonts = [
		'Theme Custom Fonts' => [
			'Arapey'          => 'Arapey',
			'Rubik'          => 'Rubik',
			'Allura'          => 'Allura',
			'Geist'          => 'Geist',
			'Sora'          => 'Sora',
			'Rethink Sans'          => 'Rethink Sans',
			'Poppins'          => 'Poppins',
		]
	];
	return $fonts;
}

/* Edit Popup Elementor Pro */
function brighthub_fix_elementor_popup_location( $that ){
    $loc = $that->get_location('popup');
    
    if( ! $loc['edit_in_content'] ){
        $args = [
            'label'           => $loc['label'],
            'multiple'        => $loc['multiple'],
            'public'          => $loc['public'],
            'edit_in_content' => true,
            'hook'            => $loc['hook'],
        ];
        
        $that->register_location('popup', $args);
    }
}
add_action('elementor/theme/register_locations', 'brighthub_fix_elementor_popup_location', 9999999 );

/* Accept svg in shortcode */
add_filter('wp_kses_allowed_html', 'allow_svg_shortcode_output', 10, 1);
function allow_svg_shortcode_output($allowedposttags) {
    $allowedposttags['svg'] = array(
        'xmlns'    => true,
        'width'    => true,
        'height'   => true,
        'viewBox'  => true,
        'fill'     => true,
    );
    $allowedposttags['path'] = array(
        'd'        => true,
        'fill'     => true,
    );
    $allowedposttags['g'] = array(
        'clip-path' => true,
    );
    $allowedposttags['clipPath'] = array(
        'id' => true,
    );
    $allowedposttags['rect'] = array(
        'width' => true,
        'height' => true,
        'fill' => true,
        'transform' => true,
    );
    $allowedposttags['defs'] = array();
    return $allowedposttags;
}

// Remove cookies consent
add_filter('comment_form_default_fields', 'remove_cookies_consent');
function remove_cookies_consent($fields) {
    if(isset($fields['cookies'])) {
        unset($fields['cookies']);
    }
    return $fields;
}

// Contact form 7 remove autop
add_filter('wpcf7_autop_or_not', '__return_false');
