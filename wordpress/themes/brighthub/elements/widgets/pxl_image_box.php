<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_image_box',
        'title' => esc_html__('Case Image Box', 'brighthub' ),
        'icon' => 'eicon-image case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'tilt',
            'pxl-tweenmax',
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_image_box/layout-1.webp'
                                ], 
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_image_box/layout-2.webp'
                                ], 
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_image_box/layout-3.webp'
                                ], 
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_image_box/layout-4.webp'
                                ], 
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'image',
                            'label' => esc_html__('Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
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
                            'name' => 'position',
                            'label' => esc_html__('Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'star_number',
                            'label' => esc_html__('Star Number', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'star_icon',
                            'label' => esc_html__('Star Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'tab_content_2',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active',
                            'label' => esc_html__('Active?', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'active_text',
                            'label' => esc_html__('Active Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => ['active' => 'true'],
                        ),
                        array(
                            'name' => 'image_2',
                            'label' => esc_html__('Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'button_1_text',
                            'label' => esc_html__('Button 1 Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'button_1_link',
                            'label' => esc_html__('Button 1 Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                        array(
                            'name' => 'button_2_text',
                            'label' => esc_html__('Button 2 Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'button_2_link',
                            'label' => esc_html__('Button 2 Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => ['layout' => '2']
                ),
                array(
                    'name' => 'tab_content_3',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'is_comming_soon',
                            'label' => esc_html__('Is Coming Soon?', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'image_3',
                            'label' => esc_html__('Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'feature_3',
                            'label' => esc_html__('Feature', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text',
                                    'label' => esc_html__('Feature Text', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'feature_color',
                                    'label' => esc_html__('Feature Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-image-box__feature {{CURRENT_ITEM}}' => 'color: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'feature_bg_type',
                                    'label' => esc_html__('Feature Background Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'color' => 'Color Normal',
                                        'gradient' => 'Color Gradient',
                                    ],
                                    'default' => 'color',
                                ),
                                array(
                                    'name' => 'feature_bg_color',
                                    'label' => esc_html__('Feature Background Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-image-box__feature {{CURRENT_ITEM}}' => 'background-color: {{VALUE}};',
                                    ],
                                    'condition' => ['feature_bg_type' => 'color'],
                                ),
                                array(
                                    'name'         => 'feature_gradient',
                                    'label' => esc_html__( 'Feature Color Gradient', 'brighthub' ),
                                    'type'         => \Elementor\Group_Control_Background::get_type(),
                                    'control_type' => 'group',
                                    'types' => [ 'gradient' ],
                                    'selector'     => '{{WRAPPER}} .pxl-image-box__feature {{CURRENT_ITEM}}',
                                    'condition' => ['feature_bg_type' => 'gradient']
                                ),
                            ),
                            'title_field' => '{{{feature_text}}}',
                        ),
                        array(
                            'name' => 'button_3',
                            'label' => esc_html__('Button', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'button_text',
                                    'label' => esc_html__('Button Text', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'button_link',
                                    'label' => esc_html__('Button Link', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::URL,
                                ),
                                array(
                                    'name' => 'button_style',
                                    'label' => esc_html__('Button Style', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'btn__linear-blur-2' => 'Style 1',
                                        'btn-mix-blend-mode-light' => 'Style 2',
                                    ],
                                    'default' => 'btn__linear-blur-2',
                                ),
                            ),
                            'title_field' => '{{{button_text}}}',
                        ),
                        array(
                            'name' => 'button_3_position',
                            'label' => esc_html__('Button Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'top' => 'Top',
                                'middle' => 'Middle',
                                'bottom' => 'Bottom',
                            ],
                            'default' => 'bottom',
                        ),
                    ),
                    'condition' => ['layout' => '3']
                ),
                array(
                    'name' => 'tab_content_4',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'image_l4',
                            'label' => esc_html__('Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'button_icon_l4',
                            'label' => esc_html__('Button Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                        ),
                        array(
                            'name' => 'link_l4',
                            'label' => esc_html__('Button Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                        array(
                            'name' => 'sub_title_l4',
                            'label' => esc_html__('Sub Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'title_l4',
                            'label' => esc_html__('Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'title_tag4',
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
                            'name' => 'excerpt_l4',
                            'label' => esc_html__('Excerpt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'feature_list_l4',
                            'label' => esc_html__('Feature List', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l4',
                                    'label' => esc_html__('Feature Text', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'feature_icon_l4',
                                    'label' => esc_html__('Feature Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                ),
                            ),
                            'title_field' => '{{{feature_text_l4}}}',
                        ),
                    ),
                    'condition' => ['layout' => '4']
                ),

                array(
                    'name' => 'tab_style',
                    'label' => esc_html__('Style Box', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'bg_color',
                            'label' => esc_html__('Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__inner' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'box_padding',
                            'label' => esc_html__('Box Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'image_radius',
                            'label' => esc_html__('Image Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_bg',
                            'label' => esc_html__('Title Background', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_padding',
                            'label' => esc_html__('Title Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_radius',
                            'label' => esc_html__('Title Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_margin',
                            'label' => esc_html__('Title Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'position_color',
                            'label' => esc_html__('Position Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'position_typography',
                            'label' => esc_html__('Position Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__position' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'position_bg',
                            'label' => esc_html__('Position Background', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__position' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'position_padding',
                            'label' => esc_html__('Position Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__position' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'position_radius',
                            'label' => esc_html__('Position Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__position' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'tab_style_2',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'active_text_color',
                            'label' => esc_html__('Active Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__active-text' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'active_text_typography',
                            'label' => esc_html__('Active Text Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-image-box__active-text',
                        ),
                    ),
                    'condition' => ['layout!' => '4']
                ),
                array(
                    'name' => 'tab_style_4',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'sub_title_color_v4_1',
                            'label' => esc_html__('Sub Title Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-sub-title' => '--value-color-1: {{VALUE}};',
                            ],
                        ), 
                        array(
                            'name' => 'sub_title_color_v4_2',
                            'label' => esc_html__('Sub Title Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-sub-title' => '--value-color-2: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_title_typography',
                            'label' => esc_html__('Sub Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-image-box__content-sub-title',
                        ),
                        array(
                            'name' => 'sub_title_margin',
                            'label' => esc_html__('Sub Title Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-sub-title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color_v4',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-title' => 'color: {{VALUE}};',
                            ],
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'title_typography_v4',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-image-box__content-title',
                        ),
                        array(
                            'name' => 'title_margin_v4',
                            'label' => esc_html__('Title Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'excerpt_color',
                            'label' => esc_html__('Excerpt Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-excerpt' => 'color: {{VALUE}};',
                            ],
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'excerpt_typography',
                            'label' => esc_html__('Excerpt Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-image-box__content-excerpt',
                        ),
                        array(
                            'name' => 'excerpt_margin',
                            'label' => esc_html__('Excerpt Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-excerpt' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'feature_list_color',
                            'label' => esc_html__('Feature List Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-feature-item span' => 'color: {{VALUE}};',
                            ],
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'feature_list_typography',
                            'label' => esc_html__('Feature List Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-image-box__content-feature-item span',
                        ),
                        array(
                            'name' => 'feature_list_gap',
                            'label' => esc_html__('Feature List Gap', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'default' => [
                                'size' => 8,
                                'unit' => 'px',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image-box__content-feature-list' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => ['layout' => '4']
                ),
               
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);