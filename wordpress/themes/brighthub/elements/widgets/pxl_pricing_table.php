<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_pricing_table',
        'title' => esc_html__('Case Pricing Table', 'brighthub'),
        'icon' => 'eicon-table case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-table',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_layout',
                    'label' => esc_html__('Layout', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Templates', 'brighthub' ),
                            'type' => 'layoutcontrol',
                            'default' => '1',
                            'options' => [
                                '1' => [
                                    'label' => esc_html__('Layout 1', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing_table/layout-1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing_table/layout-2.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
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
                        array(
                            'name' => 'row',
                            'label' => esc_html__('Title Row', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'column',
                            'label' => esc_html__('Title Column', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'res_type',
                            'label' => esc_html__('Responsive Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'row'    => esc_html__('Row', 'brighthub'),
                                'column'    => esc_html__('Column', 'brighthub'),
                            ],
                            'default' => 'row',
                            'description' => 'Work when Title Row and Title Column on!'
                        ),
                        array(
                            'name' => 'res_screen',
                            'label' => esc_html__('Responsive When', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '767',
                        ),
                        array(
                            'name' => 'feature_column',
                            'label' => esc_html__('Feature Column', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Number of columns equal to column content of table below!',
                            'controls' => array(
                                array(
                                    'name' => 'plan_active',
                                    'label' => esc_html__('Active Plan', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'default' => false,
                                ),
                                array(
                                    'name' => 'plan_name',
                                    'label' => esc_html__('Plan Name', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Free Plan',
                                ),
                                array(
                                    'name' => 'plan_price',
                                    'label' => esc_html__('Plan Price', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => '$0',
                                ),
                                array(
                                    'name' => 'period',
                                    'label' => esc_html__('Period', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Per Month',
                                ),
                                array(
                                    'name' => 'plan_button_text',
                                    'label' => esc_html__('Button Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Start Free',
                                ),
                                array(
                                    'name' => 'plan_button_link',
                                    'label' => esc_html__('Button Link', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                                
                            ),
                            'title_field' => '{{{ plan_name }}}',
                        ),
                        array(
                            'name' => 'table',
                            'label' => esc_html__('Table Content', 'brighthub'),
                            'type' => 'pxl_table',
                            'rows' => 3, 
                            'cols' => 3, 
                            'first_row_as_header' => true, 
                            'button_text' => esc_html__('Add Row', 'brighthub'),
                        ),
                    ),
                ),
                array(
                    'name' => 'section_responsive',
                    'label' => esc_html__('Mobile Settings', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array(
                        array(
                            'name' => 'col_xs',
                            'label' => esc_html__('Table Columns XS Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '1',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                            ],
                        ),
                        array(
                            'name' => 'col_sm',
                            'label' => esc_html__('Columns SM Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                            ],
                        ),
                        array(
                            'name' => 'col_md',
                            'label' => esc_html__('Columns MD Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_lg',
                            'label' => esc_html__('Columns LG Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xl',
                            'label' => esc_html__('Columns XL Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xxl',
                            'label' => esc_html__('Columns XXL Devices', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                    ),
                    'condition' => [
                        'res_type' => 'column'
                    ]
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);