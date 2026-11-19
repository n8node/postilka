<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_heading',
        'title' => esc_html__('Case Heading', 'brighthub' ),
        'icon' => 'eicon-heading case-widget',
        'categories' => array('pxltheme-core'),
        'scripts'    => array(
            'gsap',
            'pxl-scroll-trigger',
            'pxl-splitText',
            'text-animation',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'source_type',
                            'label' => esc_html__('Source Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'text' => 'Text',
                                'title' => 'Page Title',
                            ],
                            'default' => 'text',
                        ),

                        array(
                            'name' => 'animation_type',
                            'label' => esc_html__('Animation Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'df',
                            'options' => [
                                'df' => esc_html__('Default', 'brighthub'),
                                'type' => esc_html__('Type', 'brighthub'),
                            ],
                        ),
                        
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'label_block' => true,
                            'condition' => [
                                'source_type' => ['text'],
                            ],
                            'description' => 'Create Typewriter text width shortcode: [typewriter text="Text1, Text2"], Highlight text with shortcode: [highlight text="Text"] and Highlight image with shortcode: [highlight_image id_image="123"]',
                        ),
                       
                        array(
                            'name' => 'sub_title',
                            'label' => esc_html__('Sub Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'sub_title_icon',
                            'label' => esc_html__('Sub Title Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
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
                                'center' => [
                                    'title' => esc_html__( 'Center', 'brighthub' ),
                                    'icon' => 'eicon-text-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-text-align-right',
                                ],
                                'justify' => [
                                    'title' => esc_html__( 'Justified', 'brighthub' ),
                                    'icon' => 'eicon-text-align-justify',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading' => 'text-align: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'h_width',
                            'label' => esc_html__('Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__inner' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'h_title_style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-default' => 'Default',
                                'style-gradient' => 'Gradient Text',
                                'style-scroll-bg' => 'Scroll Text',
                                'style-scroll-line' => 'Scroll Line',
                                'style-scroll-gradient' => 'Scroll Gradient',
                            ],
                            'default' => 'style-default',
                        ),
                    
                        array(
                            'name' => 'has_quote',
                            'label' => esc_html__('Has Quote?', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'no',
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'scroll_gradient_title_color',
                            'label' => esc_html__('Scroll Gradient Title Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#fff',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .split-line' => '--scroll-gradient-title-color-1: {{VALUE}};',
                            ],
                            'condition' => ['h_title_style' => 'style-scroll-gradient'],
                        ),
                        array(
                            'name' => 'scroll_gradient_title_color_2',
                            'label' => esc_html__('Scroll Gradient Title Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .split-line' => '--scroll-gradient-title-color-2: {{VALUE}};',
                            ],
                            'default' => '#fff',
                            'condition' => ['h_title_style' => 'style-scroll-gradient'],
                        ),
                        array(
                            'name' => 'scroll_gradient_title_color_3',
                            'label' => esc_html__('Scroll Gradient Title Color 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .split-line' => '--scroll-gradient-title-color-3: {{VALUE}};',
                            ],
                            'default' => '#89ffe7',
                            'condition' => ['h_title_style' => 'style-scroll-gradient'],
                        ),
                        array(
                            'name' => 'scroll_gradient_title_color_4',
                            'label' => esc_html__('Scroll Gradient Title Color 4', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .split-line' => '--scroll-gradient-title-color-4: {{VALUE}};',
                            ],
                            'default' => '#535862',
                            'condition' => ['h_title_style' => 'style-scroll-gradient'],
                        ),
                        array(
                            'name' => 'scroll_gradient_title_color_5',
                            'label' => esc_html__('Scroll Gradient Title Color 5', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .split-line' => '--scroll-gradient-title-color-5: {{VALUE}};',
                            ],
                            'default' => '#535862',
                            'condition' => ['h_title_style' => 'style-scroll-gradient'],
                        ),
                        array(
                            'name' => 'svg_width',
                            'label' => esc_html__('SVG Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'separator' => 'before',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__text svg' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'svg_height',
                            'label' => esc_html__('SVG Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__text svg' => 'Height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'svg_space',
                            'label' => esc_html__('SVG Space', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__text svg' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_tag',
                            'label' => esc_html__('HTML Tag', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
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
                            'default' => 'h3',
                        ),
                        array(
                            'name'         => 'title_gradient',
                            'label' => esc_html__( 'Title Color Gradient', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => [ 'gradient' ],
                            'selector'     => '{{WRAPPER}} .pxl-heading .pxl-heading__style-gradient',
                            'condition' => ['h_title_style' => 'style-gradient']
                        ),
                        array(
                            'name'         => 'heading_cliptext',
                            'label' => esc_html__( 'Clip Text', 'brighthub' ),
                            'type'         => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__title' => 'color: {{VALUE}};-webkit-text-stroke-color:{{VALUE}};',
                            ],
                            'condition' => ['h_title_style!' => 'style-gradient']
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-heading .pxl-heading__title',
                        ),
                        array(
                            'name'         => 'title_box_shadow',
                            'label' => esc_html__( 'Title Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Text_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-heading .pxl-heading__title'
                        ),
                        array(
                            'name' => 'title_space_bottom',
                            'label' => esc_html__('Bottom Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'default' => [
                                'size' => 0,
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading__title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                            ],
                            'separator' => 'after',
                        ),
                        array(
                            'name' => 'pxl_animate',
                            'label' => esc_html__('Case Animate', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => brighthub_widget_animate_v2(),
                            'default' => '',
                        ),
                        array(
                            'name' => 'pxl_animate_delay',
                            'label' => esc_html__('Animate Delay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '0',
                            'description' => 'Enter number. Default 0ms',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title_sub',
                    'label' => esc_html__('Sub Title', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'sub_align',
                                'label' => esc_html__( 'Alignment', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::CHOOSE,
                                'control_type' => 'responsive',
                                'options' => [
                                    'left' => [
                                        'title' => esc_html__( 'Left', 'brighthub' ),
                                        'icon' => 'eicon-text-align-left',
                                    ],
                                    'center' => [
                                        'title' => esc_html__( 'Center', 'brighthub' ),
                                        'icon' => 'eicon-text-align-center',
                                    ],
                                    'right' => [
                                        'title' => esc_html__( 'Right', 'brighthub' ),
                                        'icon' => 'eicon-text-align-right',
                                    ],
                                    'justify' => [
                                        'title' => esc_html__( 'Justified', 'brighthub' ),
                                        'icon' => 'eicon-text-align-justify',
                                    ],
                                ],
                                'default' => 'left'
                            ),
                            array(
                                'name' => 'sub_title_style',
                                'label' => esc_html__('Style', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'sub-default' => 'Default',
                                    'sub-box' => 'Sub Box',
                                    'sub-border' => 'Sub Border',
                                    'sub-slogan' => 'Slogan',
                                    'sub-light' => 'Light',
                                    'dot' => 'Dot',
                                ],
                            ),

                            array(
                                'name' => 'sub_light_line',
                                'label' => esc_html__('Style Light Number Line', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'none' => esc_html__('None', 'brighthub' ),
                                    'left' => esc_html__('Left Only', 'brighthub' ),
                                    'right' => esc_html__('Right Only', 'brighthub' ),
                                    'both' => esc_html__('Both', 'brighthub' ),
                                ],
                                'default' => 'none',
                                'condition' => [
                                    'sub_title_style' => 'sub-light',
                                ],
                            ),

                            array(
                                'name' => 'graphic_position',
                                'label' => esc_html__('Graphic Position', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'top' => esc_html__('Top', 'brighthub' ),
                                    'bottom' => esc_html__('Bottom', 'brighthub' ),
                                ],
                                'default' => 'top',
                                'condition' => [
                                    'sub_title_style' => 'sub-light',
                                ],
                            ),   
                            
                            array(
                                'name' => 'sub_dot_show',
                                'label' => esc_html__('Show Dot', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'none' => esc_html__('None', 'brighthub' ),
                                    'left' => esc_html__('Left', 'brighthub' ),
                                    'right' => esc_html__('Right', 'brighthub' ),
                                ],
                                'default' => 'none',
                                'condition' => [
                                    'sub_title_style' => ['sub-light', 'dot'],
                                ],
                            ),
                            array(
                                'name' => 'sub_dot_color',
                                'label' => esc_html__('Dot Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub.pxl-heading__dot .sub-dot' => 'background-color: {{VALUE}}',
                                ],
                                'condition' => [
                                    'sub_dot_show' => ['left', 'right'],  
                                ],
                            ),

                            array(
                                'name' => 'sub_bg_color',
                                'label' => esc_html__('Background Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'background-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'slogan_text',
                                'label' => esc_html__('Slogan Text', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::TEXT,
                                'separator' => 'after',
                                'condition' => ['sub_title_style' => 'sub-slogan']
                            ),
                            array(
                                'name' => 'sub_title_color',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_border_radius',
                                'label' => esc_html__('Border Radius', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => ['sub-border', 'sub-box'],
                                ],
                            ),
                            array(
                                'name'         => 'sub_box_shadow',
                                'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-heading .pxl-heading__sub',
                                'condition' => [
                                    'sub_title_style' => ['sub-border', 'sub-box'],
                                ],
                                'separator' => 'before'
                            ),
                            array(
                                'name' => 'border_type',
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
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'border-style: {{VALUE}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => ['sub-border','sub-box'],
                                ],
                            ),
                            array(
                                'name' => 'border_width',
                                'label' => esc_html__( 'Border Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => ['sub-border','sub-box'],
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'sube_border_color',
                                'label' => esc_html__('Border Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'border-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => ['sub-border','sub-box'],
                                ],
                                'separator' => 'after'
                            ),
                            array(
                                'name' => 'sub_title_typography',
                                'label' => esc_html__('Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-heading__sub, {{WRAPPER}} .pxl-heading .pxl-heading__sub span',
                            ),
                            array(
                                'name' => 'sub_title_space_top',
                                'label' => esc_html__('Top Spacer', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub' => 'margin-top: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_space_bottom',
                                'label' => esc_html__('Bottom Spacer', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-heading__sub' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'svg_space_sub_title',
                                'label' => esc_html__('SVG Space', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub svg' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'svg_width_sub_title',
                                'label' => esc_html__('SVG Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub svg' => 'width: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'svg_height_sub_title',
                                'label' => esc_html__('SVG Height', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__sub svg' => 'width: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_padding',
                                'label' => esc_html__( 'Padding', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__sub' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'pxl_animate_sub',
                                'label' => esc_html__('Case Animate', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => brighthub_widget_animate(),
                                'default' => '',
                            ),
                            array(
                                'name' => 'pxl_animate_delay_sub',
                                'label' => esc_html__('Animate Delay', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::TEXT,
                                'default' => '0',
                                'description' => 'Enter number. Default 0ms',
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_highlight',
                    'label' => esc_html__('Highlight Text', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'highlight_style',
                                'label' => esc_html__('Style', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'highlight-default' => 'Default',
                                    'highlight-box' => 'Box',
                                    'highlight-box-text-gradient' => 'Box Color & Text Gradient',
                                    'highlight-gradient-nd' => 'Text Gradient 3 Colors',
                                    'highlight-gradient-4th' => 'Text Gradient 4 Colors',
                                    'highlight-gradient' => 'Text Gradient 5 Colors',
                                    'highlight-line-bottom' => 'Line Bottom',
                                    'highlight-allura' => 'Allura',
                                ],
                                'default' => 'highlight-default',
                            ),
                            
                            array(
                                'name' => 'line_bottom_width',
                                'label' => esc_html__('Line Bottom Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px', '%' ],
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
                                    '{{WRAPPER}} .pxl-heading__highlight svg' => 'width: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),

                            array(
                                'name' => 'line_bottom_height',
                                'label' => esc_html__('Line Bottom Height', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px', '%' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 50,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg' => 'height: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),

                            array(
                                'name' => 'line_bottom_color_type',
                                'label' => esc_html__('Line Bottom Color Type', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'none' => esc_html__('None', 'brighthub' ),
                                    'color' => esc_html__('Color', 'brighthub' ),
                                    'gradient' => esc_html__('Gradient', 'brighthub' ),
                                ],
                                'default' => 'color',
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),

                            array(
                                'name' => 'line_bottom_color',
                                'label' => esc_html__('Line Bottom Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'control_type' => 'responsive',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg path' => 'fill: {{VALUE}};',
                                ],
                                'condition' => [
                                    'line_bottom_color_type' => ['color'],
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),

                            array(
                                'name' => 'line_bottom_gradient_color_1',
                                'label' => esc_html__('Line Bottom Gradient Color 1', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'control_type' => 'responsive',
                                'default' => '#CF208B',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg stop:first-child' => 'stop-color: {{VALUE}} !important;',
                                    '{{WRAPPER}} .pxl-heading__highlight-text' => 'background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                    'line_bottom_color_type' => ['gradient'],
                                ],
                            ),

                            array(
                                'name' => 'line_bottom_gradient_color_2',
                                'label' => esc_html__('Line Bottom Gradient Color 2', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#791599',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg stop:last-child' => 'stop-color: {{VALUE}} !important;',
                                ],
                               'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                    'line_bottom_color_type' => ['gradient'],
                                ],
                            ),

                            array(
                                'name'         => 'line_bottom_gradient',
                                'label' => esc_html__( 'Line Bottom Gradient Text Color', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Background::get_type(),
                                'control_type' => 'group',
                                'types' => [ 'gradient' ],
                                'selector'     =>  '{{WRAPPER}} .pxl-heading__highlight-text',
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                    'line_bottom_color_type' => ['gradient'],
                                ],
                            ),

                            array(
                                'name' => 'highlight_gradient_color_1',
                                'label' => esc_html__('Text Gradient Color 1', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#8255E8',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '--gradient-color-1: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-gradient-nd', 'highlight-gradient-4th'],
                                ],
                            ),
                           
                            array(
                                'name' => 'highlight_gradient_color_2',
                                'label' => esc_html__('Text Gradient Color 2', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#8255E8',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '--gradient-color-2: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-gradient-nd', 'highlight-gradient-4th'],
                                ],
                            ),
                            
                            array(
                                'name' => 'highlight_gradient_color_3',
                                'label' => esc_html__('Text Gradient Color 3', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#44DAC3',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '--gradient-color-3: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-gradient-nd', 'highlight-gradient-4th'],
                                ],
                            ),
                            
                            array(
                                'name' => 'highlight_gradient_color_4',
                                'label' => esc_html__('Text Gradient Color 4', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#C44A92',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '--gradient-color-4: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-gradient-4th'],
                                ],
                            ),

                            array(      
                                'name' => 'highlight_gradient_color_5',
                                'label' => esc_html__('Text Gradient Color 5', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#E5496A',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '--gradient-color-5: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_allura_text_stroke_width',
                                'label' => esc_html__('Text Stroke Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'separator' => 'before',
                                'size_units' => [ 'px' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 5,
                                        'step' => 0.01,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '-webkit-text-stroke-width: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-allura'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_allura_text_stroke_color',
                                'label' => esc_html__('Text Stroke Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => '-webkit-text-stroke-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-allura'],
                                ],
                            ),

                            array(
                                'name' => 'highlight_line_bottom_width',
                                'label' => esc_html__('Line Bottom Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg' => 'width: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_line_bottom_height',
                                'label' => esc_html__('Line Bottom Height', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight svg' => 'height: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),

                            array(
                                'name' => 'highlight_line_bottom_padding',
                                'label' => esc_html__('Text Highlight Line Bottom Padding', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-line-bottom'],
                                ],
                            ),
                            
                            array(
                                'name' => 'highlight_color',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight, {{WRAPPER}} .pxl-heading__typewriter-text' => 'color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style!' => ['highlight-gradient', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_box_clr',
                                'label' => esc_html__('Box Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => 'background-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-box', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_box_shadow',
                                'label' => esc_html__('Box Shadow', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'separator' => 'before',
                                'selector' => '{{WRAPPER}} .pxl-heading__highlight',
                                'condition' => [
                                    'highlight_style' => ['highlight-box', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_box_padding',
                                'label' => esc_html__('Box Padding', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading__highlight' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-box', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_box_radius',
                                'label' => esc_html__('Box Border Radius', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__highlight' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-box', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_color_from',
                                'label' => esc_html__('Color From', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__highlight' => '--gradient-color-from: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_color_to',
                                'label' => esc_html__('Color To', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__highlight' => '--gradient-color-to: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-gradient', 'highlight-box-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_typography',
                                'label' => esc_html__('Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-heading__highlight',
                            ),
                            array(
                                'name' => 'highlight_margin',
                                'label' => esc_html__('Margin', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__highlight' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                        )
                    ),
                ),

                array(
                    'name' => 'section_style_highlight_img',
                    'label' => esc_html__('Highlight Image', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'h_img_width',
                                'label' => esc_html__('Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 3000,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-image--highlight' => 'width: {{SIZE}}{{UNIT}};',
                                ],
                                'separator' => 'after',
                            ),
                            array(
                                'name' => 'h_img_height',
                                'label' => esc_html__('Height', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 3000,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-image--highlight' => 'height: {{SIZE}}{{UNIT}};',
                                ],
                                'separator' => 'after',
                            ),
                        )
                    ),
                ),

                array(
                    'name' => 'section_style_typewriter',
                    'label' => esc_html__('Typewriter', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'typewriter_color',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-heading__words' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'typewriter_typography',
                                'label' => esc_html__('Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-heading__words',
                            ),
                        )
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);