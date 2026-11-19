<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_chart_week',
        'title' => esc_html__('Case Chart Week', 'brighthub' ),
        'icon' => 'eicon-align-stretch-v case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'chart_week_list',
                            'label' => esc_html__('Chart Week', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'chart_week_item_active',
                                    'label' => esc_html__('Active', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'label_on' => esc_html__('Yes', 'brighthub' ),
                                    'label_off' => esc_html__('No', 'brighthub' ),
                                    'default' => 'no',
                                ),
                                array(
                                    'name' => 'chart_week_day',
                                    'label' => esc_html__('Chart Week Day', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'default' => 'M',
                                ),
                                array(
                                    'name' => 'chart_week_value',
                                    'label' => esc_html__('Chart Week Value', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'size_units' => ['%'],
                                    'range' => [
                                        '%' => [
                                            'min' => 0,
                                            'max' => 100,
                                        ],
                                    ],
                                    'default' => [
                                        'unit' => '%',
                                        'size' => 50,
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}} .pxl-chart-week__item-value .line' => 'height: {{SIZE}}{{UNIT}}',
                                    ],
                                ),
                            ),
                            'title_field' => '{{{ chart_week_day }}}',
                        ),
                        array(
                            'name' => 'delay',
                            'label' => esc_html__('Delay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['ms'],
                            'range' => [
                                'ms' => [
                                    'min' => 0,
                                    'max' => 10000,
                                    'step' => 100
                                ],
                            ],
                            'default' => [
                                'unit' => 'ms',
                                'size' => 1800,
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item .pxl-chart-week__item-value .line:before' => 'transition-delay: {{SIZE}}{{UNIT}}',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'chart_week_item_bg_color',
                            'label' => esc_html__('Item Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#EFEFEF',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item:before' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'chart_week_item_active_color_type',
                            'label' => esc_html__('Item Active Color Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'gradient',
                            'options' => [
                                'color' => esc_html__('Color', 'brighthub' ),
                                'gradient' => esc_html__('Gradient', 'brighthub' ),
                            ],
                        ),
                        array(
                            'name' => 'chart_week_item_active_color',
                            'label' => esc_html__('Item Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#92E136',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item.active .pxl-chart-week__item-value .line:before' => 'background-color: {{VALUE}}',
                            ],
                            'condition' => [
                                'chart_week_item_active_color_type' => 'color',
                            ],
                        ),
                        array(
                            'name' => 'chart_week_item_gradient_color_1',
                            'label' => esc_html__('Item Gradient Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#92E136',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item.active' => '--gradient-color-1: {{VALUE}}',
                            ],
                            'condition' => [
                                'chart_week_item_active_color_type' => 'gradient',
                            ],
                        ),
                        array(
                            'name' => 'chart_week_item_gradient_color_2',
                            'label' => esc_html__('Item Gradient Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#D2F49D',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item.active' => '--gradient-color-2: {{VALUE}}',
                            ],
                            'condition' => [
                                'chart_week_item_active_color_type' => 'gradient',
                            ],
                        ),

                        array(
                            'name' => 'text_color',
                            'label' => esc_html__('Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#999999',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item' => 'color: {{VALUE}}',
                            ],
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'min_width_item',
                            'label' => esc_html__('Min Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-chart-week__item' => 'min-width: {{SIZE}}{{UNIT}};',
                            ],
                            'separator' => 'before',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);