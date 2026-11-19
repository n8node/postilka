<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_testimonial_marquee',
        'title' => esc_html__('Case Testimonial Marquee', 'brighthub'),
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
                            'label' => esc_html__('Layout', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Layout 1',
                                '2' => 'Layout 2',
                                '3' => 'Layout 3',
                            ],
                            'default' => '1',
                        ),
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Style 1',
                                '2' => 'Style 2',
                                '3' => 'Style 3',
                            ],
                            'default' => '1',
                            'condition' => [
                                'layout' => '1'
                            ]
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
                            'name' => 'pxl_background_reveal_dot_pos',
                            'label' => esc_html__('Background Reveal Dot Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none'    => esc_html__('None', 'brighthub'),
                                'top-left'    => esc_html__('Top Left', 'brighthub'),
                                'top-right'   => esc_html__('Top Right', 'brighthub'),
                                'bottom-left' => esc_html__('Bottom Left', 'brighthub'),
                                'bottom-right'  => esc_html__('Bottom Right', 'brighthub'),
                                'center-top' => esc_html__('Center Top', 'brighthub'),
                                'center-bottom' => esc_html__('Center Bottom', 'brighthub'),
                                'center-left' => esc_html__('Center Left', 'brighthub'),
                                'center-right' => esc_html__('Center Right', 'brighthub'),
                                'center-center' => esc_html__('Center Center', 'brighthub'),
                                'top' => esc_html__('Top', 'brighthub'),
                                'bottom' => esc_html__('Bottom', 'brighthub'),
                                'auto' => esc_html__('Auto run', 'brighthub'),
                            ],
                            'default' => 'none',
                            'condition' => [
                                'layout' => '1',
                                'style' => '3'
                            ]
                        ),
                        array(
                            'name' => 'items',
                            'label' => esc_html__('Items', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'avatar',
                                    'label' => esc_html__('Avatar', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name' => 'name',
                                    'label' => esc_html__('Name', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'position',
                                    'label' => esc_html__('Position', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'content',
                                    'label' => esc_html__('Content', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'star',
                                    'label' => esc_html__('Star', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'description' => esc_html__('If this empty, the star will not be shown and not show in layout 3', 'brighthub'),
                                ),
                                array(
                                    'name' => 'highlight_item',
                                    'label' => esc_html__('Highlight Item', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'label_on' => esc_html__('Yes', 'brighthub' ),
                                    'label_off' => esc_html__('No', 'brighthub' ),
                                    'default' => 'no',
                                    'description' => esc_html__('If this is true, the item will be highlighted in layout 3', 'brighthub'),
                                ),
                            ),
                            'title_field' => '{{{ name }}}',
                            'condition' => [
                                'layout' => ['1', '3']
                            ]
                        ),
                        array(
                            'name' => 'items_l2',
                            'label' => esc_html__('Items', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'avatar_l2',
                                    'label' => esc_html__('Avatar', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name' => 'name_l2',
                                    'label' => esc_html__('Name', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'position_l2',
                                    'label' => esc_html__('Position', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'content_l2',
                                    'label' => esc_html__('Content', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'star_l2',
                                    'label' => esc_html__('Star', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'description' => esc_html__('If this empty, the star will not be shown', 'brighthub'),
                                ),

                                array(
                                    'name' => 'show_grid',
                                    'label' => esc_html__('Show Grid', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'label_on' => esc_html__('Yes', 'brighthub' ),
                                    'label_off' => esc_html__('No', 'brighthub' ),
                                    'default' => 'no',
                                ),

                                array(
                                    'name' => 'grid_color',
                                    'label' => esc_html__('Grid Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}} .pxl-marquee__item-grid' => '--grid-color: {{VALUE}};',
                                    ],
                                    'default' => '#ccc',
                                    'condition' => [
                                        'show_grid' => 'true'
                                    ]
                                ),

                                array(
                                    'name' => 'background_color_type',
                                    'label' => esc_html__('Background Color Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'none' => esc_html__('None', 'brighthub' ),
                                        'color' => esc_html__('Color', 'brighthub' ),
                                        'gradient' => esc_html__('Gradient', 'brighthub' ),
                                    ],
                                ),
                                array(
                                    'name' => 'background_color_l2',
                                    'label' => esc_html__('Background Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}}.pxl-marquee__item' => 'background-color: {{VALUE}};',
                                    ],
                                    'condition' => [
                                        'background_color_type' => 'color'
                                    ]
                                ),
                                array(
                                    'name'         => 'background_gradient_l2',
                                    'label' => esc_html__( 'Background Gradient', 'brighthub' ),
                                    'type'         => \Elementor\Group_Control_Background::get_type(),
                                    'control_type' => 'group',
                                    'types' => [ 'gradient' ],
                                    'selector'     =>  '{{WRAPPER}} {{CURRENT_ITEM}}.pxl-marquee__item',
                                    'condition' => [
                                        'background_color_type' => 'gradient'
                                    ]
                                ),
                            ),
                            'title_field' => '{{{ name_l2 }}}',
                            'condition' => [
                                'layout' => '2'
                            ]
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
                            'name' => 'mobile_item_max_width',
                            'label' => esc_html__('Item Min Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => ['px', '%'],
                            'default' => [
                                'unit' => '%',
                                'size' => 0,
                            ],
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
                                '{{WRAPPER}} .pxl-marquee__item' => 'min-width: {{SIZE}}{{UNIT}};',
                            ],
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
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);