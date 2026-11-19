<?php
 
add_action( 'pxl_post_metabox_register', 'brighthub_page_options_register' );
function brighthub_page_options_register( $metabox ) {
 
	$panels = [
		'post' => [
			'opt_name'            => 'post_option',
			'display_name'        => esc_html__( 'Post Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'post_settings' => [
					'title'  => esc_html__( 'Post Options', 'brighthub' ),
					'icon'   => 'el el-cog',
					'fields' => array_merge(
						brighthub_sidebar_pos_opts(['prefix' => 'post_', 'default' => true, 'default_value' => '-1']),
						array(
					        array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'brighthub' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							),
							array(
								'id'             => 'post_time_read',
								'type'           => 'text',
								'title'          => esc_html__( 'Time Read(Minute)', 'brighthub' ),
								'default'		 => '7'
							),
					    )
					)
				]
			]
		],
		'page' => [
			'opt_name'            => 'pxl_page_options',
			'display_name'        => esc_html__( 'Page Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'Header', 'brighthub' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
				        brighthub_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						brighthub_header_mobile_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
				                'id'       => 'header_display',
				                'type'     => 'button_set',
				                'title'    => esc_html__('Header Display', 'brighthub'),
				                'options'  => array(
				                    'show' => esc_html__('Show', 'brighthub'),
				                    'hide'  => esc_html__('Hide', 'brighthub'),
				                ),
				                'default'  => 'show',
				            ),
				            array(
				                'id'       => 'page_mobile_style',
				                'type'     => 'button_set',
				                'title'    => esc_html__('Mobile Style', 'brighthub'),
				                'options'  => array(
				                    'inherit'  => esc_html__('Inherit', 'brighthub'),
				                    'light'  => esc_html__('Light', 'brighthub'),
				                    'dark'  => esc_html__('Dark', 'brighthub'),
				                ),
				                'default'  => 'inherit',
				            ),
							array(
								'id'       => 'logo_m',
								'type'     => 'media',
								'title'    => esc_html__('Mobile Logo Dark', 'brighthub'),
								'default'  => '',
								'url'      => false,
						 	),
					        array(
				                'id'       => 'p_menu',
				                'type'     => 'select',
				                'title'    => esc_html__( 'Menu', 'brighthub' ),
				                'options'  => brighthub_get_nav_menu_slug(),
				                'default' => '',
				                'description' => 'When you select Custom Menu. The custom menu will apply to the entire layout when you use Case Nav Menu widget in Elementor and Menu on header layout in Mobile.'
				            ),
					    ),
					    array(
				            array(
				                'id'       => 'sticky_scroll',
				                'type'     => 'button_set',
				                'title'    => esc_html__('Sticky Scroll', 'brighthub'),
				                'options'  => array(
				                    '-1' => esc_html__('Inherit', 'brighthub'),
				                    'pxl-sticky-stt' => esc_html__('Scroll To Top', 'brighthub'),
				                    'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'brighthub'),
				                ),
				                'default'  => '-1',
				            ),
				            array(
				                'id'       => 'header_margin',
				                'type'     => 'spacing',
				                'mode'     => 'margin',
				                'title'    => esc_html__('Margin', 'brighthub'),
				                'width'    => false,
				                'unit'     => 'px',
				                'output'    => array('#pxl-header-elementor .pxl-header-elementor-main'),
				            ),
				        )
				    )
					 
				],
				'page_title' => [
					'title'  => esc_html__( 'Page Title', 'brighthub' ),
					'icon'   => 'el el-indent-left',
					'fields' => array_merge(
				        brighthub_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'             => 'slogan_before',
								'type'           => 'text',
								'title'          => esc_html__( 'Slogan Before', 'brighthub' ),
							),
							array(
								'id'             => 'slogan_after',
								'type'           => 'text',
								'title'          => esc_html__( 'Slogan After', 'brighthub' ),
							),
							array(
								'id'             => 'title_custom',
								'type'           => 'text',
								'title'          => esc_html__( 'Title Custom', 'brighthub' ),
							),
							array(
								'id'             => 'desc_page',
								'type'           => 'text',
								'title'          => esc_html__( 'Description Below Title', 'brighthub' ),
							),
						),
				    )
				],
				'content' => [
					'title'  => esc_html__( 'Content', 'brighthub' ),
					'icon'   => 'el-icon-pencil',
					'fields' => array_merge(
						brighthub_sidebar_pos_opts(['prefix' => 'page_', 'default' => false, 'default_value' => '0']),
						array(
					        array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'brighthub' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							), 
					    )
					)
				],
				'footer' => [
					'title'  => esc_html__( 'Footer', 'brighthub' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
				        brighthub_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
				                'id'       => 'footer_display',
				                'type'     => 'button_set',
				                'title'    => esc_html__('Footer Display', 'brighthub'),
				                'options'  => array(
				                    'show' => esc_html__('Show', 'brighthub'),
				                    'hide'  => esc_html__('Hide', 'brighthub'),
				                ),
				                'default'  => 'show',
				            ),
							array(
				                'id'       => 'p_footer_fixed',
				                'type'     => 'button_set',
				                'title'    => esc_html__('Footer Fixed', 'brighthub'),
				                'options'  => array(
				                    'inherit' => esc_html__('Inherit', 'brighthub'),
				                    'on' => esc_html__('On', 'brighthub'),
				                    'off' => esc_html__('Off', 'brighthub'),
				                ),
				                'default'  => 'inherit',
				            ),
						)
				    )
				],
				'colors' => [
					'title'  => esc_html__( 'Colors', 'brighthub' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
				        array(
				        	array(
							    'id'        => 'page_body_color',
							    'type'      => 'color',
							    'title'     => esc_html__('Body Background Color', 'brighthub'),
							    'default'   => '',
							    'transparent' => false,
							    'output'    => array(
							        'background-color' => 'body',
							    )
							),
				        	array(
					            'id'          => 'primary_color',
					            'type'        => 'color',
					            'title'       => esc_html__('Primary Color', 'brighthub'),
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
					    )
				    )
				],
				'extra' => [
					'title'  => esc_html__( 'Extra', 'brighthub' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
				        array(
				        	array(
					            'id' => 'body_custom_class',
					            'type' => 'text',
					            'title' => esc_html__('Body Custom Class', 'brighthub'),
					        ),
							array(
					            'id' => 'bg_light_effect',
					            'type' => 'button_set',
					            'title' => esc_html__('Background Effect', 'brighthub'),
					            'default' => 'off',
					            'options' => array(
					                'on' => esc_html__('On', 'brighthub'),
					                'off' => esc_html__('Off', 'brighthub'),
					            ),
					        ),
							array(
								'id' => 'select_background_effect',
								'type' => 'select',
								'title' => esc_html__('Select Background Effect', 'brighthub'),
								'default' => 'none',
								'description' => esc_html__('Select the background effect to use', 'brighthub'),
								'required' => array( 0 => 'bg_light_effect', 1 => 'equals', 2 => 'on' ),
								'options' => array(
									'none' => esc_html__('None', 'brighthub'),
									'floating-blobs' => esc_html__('Floating Blobs', 'brighthub'),
									'video-background' => esc_html__('Video Background', 'brighthub'),
								),
							),
							array(
								'id' => 'video_background_url',
								'type' => 'text',
								'title' => esc_html__('Video Background URL', 'brighthub'),
								'default' => '',
								'required' => array( 0 => 'select_background_effect', 1 => 'equals', 2 => 'video-background' ),
							),
					    )
				    )
				]
			]
		],

		'template' => [
			'opt_name'            => 'pxl_template_options',
			'display_name'        => esc_html__( 'Template Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'General', 'brighthub' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						array(
							array(
					            'id'=> 'template_external_link',
					            'type' => 'text',
					            'title' => esc_html__('External Link', 'brighthub'),
					            'default' => '#',
					        ),
							array(
					            'id'=> 'template_excerpt',
					            'type' => 'textarea',
					            'title' => esc_html__('Excerpt', 'brighthub'),
					            'validate' => 'html_custom',
					            'default' => '',
					        ),
					        array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Content Spacing Top/Bottom', 'brighthub' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							),
						),
						brighthub_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						])
				    )
				],
			]
		],

		'b2b' => [
			'opt_name'            => 'pxl_b2b_options',
			'display_name'        => esc_html__( 'B2B Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'b2b_settings' => [
					'title'  => esc_html__( 'General', 'brighthub' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						array(
							array(
					            'id'=> 'b2b_external_link',
					            'type' => 'text',
					            'title' => esc_html__('External Link', 'brighthub'),
					            'default' => '#',
					        ),
							array(
					            'id'=> 'b2b_price',
					            'type' => 'text',
					            'title' => esc_html__('Price', 'brighthub'),
					            'validate' => 'html_custom',
					            'default' => '',
					        ),
							array(
					            'id'=> 'badge',
					            'type' => 'text',
					            'title' => esc_html__('Badge Text', 'brighthub'),
					            'default' => '',
					        ),
							array(
					            'id'=> 'b2b_badge_icon',
					            'type' => 'media',
					            'title' => esc_html__('Badge Icon', 'brighthub'),
					            'default' => '',
					        ),
					        array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'B2B Spacing Top/Bottom', 'brighthub' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							),
						),
				    )
				],
			]
		],

		'career' => [
			'opt_name'            => 'pxl_career_options',
			'display_name'        => esc_html__( 'Career Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'General', 'brighthub' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						array(
					        array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Content Spacing Top/Bottom', 'brighthub' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							),
							array(
								'id'             => 'career_position',
								'title'          => esc_html__( 'Position', 'brighthub' ),
								'type'           => 'text',
								'default'		 => 'Customer Experience Specialist'
							),
							array(
								'id'             => 'career_type',
								'title'          => esc_html__( 'Type', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => 'Full-time'
							),
							array(
								'id'             => 'career_team',
								'title'          => esc_html__( 'Team', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => 'Support & Success'
							),
							array(
								'id'             => 'career_location',
								'title'          => esc_html__( 'Location', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => 'London, UK'
							),
							array(
								'id'             => 'career_icon_before_title',
								'title'          => esc_html__( 'Icon Before Title', 'brighthub' ),
								'type'           => 'media',
							),
							array(
								'id'             => 'career_location_icon',
								'title'          => esc_html__( 'Location Icon', 'brighthub' ),
								'type'           => 'media',
							),
							array(
								'id'             => 'career_salary',
								'title'          => esc_html__( 'Salary Range', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => '$68,000 – $92,000 USD/year'
							),
							array(
								'id'             => 'career_salary_loop',
								'title'          => esc_html__( 'Salary Show In Loop', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => '$92K/year'
							),
							array(
								'id'             => 'career_slot',
								'title'          => esc_html__( 'Slot Number', 'brighthub' ),
								'type'           => 'text',
								'default' 		 => '2 slots left'
							),
						),
				    )
				],
			]
		],

		'pxl-template' => [ //post_type
			'opt_name'            => 'pxl_hidden_template_options',
			'display_name'        => esc_html__( 'Template Options', 'brighthub' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'General', 'brighthub' ),
					'icon'   => 'el-icon-website',
					'fields' => array(
						array(
							'id'    => 'template_type',
							'type'  => 'select',
							'title' => esc_html__('Type', 'brighthub'),
				            'options' => [
				            	'df'       	   => esc_html__('Select Type', 'brighthub'), 
								'header'       => esc_html__('Header Desktop', 'brighthub'),
								'header-mobile'       => esc_html__('Header Mobile', 'brighthub'),
								'footer'       => esc_html__('Footer', 'brighthub'), 
								'mega-menu'    => esc_html__('Mega Menu', 'brighthub'), 
								'page-title'   => esc_html__('Page Title', 'brighthub'), 
								'tab' => esc_html__('Tab', 'brighthub'),
								'accordion' => esc_html__('Accordion', 'brighthub'),
								'hidden-panel' => esc_html__('Hidden Panel', 'brighthub'),
								'widget' => esc_html__('Widget Sidebar', 'brighthub'),
								'popup' => esc_html__('Popup', 'brighthub'),
								'page' => esc_html__('Page', 'brighthub'),
								'slider' => esc_html__('Slider', 'brighthub'),
								'404' => esc_html__('404', 'brighthub'),
				            ],
				            'default' => 'df',
				        ),
				        array(
							'id'    => 'header_type',
							'type'  => 'select',
							'title' => esc_html__('Header Type', 'brighthub'),
				            'options' => [
				            	'px-header--default'       	   => esc_html__('Default', 'brighthub'), 
								'px-header--transparent'       => esc_html__('Transparent', 'brighthub'),
								'px-header--left_sidebar'       => esc_html__('Left Sidebar', 'brighthub'),
				            ],
				            'default' => 'px-header--default',
				            'indent' => true,
                			'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'header' ),
				        ),

				        array(
							'id'    => 'header_mobile_type',
							'type'  => 'select',
							'title' => esc_html__('Header Type', 'brighthub'),
				            'options' => [
				            	'px-header--default'       	   => esc_html__('Default', 'brighthub'), 
								'px-header--transparent'       => esc_html__('Transparent', 'brighthub'),
				            ],
				            'default' => 'px-header--default',
				            'indent' => true,
                			'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'header-mobile' ),
				        ),

				        array(
							'id'    => 'hidden_panel_position',
							'type'  => 'select',
							'title' => esc_html__('Hidden Panel Position', 'brighthub'),
				            'options' => [
				            	'top'       	   => esc_html__('Top', 'brighthub'),
				            	'right'       	   => esc_html__('Right', 'brighthub'),
				            ],
				            'default' => 'right',
				            'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'hidden-panel' ),
				        ),
				        array(
				            'id'          => 'hidden_panel_height',
				            'type'        => 'text',
				            'title'       => esc_html__('Hidden Panel Height', 'brighthub'),
				            'subtitle'       => esc_html__('Enter number.', 'brighthub'),
				            'transparent' => false,
				            'default'     => '',
				            'force_output' => true,
				            'required' => array( 0 => 'hidden_panel_position', 1 => 'equals', 2 => 'top' ),
				        ),
				        array(
				            'id'          => 'hidden_panel_boxcolor',
				            'type'        => 'color',
				            'title'       => esc_html__('Box Color', 'brighthub'),
				            'transparent' => false,
				            'default'     => '',
				            'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'hidden-panel' ),
				        ),
				        array(
				            'id'          => 'header_sidebar_width',
				            'type'        => 'slider',
				            'title'       => esc_html__('Header Sidebar Width', 'brighthub'),
				            "default"   => 300,
						    "min"       => 50,
						    "step"      => 1,
						    "max"       => 900,
				            'force_output' => true,
				            'required' => array( 0 => 'header_type', 1 => 'equals', 2 => 'px-header--left_sidebar' ),
				        ),

				        array(
							'id'    => 'header_sidebar_style',
							'type'  => 'select',
							'title' => esc_html__('Header Sidebar Style', 'brighthub'),
				            'options' => [
				            	'px-header-sidebar-style1'      => esc_html__('Style 1', 'brighthub'), 
								'px-header-sidebar-style2'      => esc_html__('Style 2', 'brighthub'),
				            ],
				            'default' => 'px-header-sidebar-style1',
				            'indent' => true,
                			'required' => array( 0 => 'header_type', 1 => 'equals', 2 => 'px-header--left_sidebar' ),
				        ),
					),
				    
				],
			]
		],
	];
 
	$metabox->add_meta_data( $panels );
}
 