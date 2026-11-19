<?php
add_action('after_setup_theme', 'brighthub_setup_option', 1);
function brighthub_setup_option(){
    if (!class_exists('ReduxFramework')) {
        return;
    }
    if (class_exists('ReduxFrameworkPlugin')) {
        remove_action('admin_notices', array(ReduxFrameworkPlugin::instance(), 'admin_notices'));
    }
    
    $opt_name = brighthub()->get_option_name();
    $version = brighthub()->get_version();
    
    $args = array(
        'opt_name'             => $opt_name,
        'display_name'         => '', //$theme->get('Name'),
        'display_version'      => $version,
        'menu_type'            => 'submenu', //class_exists('Pxltheme_Core') ? 'submenu' : '',
        'allow_sub_menu'       => true,
        'menu_title'           => esc_html__('Theme Options', 'brighthub'),
        'page_title'           => esc_html__('Theme Options', 'brighthub'),
        'google_api_key'       => '',
        'google_update_weekly' => false,
        'async_typography'     => false,
        'admin_bar'            => false,
        'admin_bar_icon'       => 'dashicons-admin-generic',
        'admin_bar_priority'   => 50,
        'global_variable'      => '',
        'dev_mode'             => true,
        'update_notice'        => true,
        'customizer'           => true,
        'show_options_object' => false,
        'page_priority'        => 80,
        'page_parent'          => 'pxlart',
        'page_permissions'     => 'manage_options',
        'menu_icon'            => '',
        'last_tab'             => '',
        'page_icon'            => 'icon-themes',
        'page_slug'            => 'pxlart-theme-options',
        'save_defaults'        => true,
        'default_show'         => false,
        'default_mark'         => '',
        'show_import_export'   => true,
        'transient_time'       => 60 * MINUTE_IN_SECONDS,
        'output'               => true,
        'output_tag'           => true,
    
        'database'             => '',
        'use_cdn'              => true,
    
        // HINTS
        'hints'                => array(
            'icon'          => 'el el-question-sign',
            'icon_position' => 'right',
            'icon_color'    => 'lightgray',
            'icon_size'     => 'normal',
            'tip_style'     => array(
                'color'   => 'red',
                'shadow'  => true,
                'rounded' => false,
                'style'   => '',
            ),
            'tip_position'  => array(
                'my' => 'top left',
                'at' => 'bottom right',
            ),
            'tip_effect'    => array(
                'show' => array(
                    'effect'   => 'slide',
                    'duration' => '500',
                    'event'    => 'mouseover',
                ),
                'hide' => array(
                    'effect'   => 'slide',
                    'duration' => '500',
                    'event'    => 'click mouseleave',
                ),
            ),
        ),
    );
    
    Redux::SetArgs($opt_name, $args);
    
    /*--------------------------------------------------------------
    # Colors
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('Global Colors', 'brighthub'),
        'icon'       => 'el el-filter',
        'fields' => array(
            array(
                'id'          => 'primary_color',
                'type'        => 'color',
                'title'       => esc_html__('Primary Color', 'brighthub'),
                'transparent' => false,
                'default'     => ''
            ),
            array(
                'id'          => 'secondary_color',
                'type'        => 'color',
                'title'       => esc_html__('Secondary Color', 'brighthub'),
                'transparent' => false,
                'default'     => ''
            ),
            array(
                'id'          => 'third_color',
                'type'        => 'color',
                'title'       => esc_html__('Third Color', 'brighthub'),
                'transparent' => false,
                'default'     => ''
            ),
            array(
                'id'      => 'link_color',
                'type'    => 'link_color',
                'title'   => esc_html__('Link Colors', 'brighthub'),
                'default' => array(
                    'regular' => '',
                    'hover'   => '',
                    'active'  => ''
                ),
                'output'  => array('a')
            ),
            array(
                'id'          => 'gradient_first_color',
                'type'        => 'color',
                'title'       => esc_html__('Gradient First Color', 'brighthub'),
                'transparent' => false,
                'default'     => ''
            ),
            array(
                'id'          => 'gradient_color',
                'type'        => 'color_gradient',
                'title'       => esc_html__('Gradient Color', 'brighthub'),
                'transparent' => false,
                'default'  => array(
                    'from' => '',
                    'to'   => '', 
                ),
            ),
            array(
                'id'          => 'gradient_color2',
                'type'        => 'color_gradient',
                'title'       => esc_html__('Gradient Color 2', 'brighthub'),
                'transparent' => false,
                'default'  => array(
                    'from' => '',
                    'to'   => '', 
                ),
            ),
        )
    ));
    
    /*--------------------------------------------------------------
    # Typography
    --------------------------------------------------------------*/
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('Typography', 'brighthub'),
        'icon'   => 'el-icon-text-width',
        'fields' => array(
    
            array(
                'id'          => 'font_body',
                'type'        => 'typography',
                'title'       => esc_html__('Body Font', 'brighthub'),
                'google'      => true,
                'font-backup' => false,
                'all_styles'  => true,
                'line-height'  => true,
                'font-size'  => true,
                'text-align'  => false,
                'output'      => array('body'),
                'units'       => 'px',
            ),
            
            array(
                'id'          => 'font_heading_h1',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H1', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h1'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'font_heading_h2',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H2', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h2'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'font_heading_h3',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H3', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h3'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'font_heading_h4',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H4', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h4'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'font_heading_h5',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H5', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h5'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'font_heading_h6',
                'type'        => 'typography',
                'title'       => esc_html__('Heading H6', 'brighthub'),
                'google'      => true,
                'font-backup' => true,
                'all_styles'  => true,
                'text-align'  => false,
                'line-height' => true,
                'font-size'   => true,
                'font-backup' => false,
                'font-style'  => false,
                'output'      => array('h6'),
                'units'       => 'px',
            ),
    
            array(
                'id'          => 'f_secondary',
                'type'        => 'typography',
                'title'       => esc_html__('Secondary', 'brighthub'),
                'google'      => true,
                'font-backup' => false,
                'all_styles'  => false,
                'line-height'  => false,
                'font-size'  => false,
                'color'  => false,
                'font-style'  => false,
                'font-weight'  => false,
                'text-align'  => false,
                'units'       => 'px',
                'output'      => array('.ft-secondary'),
            ),
    
        )
    ));
    
    /*--------------------------------------------------------------
    # General
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('General', 'brighthub'),
        'icon'   => 'el el-wrench',
        'fields' => array(
            array(
                'id'       => 'enable_lazy_loading',
                'type'     => 'switch',
                'title'    => esc_html__('Enable Lazy Loading for Images', 'brighthub'),
                'subtitle' => esc_html__('Enable lazy loading for all images to improve page load speed. Images will load only when they are about to enter the viewport.', 'brighthub'),
                'default'  => false,
            ),
            array(
                'id'       => 'site_loader',
                'type'     => 'button_set',
                'title'    => esc_html__('Site Loader', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'off',
            ),
            array(
                'id'       => 'site_loader_style',
                'type'     => 'button_set',
                'title'    => esc_html__('Site Loader Style', 'brighthub'),
                'options'  => array(
                    'style-1' => esc_html__('Style 1', 'brighthub'),
                    'style-2' => esc_html__('Style 2', 'brighthub'),
                    'style-3' => esc_html__('Style 3', 'brighthub'),
                ),
                'default'  => 'style-1',
                'required' => array( 0 => 'site_loader', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'       => 'site_loader_icon',
                'type'     => 'media',
                'title'    => esc_html__('Site Loader Icon', 'brighthub'),
                'default' => '',
                'url'      => false,
                'required' => array( 0 => 'site_loader', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'       => 'mouse_move_animation',
                'type'     => 'button_set',
                'title'    => esc_html__('Mouse Move Animation', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'off',
            ),
            array(
                'id'       => 'smooth_scroll',
                'type'     => 'button_set',
                'title'    => esc_html__('Smooth Scroll', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'off',
            ),
    
            array(
                'id'       => 'subscribe',
                'type'     => 'button_set',
                'title'    => esc_html__('Subscribe', 'brighthub'),
                'options'  => array(
                    'show' => esc_html__('Show', 'brighthub'),
                    'hide' => esc_html__('Hide', 'brighthub'),
                ),
                'default'  => 'hide',
            ),
            array(
                'id'      => 'subscribe_layout',
                'type'    => 'select',
                'title'   => esc_html__('Subscribe Layout', 'brighthub'),
                'desc'    => sprintf(esc_html__('Please create your layout before choosing. %sClick Here%s','brighthub'),'<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '">','</a>'),
                'options' => brighthub_get_templates_option('popup'),
                'required' => array( 0 => 'subscribe', 1 => 'equals', 2 => 'show' ),
            ),
            array(
                'id'    => 'popup_effect',
                'type'  => 'select',
                'title' => esc_html__('Subscribe Popup Effect', 'brighthub'),
                'options' => [
                    'fade'           => esc_html__('Fade', 'brighthub'),
                    'fade-slide'           => esc_html__('Fade Slide', 'brighthub'),
                    'zoom'           => esc_html__('Zoom', 'brighthub'),
                ],
                'default' => 'fade',
                'required' => array( 0 => 'subscribe', 1 => 'equals', 2 => 'show' ),
            ),
        )
    ));
    
    
    /*--------------------------------------------------------------
    # Header
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('Header', 'brighthub'),
        'icon'   => 'el el-indent-left',
        'fields' => array_merge(
            brighthub_header_opts(),
            array(
                array(
                    'id'       => 'sticky_scroll',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Sticky Scroll', 'brighthub'),
                    'options'  => array(
                        'pxl-sticky-stt' => esc_html__('Scroll To Top', 'brighthub'),
                        'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'brighthub'),
                    ),
                    'default'  => 'pxl-sticky-stt',
                ),
                array(
                    'id'       => 'text_login',
                    'type'     => 'text',
                    'title'    => esc_html__('Text Login', 'brighthub'),
                    'default'  => esc_html__('Login', 'brighthub'),
                ),
                array(
                    'id'       => 'text_register',
                    'type'     => 'text',
                    'title'    => esc_html__('Text Register', 'brighthub'),
                ),
            ),
           
        )
    ));
    
    Redux::setSection($opt_name, array(
        'title'      => esc_html__('Mobile', 'brighthub'),
        'icon'       => 'el el-circle-arrow-right',
        'subsection' => true,
        'fields'     => array_merge(
            brighthub_header_mobile_opts(),
            array(
                array(
                    'id'       => 'mobile_display',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Display', 'brighthub'),
                    'options'  => array(
                        'show'  => esc_html__('Show', 'brighthub'),
                        'hide'  => esc_html__('Hide', 'brighthub'),
                    ),
                    'default'  => 'show'
                ),
                array(
                    'id'       => 'opt_mobile_style',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Style', 'brighthub'),
                    'options'  => array(
                        'light'  => esc_html__('Light', 'brighthub'),
                        'dark'  => esc_html__('Dark', 'brighthub'),
                    ),
                    'default'  => 'light',
                    'required' => array( 0 => 'mobile_display', 1 => 'equals', 2 => 'show' ),
                ),
                array(
                    'id'       => 'logo_m',
                    'type'     => 'media',
                    'title'    => esc_html__('Logo Dark in Menu Sidebar', 'brighthub'),
                     'default' => array(
                        'url'=>get_template_directory_uri().'/assets/img/logo.png'
                    ),
                    'url'      => false,
                    'required' => array( 0 => 'mobile_display', 1 => 'equals', 2 => 'show' ),
                    'desc'    => sprintf(esc_html__('You can also choose a logo to apply to each Page. Please edit the page and you will see Page Options. %sView Now.%s','brighthub'),'<a class="pxl-admin-popup" href="' . esc_url( get_template_directory_uri() ) . '/inc/theme-options/instruct/logo_m_page.png">','</a>'),
                ),
                array(
                    'id'       => 'logo_light_m',
                    'type'     => 'media',
                    'title'    => esc_html__('Logo Light in Menu Sidebar', 'brighthub'),
                    'default' => array(
                        'url'=>get_template_directory_uri().'/assets/img/logo-light.png'
                    ),
                    'url'      => false,
                    'required' => array( 0 => 'mobile_display', 1 => 'equals', 2 => 'show' ),
                ),
                array(
                    'id'       => 'logo_height',
                    'type'     => 'dimensions',
                    'title'    => esc_html__('Logo Height', 'brighthub'),
                    'width'    => false,
                    'unit'     => 'px',
                    'output'    => array('#pxl-header-default .pxl-header-branding img, #pxl-header-default #pxl-header-mobile .pxl-header-branding img, #pxl-header-elementor #pxl-header-mobile .pxl-header-branding img, .pxl-logo-mobile img'),
                    'required' => array( 0 => 'mobile_display', 1 => 'equals', 2 => 'show' ),
                ),
                array(
                    'id'       => 'search_mobile',
                    'type'     => 'switch',
                    'title'    => esc_html__('Search Form', 'brighthub'),
                    'default'  => true,
                    'required' => array( 0 => 'mobile_display', 1 => 'equals', 2 => 'show' ),
                ),
                array(
                    'id'      => 'search_placeholder_mobile',
                    'type'    => 'text',
                    'title'   => esc_html__('Search Text Placeholder', 'brighthub'),
                    'default' => '',
                    'subtitle' => esc_html__('Default: Search...', 'brighthub'),
                    'required' => array( 0 => 'search_mobile', 1 => 'equals', 2 => true ),
                )
            )
        )
    ));
    
    
    /*--------------------------------------------------------------
    # Footer
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('Footer', 'brighthub'),
        'icon'   => 'el el-website',
        'fields' => array_merge(
            brighthub_footer_opts(),
            array(
                array(
                    'id'       => 'back_totop_on',
                    'type'     => 'switch',
                    'title'    => esc_html__('Button Back to Top', 'brighthub'),
                    'default'  => false,
                ),
                array(
                    'id'       => 'footer_fixed',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Footer Fixed', 'brighthub'),
                    'options'  => array(
                        'on' => esc_html__('On', 'brighthub'),
                        'off' => esc_html__('Off', 'brighthub'),
                    ),
                    'default'  => 'off',
                ),
            ) 
        )
        
    ));
    
    /*--------------------------------------------------------------
    # Page Title area
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title'  => esc_html__('Page Title', 'brighthub'),
        'icon'   => 'el-icon-map-marker',
        'fields' => array_merge(
            brighthub_page_title_opts(),
            array(
                array(
                    'id'       => 'ptitle_scroll_opacity',
                    'title'    => esc_html__('Scroll Opacity', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => false,
                ),
            )
        )
    ));
    
    /*--------------------------------------------------------------
    # WordPress default content
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title' => esc_html__('Blog', 'brighthub'),
        'icon'  => 'el el-edit',
        'fields'     => array(
        )
    ));
    
    Redux::setSection($opt_name, array(
        'title' => esc_html__('Blog Archive', 'brighthub'),
        'icon'  => 'el-icon-pencil',
        'subsection' => true,
        'fields'     => array_merge(
            brighthub_sidebar_pos_opts([ 'prefix' => 'blog_']),
            array(
                array(
                    'id'      => 'archive_title',
                    'type'    => 'text',
                    'title'   => esc_html__('Title', 'brighthub'),
                    'default' => '',
                ),
                array(
                    'id'      => 'archive_style',
                    'type'    => 'select',
                    'title'   => esc_html__('Style', 'brighthub'),
                    'options' => array(
                        'listing' => esc_html__('Style List', 'brighthub'),
                        'grid' => esc_html__('Style Grid', 'brighthub'),
                    ),
                    'default' => 'listing',
                ),
 
                array(
                    'id'       => 'show_latest_post',
                    'title'    => esc_html__('Show Latest Post', 'brighthub'),
                    'subtitle' => esc_html__('Display the Latest Post for each blog pase.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => false,
                ),
                array(
                    'id'       => 'archive_date',
                    'title'    => esc_html__('Date', 'brighthub'),
                    'subtitle' => esc_html__('Display the Date for each blog pase.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                ),
                array(
                    'id'       => 'archive_category',
                    'title'    => esc_html__('Category', 'brighthub'),
                    'subtitle' => esc_html__('Display the Category for each blog pase.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => false,
                ),
                array(
                    'id'      => 'featured_img_size',
                    'type'    => 'text',
                    'title'   => esc_html__('Featured Image Size', 'brighthub'),
                    'default' => '',
                    'subtitle' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                ),
                array(
                    'id'      => 'archive_excerpt_length',
                    'type'    => 'text',
                    'title'   => esc_html__('Excerpt Length', 'brighthub'),
                    'default' => '',
                    'subtitle' => esc_html__('Default: 50', 'brighthub'),
                ),
                array(
                    'id'      => 'archive_readmore_text',
                    'type'    => 'text',
                    'title'   => esc_html__('Read More Text', 'brighthub'),
                    'default' => '',
                    'subtitle' => esc_html__('Default: Read the Article', 'brighthub'),
                ),
                array(
                    'id'       => 'pagi_type',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Pagination Type', 'brighthub'),
                    'options'  => array(
                        'default' => esc_html__('Default', 'brighthub'),
                        'btn_loadmore' => esc_html__('Button Loadmore Ajax', 'brighthub'),
                    ),
                    'default'  => 'default',
                ),
                array(
                    'id'      => 'btn_loadmore_txt',
                    'type'    => 'text',
                    'title'   => esc_html__('Load More Button Text', 'brighthub'),
                    'default' => '',
                    'required' => array( 0 => 'pagi_type', 1 => 'equals', 2 => 'btn_loadmore' ),
    
                ),
            )
        )
    ));
    
    Redux::setSection($opt_name, array(
        'title'      => esc_html__('Single Post', 'brighthub'),
        'icon'       => 'el el-icon-pencil',
        'subsection' => true,
        'fields'     => array_merge(
            brighthub_sidebar_pos_opts([ 'prefix' => 'post_']),
            brighthub_header_single_post(),
            brighthub_footer_single_post(),
            array(
                array(
                    'id'       => 'sg_post_title',
                    'type'     => 'button_set',
                    'title'    => esc_html__('Page Title Type', 'brighthub'),
                    'options'  => array(
                        'default' => esc_html__('Default', 'brighthub'),
                        'custom_text' => esc_html__('Custom Text', 'brighthub'),
                    ),
                    'default'  => 'default',
                ),
                array(
                    'id'      => 'sg_post_title_text',
                    'type'    => 'text',
                    'title'   => esc_html__('Page Title Text', 'brighthub'),
                    'default' => 'Blog Details',
                    'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),
                ),
                array(
                    'id'      => 'sg_featured_img_size',
                    'type'    => 'text',
                    'title'   => esc_html__('Featured Image Size', 'brighthub'),
                    'default' => '',
                    'subtitle' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                ),
                array(
                    'id'       => 'post_date',
                    'title'    => esc_html__('Date', 'brighthub'),
                    'subtitle' => esc_html__('Display the Date for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true
                ),
                array(
                    'id'       => 'post_author',
                    'title'    => esc_html__('Author', 'brighthub'),
                    'subtitle' => esc_html__('Display the Author for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true
                ),
                array(
                    'id'       => 'post_category',
                    'title'    => esc_html__('Category', 'brighthub'),
                    'subtitle' => esc_html__('Display the Category for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true
                ),
                array(
                    'id'       => 'post_tag',
                    'title'    => esc_html__('Tags', 'brighthub'),
                    'subtitle' => esc_html__('Display the Tag for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => false
                ),
                array(
                    'id'       => 'post_navigation',
                    'title'    => esc_html__('Navigation', 'brighthub'),
                    'subtitle' => esc_html__('Display the Navigation for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                ),
                array(
                    'id'       => 'comment_post',
                    'title'    => esc_html__('Comment Post', 'brighthub'),
                    'subtitle' => esc_html__('Display the Comment and Comment Form for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                ),
                array(
                    'id'       => 'related_post',
                    'title'    => esc_html__('Related Post', 'brighthub'),
                    'subtitle' => esc_html__('Display the Related Post for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                ),
                array(
                    'title' => esc_html__('Social', 'brighthub'),
                    'type'  => 'section',
                    'id' => 'social_section',
                    'indent' => true,
                ),
                array(
                    'id'       => 'post_social_share',
                    'title'    => esc_html__('Social', 'brighthub'),
                    'subtitle' => esc_html__('Display the Social Share for blog post.', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                ),
                array(
                    'id'       => 'social_facebook',
                    'title'    => esc_html__('Facebook', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                    'indent' => true,
                    'required' => array( 0 => 'post_social_share', 1 => 'equals', 2 => '1' ),
                ),
                array(
                    'id'       => 'social_x',
                    'title'    => esc_html__('X', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                    'indent' => true,
                    'required' => array( 0 => 'post_social_share', 1 => 'equals', 2 => '1' ),
                ),
                array(
                    'id'       => 'social_pinterest',
                    'title'    => esc_html__('Pinterest', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                    'indent' => true,
                    'required' => array( 0 => 'post_social_share', 1 => 'equals', 2 => '1' ),
                ),
                array(
                    'id'       => 'social_linkedin',
                    'title'    => esc_html__('LinkedIn', 'brighthub'),
                    'type'     => 'switch',
                    'default'  => true,
                    'indent' => true,
                    'required' => array( 0 => 'post_social_share', 1 => 'equals', 2 => '1' ),
                ),
            )
        )
    ));
    
    Redux::setSection($opt_name, array(
        'title'      => esc_html__('Post Type Template', 'brighthub'),
        'icon'       => 'el el-cog',
        'fields'     => array(
            array(
                'id'       => 'template_display',
                'type'     => 'button_set',
                'title'    => esc_html__('Post Type Template', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'on',
            ),
            array(
                'id'       => 'sg_template_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'brighthub'),
                'options'  => array(
                    'default' => esc_html__('Default', 'brighthub'),
                    'custom_text' => esc_html__('Custom Text', 'brighthub'),
                ),
                'default'  => 'default',
                'required' => array( 0 => 'template_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'sg_template_title_text',
                'type'    => 'text',
                'title'   => esc_html__('Page Title Text', 'brighthub'),
                'default' => 'Single Template',
                'required' => array( 0 => 'sg_template_title', 1 => 'equals', 2 => 'custom_text' ),
            ),
            array(
                'id'      => 'template_slug',
                'type'    => 'text',
                'title'   => esc_html__('Template Slug', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: template',
                'required' => array( 0 => 'template_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'template_name',
                'type'    => 'text',
                'title'   => esc_html__('Template Name', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: Template',
                'required' => array( 0 => 'template_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'    => 'archive_template_link',
                'type'  => 'select',
                'title' => esc_html__( 'Custom Archive Page Link', 'brighthub' ), 
                'data'  => 'page',
                'args'  => array(
                    'post_type'      => 'page',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                ),
                'required' => array( 0 => 'template_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
        )
    ));
    
    Redux::setSection($opt_name, array(
        'title'      => esc_html__('Post Type Career', 'brighthub'),
        'icon'       => 'el el-cog',
        'fields'     => array(
            array(
                'id'       => 'career_display',
                'type'     => 'button_set',
                'title'    => esc_html__('Career', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'on',
            ),
            array(
                'id'       => 'sg_career_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'brighthub'),
                'options'  => array(
                    'default' => esc_html__('Default', 'brighthub'),
                    'custom_text' => esc_html__('Custom Text', 'brighthub'),
                ),
                'default'  => 'default',
                'required' => array( 0 => 'career_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'sg_career_title_text',
                'type'    => 'text',
                'title'   => esc_html__('Page Title Text', 'brighthub'),
                'default' => 'Single Career',
                'required' => array( 0 => 'sg_career_title', 1 => 'equals', 2 => 'custom_text' ),
            ),
            array(
                'id'      => 'career_slug',
                'type'    => 'text',
                'title'   => esc_html__('Career Slug', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: career',
                'required' => array( 0 => 'career_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'career_name',
                'type'    => 'text',
                'title'   => esc_html__('Career Name', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: Careers',
                'required' => array( 0 => 'career_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'    => 'archive_career_link',
                'type'  => 'select',
                'title' => esc_html__( 'Custom Archive Page Link', 'brighthub' ), 
                'data'  => 'page',
                'args'  => array(
                    'post_type'      => 'page',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                ),
                'required' => array( 0 => 'career_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
        )
    ));

        
    Redux::setSection($opt_name, array(
        'title'      => esc_html__('Post Type B2B', 'brighthub'),
        'icon'       => 'el el-cog',
        'fields'     => array(
            array(
                'id'       => 'b2b_display',
                'type'     => 'button_set',
                'title'    => esc_html__('B2B', 'brighthub'),
                'options'  => array(
                    'on' => esc_html__('On', 'brighthub'),
                    'off' => esc_html__('Off', 'brighthub'),
                ),
                'default'  => 'on',
            ),
            array(
                'id'       => 'sg_b2b_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'brighthub'),
                'options'  => array(
                    'default' => esc_html__('Default', 'brighthub'),
                    'custom_text' => esc_html__('Custom Text', 'brighthub'),
                ),
                'default'  => 'default',
                'required' => array( 0 => 'b2b_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'sg_career_title_text',
                'type'    => 'text',
                'title'   => esc_html__('Page Title Text', 'brighthub'),
                'default' => 'Single B2B',
                'required' => array( 0 => 'sg_b2b_title', 1 => 'equals', 2 => 'custom_text' ),
            ),
            array(
                'id'      => 'b2b_slug',
                'type'    => 'text',
                'title'   => esc_html__('Career Slug', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: b2b',
                'required' => array( 0 => 'b2b_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'      => 'b2b_name',
                'type'    => 'text',
                'title'   => esc_html__('B2B Name', 'brighthub'),
                'default' => '',
                'desc'     => 'Default: B2B',
                'required' => array( 0 => 'b2b_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
            array(
                'id'    => 'archive_b2b_link',
                'type'  => 'select',
                'title' => esc_html__( 'Custom Archive Page Link', 'brighthub' ), 
                'data'  => 'page',
                'args'  => array(
                    'post_type'      => 'page',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                ),
                'required' => array( 0 => 'b2b_display', 1 => 'equals', 2 => 'on' ),
                'force_output' => true
            ),
        )
    ));
    
    
    /*--------------------------------------------------------------
    # Shop
    --------------------------------------------------------------*/
    if(class_exists('Woocommerce')) {
        Redux::setSection($opt_name, array(
            'title'  => esc_html__('Shop', 'brighthub'),
            'icon'   => 'el el-shopping-cart',
        ));
    
        Redux::setSection($opt_name, array(
            'title' => esc_html__('Product Archive', 'brighthub'),
            'icon'  => 'el-icon-pencil',
            'subsection' => true,
            'fields'     => array_merge(
                brighthub_sidebar_pos_opts([ 'prefix' => 'shop_']),
                array(
                    array(
                        'id'      => 'shop_featured_img_size',
                        'type'    => 'text',
                        'title'   => esc_html__('Featured Image Size', 'brighthub'),
                        'default' => '',
                        'subtitle' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                    ),
                    array(
                        'id'      => 'shop_filter',
                        'type'    => 'switch',
                        'title'   => esc_html__('Filter', 'brighthub'),
                        'subtitle' => esc_html__('Display the Filter for shop page.', 'brighthub'),
                        'default' => true,
                    ),
                    array(
                        'id'      => 'shop_filter_title',
                        'type'    => 'text',
                        'title'   => esc_html__('Filter Title', 'brighthub'),
                        'subtitle' => esc_html__('Filter Title for shop page.', 'brighthub'),
                        'default' => 'Filter',
                        'required' => array( 0 => 'shop_filter', 1 => 'equals', 2 => '1' ),
                    ),
                    array(
                        'title'         => esc_html__('Products displayed per row', 'brighthub'),
                        'id'            => 'products_columns',
                        'type'          => 'slider',
                        'subtitle'      => esc_html__('Products displayed per row', 'brighthub'),
                        'default'       => 3,
                        'min'           => 2,
                        'step'          => 1,
                        'max'           => 6,
                        'display_value' => 'text',
                    ),
                    array(
                        'id'       => 'number_product_to_show',
                        'title'    => esc_html__('Number Product to Show per Page', 'brighthub'),
                        'type'     => 'slider',
                        'default'  => 12,
                        'min'           => 1,
                        'step'          => 1,
                        'max'           => 100,
                        'display_value' => 'text',
                    ),
                )
            )
        ));
    
        Redux::setSection($opt_name, array(
            'title' => esc_html__('Single Product', 'brighthub'),
            'icon'  => 'el-icon-pencil',
            'subsection' => true,
            'fields'     => array_merge(
                array( 
                    array(
                        'id'      => 'sg_breadcrumb',
                        'type'    => 'switch',
                        'title'   => esc_html__('Breadcrumb', 'brighthub'),
                        'default' => true,
                    ),
                    array(
                        'id'       => 'sg_product_ptitle',
                        'type'     => 'button_set',
                        'title'    => esc_html__('Page Title Type', 'brighthub'),
                        'options'  => array(
                            'default' => esc_html__('Default', 'brighthub'),
                            'custom_text' => esc_html__('Custom Text', 'brighthub'),
                        ),
                        'default'  => 'default',
                    ),
                    array(
                        'id'      => 'sg_product_ptitle_text',
                        'type'    => 'text',
                        'title'   => esc_html__('Page Title Text', 'brighthub'),
                        'default' => 'Shop Details',
                        'required' => array( 0 => 'sg_product_ptitle', 1 => 'equals', 2 => 'custom_text' ),
                    ),
                    array(
                        'id'       => 'product_title',
                        'type'     => 'switch',
                        'title'    => esc_html__('Product Title', 'brighthub'),
                        'default'  => false
                    ),
                    array(
                        'id'       => 'product_comment',
                        'type'     => 'switch',
                        'title'    => esc_html__('Product Comment', 'brighthub'),
                        'default'  => false
                    ),
                    array(
                        'id'       => 'product_social_share',
                        'type'     => 'switch',
                        'title'    => esc_html__('Social Share', 'brighthub'),
                        'default'  => false
                    ),
                )
            )
        ));
         
        Redux::setSection($opt_name, array(
            'title'      => esc_html__('Custom CSS', 'brighthub'),
            'icon'       => 'el el-icon-css',
            'fields'     => array(
                array(
                    'id'       => 'custom_css',
                    'type'     => 'ace_editor',
                    'title'    => esc_html__( 'CSS Code', 'brighthub'),
                    'subtitle' => esc_html__( 'Enter your CSS code in the field below. Do not include any tags or HTML in the field. Custom CSS entered here will override the theme CSS. In some cases, the !important tag may be needed. Don\'t URL encode image or svg paths. Contents of this field will be auto encoded.', 'brighthub' ),
                    'mode'     => 'css',
                    'options' => array( 'minLines' => 20, 'maxLines' => 60 )
                ),  
                    
            )
        ));
    
        Redux::setSection($opt_name, array(
            'title'      => esc_html__('Custom JS', 'brighthub'),
            'icon'       => 'el el-icon-edit',
            'fields'     => array(
                array(
                    'id'       => 'custom_js',
                    'type'     => 'ace_editor',
                    'title'    => esc_html__( 'JS Code', 'brighthub'),
                    'subtitle' => esc_html__( 'Enter your JS code in the field below. You can add your Google Analytics Code here. Do not enter any <script> tags in this field.', 'brighthub' ),
                    'mode'     => 'javascript',
                    'options' => array( 'minLines' => 20, 'maxLines' => 60 )
                ),    
                
            )
        ));
    }
    
    /*--------------------------------------------------------------
    # 404
    --------------------------------------------------------------*/
    
    Redux::setSection($opt_name, array(
        'title' => esc_html__('404', 'brighthub'),
        'icon'  => 'el el-edit',
        'fields'     => array_merge(
            brighthub_header_404(),
            brighthub_content_404(),
            brighthub_footer_404(),
            array(
                array(
                    'id'       => '404_slogan',
                    'type'     => 'text',
                    'title'    => esc_html__('Slogan', 'brighthub'),
                    'default'  => 'Lost, but not forgotten.',
                ),
                array(
                    'id'      => '404_title',
                    'type'    => 'text',
                    'title'   => esc_html__('Title', 'brighthub'),
                    'default' => 'No worries<br>Let\'s start fresh.',
                ),
                array(
                    'id'      => '404_desc',
                    'type'    => 'text',
                    'title'   => esc_html__('Description', 'brighthub'),
                    'default' => 'Looks like the page you’re searching for has moved, doesn\'t exist, or got lost in cyberspace.',
                ),
                array(
                    'id'      => '404_button_text',
                    'type'    => 'text',
                    'title'   => esc_html__('Button Text', 'brighthub'),
                    'default' => 'Back to Home',
                ),
            )
        )
    ));
}
