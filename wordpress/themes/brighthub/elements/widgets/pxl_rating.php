<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_rating',
        'title' => esc_html__('Case Rating', 'brighthub'),
        'icon' => 'eicon-rating case-widget',
        'categories' => array('pxltheme-core'),
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_rating/layout-1.jpg'
                                ], 
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_rating/layout-2.jpg'
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
                            'name' => 'items_l1',
                            'label' => esc_html__('Image', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'pxl_image_l1',
                                    'label' => esc_html__('Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'fa4compatibility' => 'icon',
                                ),
                            ),
                        ),
                        array(
                            'name' => 'l1_star',
                            'label' => esc_html__('Star', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '5'
                        ),
                        array(
                            'name' => 'l1_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'section_content_l2',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'l2_icon',
                            'label' => esc_html__('Icon Star', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'l2_text_after_star',
                            'label' => esc_html__('Text After Star', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Trustpilot'
                        ),
                        array(
                            'name' => 'l2_star',
                            'label' => esc_html__('Star Details', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Excellent 4.9/5'
                        ),
                    ),
                    'condition' => ['layout' => '2']
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'star_color',
                            'label' => esc_html__('Star Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => ['layout' => '1'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-rating__meta-star svg path' => 'fill: {{VALUE}};'
                            ]
                        ),
                        array(
                            'name' => 'star_margin',
                            'label' => esc_html__('Star Margin', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'condition' => ['layout' => '1'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-rating__meta-star svg' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};'
                            ]
                        ),
                        array(
                            'name' => 'number_color',
                            'label' => esc_html__('Number Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => ['layout' => '1'],
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-rating__meta-star span' => 'color: {{VALUE}};'
                            ]
                        ),
                        array(
                            'name' => 'number_typography',
                            'label' => esc_html__('Number Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'condition' => ['layout' => '1'],
                            'selector' => '{{WRAPPER}} .pxl-rating__meta-star span',
                        ),
                        array(
                            'name' => 'desc_color',
                            'label' => esc_html__('Description Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => ['layout' => '1'],
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-rating__meta-desc' => 'color: {{VALUE}};'
                            ]
                        ),
                        array(
                            'name' => 'desc_typography',
                            'label' => esc_html__('Description Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'condition' => ['layout' => '1'],
                            'selector' => '{{WRAPPER}} .pxl-rating__meta-desc',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);