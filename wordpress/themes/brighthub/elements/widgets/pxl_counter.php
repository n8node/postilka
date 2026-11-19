<?php
//Register Counter Widget
 pxl_add_custom_widget(
    array(
        'name' => 'pxl_counter',
        'title' => esc_html__('Case Counter', 'brighthub'),
        'icon' => 'eicon-counter-circle case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'elementor-waypoints',
            'jquery-numerator',
            'odometer',
            'numerator',
            'brighthub-counter',
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_counter/layout-1.webp'
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
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'default' => 'Default',
                                'liquid-glass' => 'Liquid Glass',
                                'gradient-2-color' => 'Gradient 2 Color',
                                'gradient-3-color' => 'Gradient 3 Color',
                                'gradient' => 'Gradient 5 Color',
                            ],
                            'default' => 'default',
                        ),

                        array(
                            'name' => 'gradient_color_1',
                            'label' => esc_html__('Text Gradient Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#E5496A',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter' => '--gradient-color-1: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['gradient-2-color', 'gradient-3-color', 'gradient'],
                            ],
                        ),
                       
                        array(
                            'name' => 'gradient_color_2',
                            'label' => esc_html__('Text Gradient Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#C44A92',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter' => '--gradient-color-2: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['gradient-2-color', 'gradient-3-color', 'gradient'],
                            ],
                        ),
                        
                        array(
                            'name' => 'gradient_color_3',
                            'label' => esc_html__('Text Gradient Color 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#9049CD',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter' => '--gradient-color-3: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['gradient-3-color', 'gradient'],
                            ],
                        ),
                        
                        array(
                            'name' => 'gradient_color_4',
                            'label' => esc_html__('Text Gradient Color 4', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#6B49F6',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter' => '--gradient-color-4: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['gradient'],
                            ],
                        ),

                        array(
                            'name' => 'gradient_color_5',
                            'label' => esc_html__('Text Gradient Color 5', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#6248FF',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter' => '--gradient-color-5: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['gradient'],
                            ],
                        ),

                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'separator' => 'before',
                            'label_block' => true,
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
                            'name' => 'title_position',
                            'label' => esc_html__('Title Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'top' => 'Top',
                                'bottom' => 'Bottom',
                            ],
                            'default' => 'bottom',
                        ),

                        array(
                            'name' => 'starting_number',
                            'label' => esc_html__('Starting Number', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 1,
                        ),
                        array(
                            'name' => 'ending_number',
                            'label' => esc_html__('Ending Number', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 100,
                        ),
                        array(
                            'name' => 'delay',
                            'label' => esc_html__('Delay', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'description' => esc_html__('Delay in milliseconds, friendly with animate delay', 'brighthub'),
                            'default' => 0,
                        ),
                        array(
                            'name' => 'prefix',
                            'label' => esc_html__('Number Prefix', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '',
                        ),
                        array(
                            'name' => 'suffix',
                            'label' => esc_html__('Number Suffix', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '',
                        ),
                        array(
                            'name' => 'thousand_separator_char',
                            'label' => esc_html__('Number Separator', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => 'Default',
                                '.' => 'Dot',
                                ',' => 'Comma',
                                ' ' => 'Space',
                            ],
                            'default' => '',
                        ),
                        array(
                            'name' => 'icon_type',
                            'label' => esc_html__('Icon Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'icon' => 'Icon',
                                'image' => 'Image',
                            ],
                            'default' => 'icon',
                        ),
                        array(
                            'name' => 'pxl_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_image',
                            'label' => esc_html__( 'Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'description' => esc_html__('Select image icon.', 'brighthub'),
                            'condition' => [
                                'icon_type' => 'image',
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
                                '{{WRAPPER}} .pxl-counter' => 'text-align: {{VALUE}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_general',
                    'label' => esc_html__('General', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'effect',
                            'label' => esc_html__('Effect', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'effect-default' => 'Default',
                                'effect-odometer' => 'Odometer',
                            ],
                            'default' => 'effect-default',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name'         => 'heading_cliptext',
                            'label' => esc_html__( 'Clip Text', 'brighthub' ),
                            'type'         => \Elementor\Controls_Manager::SWITCHER,
                            'default' => '',
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__title' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['heading_cliptext' => ''],
                        ),
                        array(
                            'name' => 'title_gradient',
                            'label' => esc_html__( 'Title Color Gradient', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__number' => 'background: linear-gradient(135deg, #FFF 0%, {{VALUE}} 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
                            ],
                            'condition' => ['heading_cliptext' => 'true'],
                        ),
                        array(
                            'name' => 'title_typography',
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-counter .pxl-counter__title',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_icon',
                    'label' => esc_html__('Icon', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__icon i' => 'color: {{VALUE}};text-fill-color: {{VALUE}};-webkit-text-fill-color: {{VALUE}};background-image: none;',
                            ],
                        ),
                        array(
                            'name' => 'icon_font_size',
                            'label' => esc_html__('Icon Font Size', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-counter .pxl-counter__icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_space_top',
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
                                '{{WRAPPER}} .pxl-counter .pxl-counter__icon' => 'padding-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_space_bottom',
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
                                '{{WRAPPER}} .pxl-counter .pxl-counter__icon' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                            ],
                            'separator' => 'after',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_number',
                    'label' => esc_html__('Number', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'number_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__number' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'prefix_suffix_color',
                            'label' => esc_html__('Prefix Suffix Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__number span:not(.pxl-counter__value)' => 'color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'prefix_suffix_typography',
                            'label' => esc_html__('Prefix Suffix Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-counter .pxl-counter__number span:not(.pxl-counter__value)',
                        ),
                        
                        array(
                            'name' => 'number_typography',
                            'label' => esc_html__('Number Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-counter .pxl-counter__number',
                        ),
                        array(
                            'name' => 'duration',
                            'label' => esc_html__('Animation Duration', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 2000,
                            'min' => 100,
                            'step' => 100,
                        ),
                        array(
                            'name' => 'number_margin',
                            'label' => esc_html__('Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter .pxl-counter__number' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'suffix_margin',
                            'label' => esc_html__('Suffix Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter__suffix' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'prefix_margin',
                            'label' => esc_html__('Prefix Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-counter__prefix' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
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