<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_categories',
        'title' => esc_html__('Case Categories', 'brighthub'),
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
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'default' => 'Default',
                            ],
                            'default' => 'default',
                        ),
                        array(
                            'name' => 'number_of_categories',
                            'label' => esc_html__('Number of Categories', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 5,
                        ),
                        array(
                            'name' => 'show_dot',
                            'label' => esc_html__('Show Dot', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_icon',
                            'label' => esc_html__('Show Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_count',
                            'label' => esc_html__('Show Count', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'item_background_color',
                            'label' => esc_html__('Item Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__list a' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'item_hover_background_color',
                            'label' => esc_html__('Item Hover Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__list a:hover' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Title Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__link' => 'color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'separator' => 'before',
                            'selector' => '{{WRAPPER}} .pxl-category__link a',
                        ),
                        array(
                            'name' => 'count_color',
                            'label' => esc_html__('Count Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__item-count' => 'color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'count_background_color',
                            'label' => esc_html__('Count Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__item-count' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'count_hover_background_color',
                            'label' => esc_html__('Count Hover Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__item a:hover .pxl-category__item-count' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'count_dot_color',
                            'label' => esc_html__('Count Dot Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__item--dot::before' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'count_dot_hover_color',
                            'label' => esc_html__('Count Dot Hover Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-category__item a:hover .pxl-category__item--dot::before' => 'background-color: {{VALUE}}',
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