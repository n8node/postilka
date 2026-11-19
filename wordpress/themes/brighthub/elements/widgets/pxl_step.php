<?php
pxl_add_custom_widget(
    array(
        'name'       => 'pxl_step',
        'title'      => esc_html__('Case Step', 'brighthub'),
        'icon'       => 'eicon-number-field case-widget',
        'categories' => array('pxltheme-core'),

        'params'     => array(
            'sections' => array(

                array(
                    'name'  => 'section_layout',
                    'label' => esc_html__('Layout', 'brighthub'),
                    'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name'    => 'layout',
                            'label'   => esc_html__('Templates', 'brighthub'),
                            'type'    => 'layoutcontrol',
                            'default' => '1',
                            'options' => array(
                                '1' => array(
                                    'label' => esc_html__('Layout 1', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_step/layout-1.jpg',
                                ),
                                '2' => array(
                                    'label' => esc_html__('Layout 2', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_step/layout-2.jpg',
                                ),
                                '3' => array(
                                    'label' => esc_html__('Layout 3', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_step/layout-3.jpg',
                                ),
                            ),
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
                    'name'      => 'section_content_l1',
                    'label'     => esc_html__('Content', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => array('layout' => '1'),
                    'controls'  => array(
                        array(
                            'name'    => 'style_item',
                            'label'   => esc_html__('Style', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'options' => array(
                                '1'  => esc_html__('Style 1 (Default)', 'brighthub'),
                                's2' => esc_html__('Style 2', 'brighthub'),
                            ),
                            'default' => '1',
                        ),
                        array(
                            'name'    => 'l1_number',
                            'label'   => esc_html__('Step Number', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::TEXT,
                            'default' => '01',
                        ),
                        array(
                            'name'        => 'l1_title',
                            'label'       => esc_html__('Title', 'brighthub'),
                            'type'        => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default'     => esc_html__('Drag & Drop Editor – No Coding Required', 'brighthub'),
                        ),
                        array(
                            'name'        => 'l1_desc',
                            'label'       => esc_html__('Description', 'brighthub'),
                            'type'        => \Elementor\Controls_Manager::TEXTAREA,
                            'label_block' => true,
                            'default'     => esc_html__('Design high-converting pages in minutes with our intuitive drag-and-drop editor. No coding, no hassle—just pure creativity at your fingertips.', 'brighthub'),
                        ),
                    ),
                ),

                array(
                    'name'      => 'section_style_l1',
                    'label'     => esc_html__('Style', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => array('layout' => '1'),
                    'controls'  => array(
                        array(
                            'name'      => 'number_l1_color',
                            'label'     => esc_html__('Number Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__number' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'number_l1_typography',
                            'label'        => esc_html__('Number Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__number',
                        ),
                        array(
                            'name'      => 'title_l1_color',
                            'label'     => esc_html__('Title Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__content-title' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'title_l1_typography',
                            'label'        => esc_html__('Title Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__content-title',
                        ),
                        array(
                            'name'      => 'desc_l1_color',
                            'label'     => esc_html__('Description Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__content-desc' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'desc_l1_typography',
                            'label'        => esc_html__('Description Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__content-desc',
                        ),
                    ),
                ),

                array(
                    'name'      => 'section_content_l2',
                    'label'     => esc_html__('Content', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => array('layout' => '2'),
                    'controls'  => array(
                        array(
                            'name'      => 'auto_play_l2',
                            'label'     => esc_html__('Auto Play', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'label_on'  => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default'   => 'yes',
                        ),
                        array(
                            'name'      => 'auto_play_once_l2',
                            'label'     => esc_html__('Auto Play Once', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'label_on'  => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default'   => 'no',
                            'condition' => array('auto_play_l2' => 'yes'),
                        ),
                        array(
                            'name'        => 'step_l2',
                            'label'       => esc_html__('List Feature', 'brighthub'),
                            'type'        => \Elementor\Controls_Manager::REPEATER,
                            'description' => esc_html__('Limit 8 items', 'brighthub'),
                            'controls'    => array(
                                array(
                                    'name'    => 'l2_number',
                                    'label'   => esc_html__('Step Number', 'brighthub'),
                                    'type'    => \Elementor\Controls_Manager::TEXT,
                                    'default' => '01',
                                ),
                                array(
                                    'name'        => 'l2_title',
                                    'label'       => esc_html__('Title', 'brighthub'),
                                    'type'        => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default'     => esc_html__('Drag & Drop Editor – No Coding Required', 'brighthub'),
                                ),
                                array(
                                    'name'        => 'l2_desc',
                                    'label'       => esc_html__('Description', 'brighthub'),
                                    'type'        => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                    'default'     => esc_html__('Design high-converting pages in minutes with our intuitive drag-and-drop editor. No coding, no hassle—just pure creativity at your fingertips.', 'brighthub'),
                                ),
                            ),
                            'title_field' => '{{{ l2_title }}}',
                        ),
                    ),
                ),

                array(
                    'name'      => 'section_style_l2',
                    'label'     => esc_html__('Style', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => array('layout' => '2'),
                    'controls'  => array(
                        array(
                            'name'      => 'number_color_l2',
                            'label'     => esc_html__('Number Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-number' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'      => 'number_color_active_l2',
                            'label'     => esc_html__('Number Color (Active)', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item.active .pxl-step__feature-number' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'number_typography_l2',
                            'label'        => esc_html__('Number Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-number',
                        ),

                        array(
                            'name'      => 'title_color_l2',
                            'label'     => esc_html__('Title Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-title' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'      => 'title_color_active_l2',
                            'label'     => esc_html__('Title Color (Active)', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item.active .pxl-step__feature-title' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'title_typography_l2',
                            'label'        => esc_html__('Title Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-title',
                        ),

                        array(
                            'name'      => 'desc_color_l2',
                            'label'     => esc_html__('Description Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-desc' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'      => 'desc_color_active_l2',
                            'label'     => esc_html__('Description Color (Active)', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-item.active .pxl-step__feature-desc' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'desc_typography_l2',
                            'label'        => esc_html__('Description Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__feature-item .pxl-step__feature-desc',
                        ),
                    ),
                ),

                array(
                    'name'      => 'section_content_l3',
                    'label'     => esc_html__('Content', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => array('layout' => '3'),
                    'controls'  => array(
                        array(
                            'name'      => 'auto_play_l3',
                            'label'     => esc_html__('Auto Play', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SWITCHER,
                            'label_on'  => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default'   => 'yes',
                        ),
                        array(
                            'name'        => 'step_l3',
                            'label'       => esc_html__('List Feature', 'brighthub'),
                            'type'        => \Elementor\Controls_Manager::REPEATER,
                            'description' => esc_html__('Limit 8 items', 'brighthub'),
                            'controls'    => array(
                                array(
                                    'name'        => 'l3_title',
                                    'label'       => esc_html__('Title', 'brighthub'),
                                    'type'        => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default'     => esc_html__('Drag & Drop Editor – No Coding Required', 'brighthub'),
                                ),
                                array(
                                    'name'        => 'l3_desc',
                                    'label'       => esc_html__('Description', 'brighthub'),
                                    'type'        => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                    'description' => esc_html__('You can use HTML tags', 'brighthub'),
                                    'default'     => esc_html__('Design high-converting pages in minutes with our intuitive drag-and-drop editor. No coding, no hassle—just pure creativity at your fingertips.', 'brighthub'),
                                ),
                            ),
                            'title_field' => '{{{ l3_title }}}',
                        ),
                    ),
                ),

                array(
                    'name'      => 'section_style_l3',
                    'label'     => esc_html__('Style', 'brighthub'),
                    'tab'       => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => array('layout' => '3'),
                    'controls'  => array(
                        array(
                            'name'      => 'title_color_l3',
                            'label'     => esc_html__('Title Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-title' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'title_typography_l3',
                            'label'        => esc_html__('Title Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__feature-title',
                        ),
                        array(
                            'name'      => 'desc_color_l3',
                            'label'     => esc_html__('Description Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-step__feature-desc' => 'color: {{VALUE}};',
                            ),
                        ),
                        array(
                            'name'         => 'desc_typography_l3',
                            'label'        => esc_html__('Description Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-step__feature-desc',
                        ),
                    ),
                ),

                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);
