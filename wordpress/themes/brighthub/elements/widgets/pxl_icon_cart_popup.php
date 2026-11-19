<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_icon_cart_popup',
        'title' => esc_html__('Case Icon Cart Popup', 'brighthub' ),
        'icon' => 'eicon-cart-medium case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'source_section',
                    'label' => esc_html__('Source Settings', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'icon_image_type',
                            'label' => esc_html__('Icon Image Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'img' => 'Image',
                                'ic' => 'Icon',
                            ],
                            'default' => 'img',
                        ),
                        array(
                            'name' => 'pxl_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                            'default' => [
                                'value'   => 'ph ph-shopping-cart-simple',
                                'library' => 'phosphor',
                            ],
                            'condition' => [
                                'icon_image_type' => ['ic'],
                            ],
                        ),
                        array(
                            'name' => 'image',
                            'label' => esc_html__( 'Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'icon_image_type' => ['img'],
                            ],
                        ),
                        array(
                            'name' => 'show_title',
                            'label' => esc_html__('Show Cart Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub' ),
                            'label_off' => esc_html__('No', 'brighthub' ),
                            'default' => 'yes',
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => esc_html__('Cart', 'brighthub' ),
                            'condition' => [
                                'show_title' => 'yes',
                            ],
                        ),
                        array(
                            'name' => 'show_cart_number',
                            'label' => esc_html__('Show Cart Number', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub' ),
                            'label_off' => esc_html__('No', 'brighthub' ),
                            'default' => 'yes',
                            'separator' => 'before',
                        ),
                    ),
                ),
                array(
                    'name' => 'style_section',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'icon_size',
                            'label' => esc_html__('Icon Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Icon Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__icon i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-icon-cart-popup__icon img' => 'filter: brightness(0) saturate(100%) invert(var(--el-color-{{VALUE}})) brightness(100%) contrast(100%);',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_hover',
                            'label' => esc_html__('Icon Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__icon:hover i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-icon-cart-popup__icon:hover img' => 'filter: brightness(0) saturate(100%) invert(var(--el-color-{{VALUE}})) brightness(100%) contrast(100%);',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon-cart-popup__title',
                        ),
                        array(
                            'name' => 'number_color',
                            'label' => esc_html__('Number Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__number' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'number_typography',
                            'label' => esc_html__('Number Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon-cart-popup__number',
                        ),
                        array(
                            'name' => 'number_separator_color',
                            'label' => esc_html__('Number Separator Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-cart-popup__number-separator' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'number_separator_typography',
                            'label' => esc_html__('Number Separator Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon-cart-popup__number-separator',
                        ),
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);

