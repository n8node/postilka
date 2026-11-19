<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_icon_single',
        'title' => esc_html__('Case Icon Single', 'brighthub'),
        'icon' => 'eicon-settings case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'icon_type',
                            'label' => esc_html__('Icon Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'icon' => 'Icon',
                                'image' => 'Image',
                            ],
                            'default' => 'icon',
                        ),
                        array(
                            'name' => 'pxl_icon',
                            'label' => esc_html__('Icon', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'icon_image',
                            'label' => esc_html__('Image', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'icon_type' => 'image',
                            ],
                        ),
                        array(
                            'name' => 'icon_link',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'icon_align',
                            'label' => esc_html__('Alignment', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left' => [
                                    'title' => esc_html__('Left', 'brighthub'),
                                    'icon' => 'eicon-text-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'brighthub'),
                                    'icon' => 'eicon-text-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'brighthub'),
                                    'icon' => 'eicon-text-align-right',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'text-align: {{VALUE}};',
                            ],
                            'default' => 'left'
                        ),
                    ),
                ),
                
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-default' => 'Style Default',
                                'style-light-box' => 'Style Light Box',
                            ],
                            'default' => 'style-default',
                        ),

                        array(
                            'name' => 'style_light_box_position',
                            'label' => esc_html__(' Light Box Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'top' => 'Top',
                                'bottom' => 'Bottom',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                            'default' => 'top',
                        ),

                        array(
                            'name' => 'light_box_color',
                            'label' => esc_html__('Light Box Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__style-light-box' => '--pxl-icon-light-box-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),

                        array(
                            'name' => 'light_box_color_opacity',
                            'label' => esc_html__('Light Box Color Opacity', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['%'],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__style-light-box' => '--pxl-icon-light-box-color-opacity: {{SIZE}}%;',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),

                        array(
                            'name' => 'light_box_bgr_1',
                            'label' => esc_html__('Light Box Background Gradient 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__style-light-box' => '--pxl-icon-light-box-bgr-1: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'light_box_bgr_2',
                            'label' => esc_html__('Light Box Background Gradient 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__style-light-box' => '--pxl-icon-light-box-bgr-2: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'light_box_bgr_3',
                            'label' => esc_html__('Light Box Background Gradient 3', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__style-light-box' => '--pxl-icon-light-box-bgr-3: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),

                        array(
                            'name' => 'color',
                            'label' => esc_html__('Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-icon svg' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_path',
                            'label' => esc_html__('Color SVG Fill Path', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon svg path' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_hover',
                            'label' => esc_html__('Icon Color Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon:hover i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-icon:hover svg' => 'fill: {{VALUE}};',
                                '{{WRAPPER}} .pxl-icon:hover svg path' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'box_color',
                            'label' => esc_html__('Box Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'box_color_hover',
                            'label' => esc_html__('Box Color Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon:hover' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'box_width',
                            'label' => esc_html__('Box Width', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'box_height',
                            'label' => esc_html__('Box Height', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'icon_box_shadow',
                            'label' => esc_html__('Box Shadow', 'brighthub'),
                            'type' => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon',
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'icon_font_size',
                            'label' => esc_html__('Font Size', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-icon svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}',
                            ],
                        ),
                        array(
                            'name' => 'border_type',
                            'label' => esc_html__('Border Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => esc_html__('None', 'brighthub'),
                                'solid' => esc_html__('Solid', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'border-style: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__('Border Width', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'border_type!' => '',
                                'style' => 'style-light-box',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color',
                            'label' => esc_html__('Border Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type!' => '',
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'border_color_hover',
                            'label' => esc_html__('Border Color Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon:hover' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type!' => '',
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'icon_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'icon_padding',
                            'label' => esc_html__('Padding', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => 'style-light-box',
                            ],
                        ),
                        array(
                            'name' => 'icon_margin',
                            'label' => esc_html__('Margin', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'control_type' => 'responsive',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);

