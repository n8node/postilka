<?php
$templates = brighthub_get_templates_option('tab', []) ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_tabs',
        'title' => esc_html__( 'Case Tabs', 'brighthub' ),
        'icon' => 'eicon-tabs case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-tabs'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__( 'Tabs', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Layout', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Default',
                                '2' => 'Tabs FAQs',
                                '3' => 'Tabs Toggle Swich',
                                '4' => 'Tabs Left',
                            ],
                            'default' => '1',
                        ),
                        array(
                            'name' => 'tabs_left_style',
                            'label' => esc_html__('Tabs Left Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Style 1',
                                'style-2' => 'Style 2',
                            ],
                            'default' => 'style-1',
                            'condition' => [
                                'layout' => ['4'],
                            ],
                        ),
                       
                        array(
                            'name' => 'enable_calculator_number',
                            'label' => esc_html__('Enable Calculator Number', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub' ),
                            'label_off' => esc_html__('No', 'brighthub' ),
                            'default' => 'false',
                            'description' => esc_html__('Work Only Pricing Widget Layout 4 and 5', 'brighthub' ),
                            'condition' => [
                                'layout' => ['3'],
                            ],
                        ),
                        array(
                            'name' => 'enable_switch_currency',
                            'label' => esc_html__('Enable Switch Currency', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                            'condition' => [
                                'layout' => ['3'],
                            ],
                            'description' => esc_html__('Work Only Pricing Widget Layout 4 and 5', 'brighthub' ),
                        ),
                        array(
                            'name' => 'number_item_select_map',
                            'label' => esc_html__('Number Item Select', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'item_select_map',
                                    'label' => esc_html__('Quantity Select', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'item_select_text_after',
                                    'label' => esc_html__('Item Select Text After', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ item_select_map }}}',
                            'condition' => [
                                'enable_calculator_number' => ['true'],
                            ],
                        ),
                        array(
                            'name' => 'show_custom_select',
                            'label' => esc_html__('Show Custom Select', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub' ),
                            'label_off' => esc_html__('No', 'brighthub' ),
                            'default' => 'false',
                            'condition' => [
                                'enable_calculator_number' => ['true'],
                            ],
                        ),
                        array(
                            'name' => 'list_data_currency',
                            'label' => esc_html__('List Data Currency', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'currency',
                                    'label' => esc_html__('Currency', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'currency_symbol',
                                    'label' => esc_html__('Currency Symbol', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'price_for_plan',
                                    'label' => esc_html__('Price For Plan(Monthly)', 'brighthub' ),
                                    'description' => esc_html__('Price for plan with number plan in tab: ex: 8, 18, 28 with Free plan, Professional plan, Enterprise plan. Please input not space', 'brighthub' ),
                                    'default' => '12,29,99',
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'price_for_plan_annual',
                                    'label' => esc_html__('Price For Plan(Annual)', 'brighthub' ),
                                    'description' => esc_html__('Price for plan with number plan in tab: ex: 8, 18, 28 with Free plan, Professional plan, Enterprise plan. Please input not space', 'brighthub' ),
                                    'default' => '99, 169, 999',
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                            ),
                            'title_field' => '{{{ currency }}}',
                            'condition' => [
                                'enable_switch_currency' => ['true'],
                            ],
                        ),

                        array(
                            'name' => 'align',
                            'label' => esc_html__( 'Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-text-align-left',
                                ],
                                'unset' => [
                                    'title' => esc_html__( 'Center', 'brighthub' ),
                                    'icon' => 'eicon-text-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-text-align-right',
                                ],
                            ],  
                            'default' => 'unset',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs__list' => 'float: {{VALUE}}; margin-{{VALUE}}: unset;',
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs__switch' => 'float: {{VALUE}}; margin-{{VALUE}}: unset;',
                            ],
                            'condition' => [
                                'layout' => ['1','2'],
                            ],
                        ),
                        array(
                            'name' => 'position_tabs',
                            'label' => esc_html__( 'Position Tabs', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '0' => esc_html__( 'Top', 'brighthub' ),
                                '1' => esc_html__( 'Bottom', 'brighthub' ),
                            ],
                            'default' => '0',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs__list' => 'order: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'tab_active',
                            'label' => esc_html__( 'Active Tab', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 1,
                            'separator' => 'after',
                        ),
                        array(
                            'name'      => 'show_count',
                            'label'     => esc_html__('Show Count', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'default'   => 'yes',
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'show_all_option',
                            'label'     => esc_html__('Show View All', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'default'   => 'yes',
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'view_all_txt',
                            'label'     => esc_html__('View All Text', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default'   => esc_html__('View All', 'brighthub'),
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'show_load_more',
                            'label'     => esc_html__('Show Load More', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'default'   => 'yes',
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'df_number',
                            'label'     => esc_html__('Item Each Load', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::NUMBER,
                            'default'   => '6',
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'load_more_text',
                            'label'     => esc_html__('Load More Text', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default'   => esc_html__('Load More', 'brighthub'),
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'tab1_text',
                            'label'     => esc_html__('Tab 1 Text', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'layout' => ['3'],
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'content_template_tab_1',
                            'label' => esc_html__('Select Template Tab 1', 'brighthub'),
                            'type' => 'select',
                            'options' => $templates,
                            'default' => 'df',
                            'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                            'condition' => ['layout' => '3'],
                            'separator' => 'after'
                        ),
                        array(
                            'name'      => 'tab2_text',
                            'label'     => esc_html__('Tab 2 Text', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'layout' => ['3'],
                            ],
                        ),
                        array(
                            'name' => 'content_template_tab_2',
                            'label' => esc_html__('Select Template Tab 2', 'brighthub'),
                            'type' => 'select',
                            'options' => $templates,
                            'default' => 'df',
                            'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                            'condition' => ['layout' => '3'],
                            'separator' => 'after'
                        ),

                        array(
                            'name'      => 'sale_txt',
                            'label'     => esc_html__('Sale Text', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default' => '20% off',
                            'condition' => [
                                'layout' => ['3'],
                            ],
                        ),
                        array(
                            'name' => 'tabs',
                            'label' => esc_html__( 'Content', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__( 'Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'icon_type',
                                    'label' => esc_html__( 'Icon Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'control_type' => 'responsive',
                                    'options' => [
                                        'icon' => 'Icon',
                                        'image' => 'Image',
                                    ],  
                                    'default' => 'unset',
                                ),
                                array(
                                    'name' => 'pxl_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                    'condition' => ['icon_type' => 'icon']
                                ),
                                array(
                                    'name' => 'pxl_image',
                                    'label' => esc_html__('Icon Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'fa4compatibility' => 'icon',
                                    'condition' => ['icon_type' => 'image']
                                ),
                                array(
                                    'name' => 'content_type',
                                    'label' => esc_html__('Content Type', 'brighthub'),
                                    'type' => 'select',
                                    'options' => [
                                        'df' => esc_html__( 'Default', 'brighthub' ),
                                        'template' => esc_html__( 'From Template Builder', 'brighthub' )
                                    ],
                                    'default' => 'df' 
                                ),
                                array(
                                    'name' => 'desc',
                                    'label' => esc_html__( 'Content', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::WYSIWYG,
                                    'condition' => ['content_type' => 'df'] 
                                ),
                                array(
                                    'name' => 'content_template',
                                    'label' => esc_html__('Select Template', 'brighthub'),
                                    'type' => 'select',
                                    'options' => $templates,
                                    'default' => 'df',
                                    'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                                    'condition' => ['content_type' => 'template'] 
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                            'condition' => [
                                'layout' => ['1','2', '4'],
                            ],
                        ),
                        array(
                            'name' => 'max_width',
                            'label' => esc_html__('Content Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs--inner' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_tag',
                            'label' => esc_html__('Title HTML Tag', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'df' => 'Default',
                                'h1' => 'H1',
                                'h2' => 'H2',
                                'h3' => 'H3',
                                'h4' => 'H4',
                                'h5' => 'H5',
                                'h6' => 'H6',
                                'div' => 'div',
                                'span' => 'span',
                                'p' => 'p',
                            ],
                            'default' => 'df',
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_style',
                    'label' => esc_html__( 'Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Style 1',
                                'style-2' => 'Style 2',
                                'style-3' => 'Style 3',
                                'style-4' => 'Style 4',
                            ],
                            'default' => 'style-1',
                            'condition' => ['layout' => '1']
                        ),
                        array(
                            'name' => 'tab_effect',
                            'label' => esc_html__('Effect', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'tab-effect-slide' => 'Slide',
                                'tab-effect-fade' => 'Fade',
                            ],
                            'default' => 'tab-effect-slide',
                        ),
                        array(
                            'name' => 'space_bottom',
                            'label' => esc_html__('Space Tabs With Content', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs__inner' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'space_item',
                            'label' => esc_html__('Space Item', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs .pxl-tabs__list' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'background_color_type',
                            'label' => esc_html__('Background Color Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'color' => 'Color',
                                'gradient' => 'Gradient',
                            ],
                            'default' => 'color',
                        ),
                        array(
                            'name' => 'title_active_color',
                            'label' => esc_html__('Title Active Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item.active' => 'color: {{VALUE}};',
                            ],
                            
                        ),
                        array(
                            'name' => 'title_active_bg_color',
                            'label' => esc_html__('Title Active Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item.active' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'background_color_type' => 'color',
                            ],
                        ),
                        array(
                            'name'         => 'title_active_gradient',
                            'label' => esc_html__( 'Title Active Color Gradient', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => [ 'gradient' ],
                            'selector'     => '{{WRAPPER}} .pxl-tabs__list-item.active',
                            'condition' => ['background_color_type' => 'gradient']
                        ),
                        array(
                            'name' => 'padding_tab',
                            'label' => esc_html__('Padding Tab', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'padding_tab_item',
                            'label' => esc_html__('Padding Tab Item', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'padding_tab_item_active',
                            'label' => esc_html__('Padding Tab Item Active', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item.active' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'         => 'tab_box_shadow',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-tabs__list',
                        ),
                        array(
                            'name' => 'tab_border_type',
                            'label' => esc_html__( 'Border Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => esc_html__( 'None', 'brighthub' ),
                                'solid' => esc_html__( 'Solid', 'brighthub' ),
                                'double' => esc_html__( 'Double', 'brighthub' ),
                                'dotted' => esc_html__( 'Dotted', 'brighthub' ),
                                'dashed' => esc_html__( 'Dashed', 'brighthub' ),
                                'groove' => esc_html__( 'Groove', 'brighthub' ),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list' => 'border-style: {{VALUE}};',
                            ],
                            'condition' => [
                                'tab_border_type!' => '',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'tab_border_type!' => '',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color',
                            'label' => esc_html__( 'Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'tab_border_type!' => '',
                            ],
                        ),
                        array(
                            'name' => 'tab_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'tab_border_radius_item',
                            'label' => esc_html__('Border Radius Item', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__list-item' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-tabs__list-item',
                            'separator' => 'after',
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_style_toggle',
                    'label' => esc_html__( 'Style Toggle Button', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['3'],
                    ],
                    'controls' => array(
                        array(
                            'name' => 'style_toggle_buttons',
                            'label' => esc_html__('Toggle Button Wrap', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Style 1',
                                'style-2' => 'Style 2',
                            ],
                            'default' => 'style-1',
                        ),
                        array(
                            'name' => 'toggle_button_width',
                            'label' => esc_html__('Toggle Button Wrap Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'default' => [
                                'unit' => 'px',
                                'size' => 60,
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 200,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab ' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_height',
                            'label' => esc_html__('Toggle Button Wrap Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'default' => [
                                'unit' => 'px',
                                'size' => 32,
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab ' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_background_color',
                            'label' => esc_html__('Toggle Button Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab ' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_border_radius_wrap',
                            'label' => esc_html__('Toggle Button Border Radius Wrap', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab ' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_dot_width',
                            'label' => esc_html__('Toggle Button Dot Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'separator' => 'before',
                            'default' => [
                                'unit' => 'px',
                                'size' => 28,
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 200,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab::before' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_dot_height',
                            'label' => esc_html__('Toggle Button Dot Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'default' => [
                                'unit' => 'px',
                                'size' => 28,
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab::before' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'toggle_button_dot_color',
                            'label' => esc_html__('Toggle Button Dot Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab::before' => 'background-color: {{VALUE}};',
                            ],
                        ),
                       
                        array(
                            'name' => 'toggle_button_border_radius_dot',
                            'label' => esc_html__('Toggle Button Border Radius Dot', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .toggleTab::before' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'tab_switch_color',
                            'label' => esc_html__('Tab Switch Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs__switch .pxl-tabs__switch-txt' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'tab_switch_sale_typography',
                            'label' => esc_html__('Tab Switch Sale Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'separator' => 'before',
                            'selector' => '{{WRAPPER}} .pxl-tabs__switch .pxl-tabs__switch-txt',
                            
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);