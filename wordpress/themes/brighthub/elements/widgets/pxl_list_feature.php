<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_list_feature',
        'title' => esc_html__('Case List Feature', 'brighthub'),
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
                                    'name' => 'title',
                                    'label' => esc_html__('Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'description',
                                    'label' => esc_html__('Description', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                    'show_label' => false,
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
                                    'name' => 'content_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                    'condition' => [
                                        'icon_type' => 'icon',
                                    ],
                                ),
                                array(
                                    'name' => 'content_icon_image',
                                    'label' => esc_html__( 'Icon Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'condition' => [
                                        'icon_type' => 'image',
                                    ],
                                ),
                                array(
                                    'name' => 'icon_bg_color',
                                    'label' => esc_html__( 'Icon Background Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => array(
                                        '{{WRAPPER}} .pxl-list {{CURRENT_ITEM}} .pxl-list-feature__item-icon' => 'background-color: {{VALUE}}',
                                    ),
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
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
                                '{{WRAPPER}} .pxl-list-feature' => 'max-width: {{SIZE}}{{UNIT}};',
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
                                'name' => 'title_color',
                                'label' => esc_html__('Title Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list .pxl-list__item-title' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'title_typography',
                                'label' => esc_html__('Title Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-list .pxl-list__item-title',
                            ),

                            array(
                                'name' => 'desc_color',
                                'label' => esc_html__('Description Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-list .pxl-list__item-desc' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'desc_typography',
                                'label' => esc_html__('Description Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-list .pxl-list__item-description',
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