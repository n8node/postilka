<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_list',
        'title' => esc_html__('Case List', 'brighthub'),
        'icon' => 'eicon-editor-list-ul case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'lists',
                            'label' => esc_html__('Content', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'content',
                                    'label' => esc_html__('Content', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'content_icon_type',
                                    'label' => esc_html__('Icon Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'icon' => 'Icon',
                                        'image' => 'Image',
                                    ],
                                    'default' => 'icon',
                                ),
                                array(
                                    'name' => 'content_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                    'condition' => [
                                        'content_icon_type' => 'icon',
                                    ],
                                ),
                                array(
                                    'name' => 'content_icon_image',
                                    'label' => esc_html__( 'Icon Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'condition' => [
                                        'content_icon_type' => 'image',
                                    ],
                                ),
                                array(
                                    'name' => 'icon_bg_color',
                                    'label' => esc_html__( 'Icon Background Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => array(
                                        '{{WRAPPER}} .pxl-list {{CURRENT_ITEM}} .pxl-list__item-icon' => 'background-color: {{VALUE}}',
                                    ),
                                ),
                            ),
                            'title_field' => '{{{ content }}}',
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
                            'condition' => [
                                'icon_type' => 'image',
                            ],
                        ),
                        array(
                            'name' => 't_width',
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
                                '{{WRAPPER}} .pxl-list' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'type',
                                'label' => esc_html__('Type', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'vertical' => 'Vertical',
                                    'horizontal' => 'Horizontal',
                                ],
                                'default' => 'vertical',
                            ),
                            array(
                                'name' => 'column_number',
                                'label' => esc_html__( 'Column', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::NUMBER,
                                'control_type' => 'responsive',
                                'min' => 1,
                                'max' => 6,
                                'step' => 1,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                                ],
                                'condition' => ['type' => 'vertical']
                            ),
                            array(
                                'name' => 'style',
                                'label' => esc_html__('Style', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'default' => 'Default',
                                    'dot' => 'Dot Before',
                                    'icon--box' => 'Icon Box',
                                    'border' => 'Border',
                                ],
                                'default' => 'default',
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
                                    '{{WRAPPER}} .pxl-list' => 'text-align: {{VALUE}}; justify-content: {{VALUE}};',
                                ],
                                'default' => 'left'
                            ),
                            array(
                                'name' => 'icon_margin',
                                'label' => esc_html__('Icon Margin', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'separator' => 'before',
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list .pxl-list__item-icon i, {{WRAPPER}} .pxl-list .pxl-list__item-icon svg, {{WRAPPER}} .pxl-list .pxl-list__item-icon img' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
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
                                        'max' => 3000,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list__item-icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                                    '{{WRAPPER}} .pxl-list__item-icon img' => 'width: {{SIZE}}{{UNIT}}; height: auto;',
                                    '{{WRAPPER}} .pxl-list__item-icon svg' => 'width:
                                     {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'content_color',
                                'label' => esc_html__('Content Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list .pxl-list__item-content, {{WRAPPER}} .pxl-list .pxl-list__item-text' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'content_typography',
                                'label' => esc_html__('Content Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-list .pxl-list__item-content, {{WRAPPER}} .pxl-list .pxl-list__item-text',
                            ),
                            array(
                                'name' => 'item_spacer',
                                'label' => esc_html__('Item Spacer', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'separator' => 'before',
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 3000,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list' => 'gap: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_spacer',
                                'label' => esc_html__('Icon Spacer', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'separator' => 'before',
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 3000,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list__item' => 'gap: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            
                        )
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);