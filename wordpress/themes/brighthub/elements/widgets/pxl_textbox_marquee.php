<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_textbox_marquee',
        'title' => esc_html__('Case Textbox Marquee', 'brighthub'),
        'icon' => 'eicon-slider-3d case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'textbox',
                            'label' => esc_html__('Item', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Title', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'description',
                                    'label' => esc_html__('Description', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ title }}}'
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
                        array(
                            'name' => 'fading',
                            'label' => esc_html__('Fading', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_off' => esc_html__('No', 'brighthub'),
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'direction',
                            'label' => esc_html__( 'Direction', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-arrow-left',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-arrow-right',
                                ], 
                                'top' => [
                                    'title' => esc_html__( 'Top', 'brighthub' ),
                                    'icon' => 'eicon-arrow-up',
                                ], 
                                'bottom' => [
                                    'title' => esc_html__( 'Bottom', 'brighthub' ),
                                    'icon' => 'eicon-arrow-down',
                                ],
                            ],
                            'default' => 'left'
                        ),
                        array(
                            'name' => 'direction_mobile',
                            'label' => esc_html__( 'Direction Mobile', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-arrow-left',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-arrow-right',
                                ], 
                                'top' => [
                                    'title' => esc_html__( 'Top', 'brighthub' ),
                                    'icon' => 'eicon-arrow-up',
                                ], 
                                'bottom' => [
                                    'title' => esc_html__( 'Bottom', 'brighthub' ),
                                    'icon' => 'eicon-arrow-down',
                                ],
                            ],
                            'default' => 'left'
                        ),
                        array(
                            'name' => 'pause_on_hover',
                            'label' => esc_html__('Pause On Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),

                        array(
                            'name' => 'time_run',
                            'label' => esc_html__('Time Run', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'control_type' => 'responsive',
                            'default' => '30',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee ul' => 'animation-duration: {{VALUE}}s;',
                            ],
                        ),

                        array(
                            'name' => 'gap',
                            'label' => esc_html__('Gap', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee ul' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'max_width',
                            'label' => esc_html__('Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => ['px', '%'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'max_height',
                            'label' => esc_html__('Max Heihgt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => ['px', '%'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee' => 'max-height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'show_scrollbar',
                            'label' => esc_html__('Show Scrollbar', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Show', 'brighthub'),
                            'label_off' => esc_html__('Hide', 'brighthub'),
                            'default' => 'yes',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'textbox_radius',
                            'label' => esc_html__('Textbox Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_padding',
                            'label' => esc_html__('Textbox Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_margin',
                            'label' => esc_html__('Textbox Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_background_color',
                            'label' => esc_html__('Textbox Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_border_color',
                            'label' => esc_html__('Textbox Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'border-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_border_width',
                            'label' => esc_html__('Textbox Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_border_style',
                            'label' => esc_html__('Textbox Border Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'solid' => esc_html__('Solid', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                                'ridge' => esc_html__('Ridge', 'brighthub'),
                                'inset' => esc_html__('Inset', 'brighthub'),
                                'outset' => esc_html__('Outset', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_shadow',
                            'label' => esc_html__('Textbox Shadow', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::BOX_SHADOW,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item' => 'box-shadow: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item .pxl-marquee__item-title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-marquee .pxl-marquee__item .pxl-marquee__item-title',
                        ),
                        array(
                            'name' => 'description_color',
                            'label' => esc_html__('Description Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item .pxl-marquee__item-desc' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'description_typography',
                            'label' => esc_html__('Description Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-marquee .pxl-marquee__item .pxl-marquee__item-desc',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_hover_active',
                    'label' => esc_html__('Style Hover/Active', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'textbox_hover_radius',
                            'label' => esc_html__('Textbox Hover Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_padding',
                            'label' => esc_html__('Textbox Hover Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_margin',
                            'label' => esc_html__('Textbox Hover Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_background_color',
                            'label' => esc_html__('Textbox Hover Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_border_color',
                            'label' => esc_html__('Textbox Hover Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'border-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_border_width',
                            'label' => esc_html__('Textbox Hover Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_border_style',
                            'label' => esc_html__('Textbox Hover Border Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'solid' => esc_html__('Solid', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                                'ridge' => esc_html__('Ridge', 'brighthub'),
                                'inset' => esc_html__('Inset', 'brighthub'),
                                'outset' => esc_html__('Outset', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'textbox_hover_shadow',
                            'label' => esc_html__('Textbox Hover Shadow', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::BOX_SHADOW,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active' => 'box-shadow: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_hover_color',
                            'label' => esc_html__('Title Hover Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover .pxl-marquee__item-title, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active .pxl-marquee__item-title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_hover_typography',
                            'label' => esc_html__('Title Hover Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover .pxl-marquee__item-title, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active .pxl-marquee__item-title',
                        ),
                        array(
                            'name' => 'description_hover_color',
                            'label' => esc_html__('Description Hover Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover .pxl-marquee__item-desc, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active .pxl-marquee__item-desc' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'description_hover_typography',
                            'label' => esc_html__('Description Hover Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-marquee .pxl-marquee__item:hover .pxl-marquee__item-desc, {{WRAPPER}} .pxl-marquee .pxl-marquee__item.active .pxl-marquee__item-desc',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);