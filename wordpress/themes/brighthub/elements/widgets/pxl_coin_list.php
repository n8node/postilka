<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_coin_list',
        'title' => esc_html__('Case Coin List', 'brighthub'),
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
                                    'name' => 'active',
                                    'label' => esc_html__('Active', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'default' => 'no',
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
                                    'name' => 'pxl_image',
                                    'label' => esc_html__( 'Icon Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'condition' => [
                                        'icon_type' => 'image',
                                    ],
                                ),
                                array(
                                    'name' => 'coin_name',
                                    'label' => esc_html__('Coin Name', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'coin_price',
                                    'label' => esc_html__('Coin Price', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'coin_price_change',
                                    'label' => esc_html__('Coin Price Change', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'option',
                                    'label' => esc_html__('Option', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'increase' => esc_html__('Increase', 'brighthub' ),
                                        'decrease' => esc_html__('Decrease', 'brighthub' ),
                                    ],
                                    'default' => 'increase',
                                ),
                            ),
                            'title_field' => '{{{ coin_name }}}',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_icon',
                    'label' => esc_html__('Style Icon', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'icon_color',
                                'label' => esc_html__('Icon Background Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-coins__item-icon' => 'background-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_size',
                                'label' => esc_html__('Icon Size', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'separator' => 'before',
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-coins__item-icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                                    '{{WRAPPER}} .pxl-coins__item-icon svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_name',
                    'label' => esc_html__('Style Name', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'name_color',
                                'label' => esc_html__('Name Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-coins__item-name' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'name_typography',
                                'label' => esc_html__('Name Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-coins__item-name',
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_price',
                    'label' => esc_html__('Style Price', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'price_color',
                                'label' => esc_html__('Price Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-coins__item-price' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'price_typography',
                                'label' => esc_html__('Price Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-coins__item-price',
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_price_change',
                    'label' => esc_html__('Style Price Change', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'price_change_color',
                                'label' => esc_html__('Price Change Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'separator' => 'before',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-coins__item-price-change' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'price_change_typography',
                                'label' => esc_html__('Price Change Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-coins__item-price-change',
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