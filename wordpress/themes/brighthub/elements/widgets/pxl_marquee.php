<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_marquee',
        'title' => esc_html__('Case Marquee', 'brighthub'),
        'icon' => 'eicon-person case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Style Default',
                                '2' => 'Style Hidden Item',
                                '3' => 'Item in Box',
                            ],
                            'default' => '1',
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
                            'name' => 'item',
                            'label' => esc_html__('Item', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'icon_type',
                                    'label' => esc_html__('Icon Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'image' => 'Image',
                                        'icon' => 'Icon',
                                    ],
                                    'default' => 'image',
                                ),
                                array(
                                    'name' => 'icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'condition' => [
                                        'icon_type' => 'icon',
                                    ],
                                ),
                                array(
                                    'name' => 'image',
                                    'label' => esc_html__('Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'condition' => [
                                        'icon_type' => 'image',
                                    ],
                                ),
                                array(
                                    'name' => 'text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'link',
                                    'label' => esc_html__('Link', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ text }}}'
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
                            'name' => 'item_to_show',
                            'label' => esc_html__('Item To Show', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '3',
                            'condition' => [
                                'layout' => '2'
                            ]
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
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'image_radius',
                            'label' => esc_html__('Image Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'image_height',
                            'label' => esc_html__('Image Height', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-marquee .pxl-marquee__item-image img' => 'height: {{SIZE}}{{UNIT}}; width: fit-content;',
                            ],
                        ),

                        array(
                            'name'         => 'image_box_shadow',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-marquee img',
                        ),

                        array(
                            'name' => 'padding',
                            'label' => esc_html__('Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name'    => 'image_grayscale',
                            'label'   => esc_html__('Image Grayscale', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'default' => '',
                            'options' => [
                                '' => esc_html__('No', 'brighthub'),
                                'filter: grayscale(1000%);' => esc_html__('Yes', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee img' => '{{VALUE}}',
                            ],
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);