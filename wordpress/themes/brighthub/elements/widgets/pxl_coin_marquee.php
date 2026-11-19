<?php
$slides_to_show = range( 1, 10 );
$slides_to_show = array_combine( $slides_to_show, $slides_to_show );
pxl_add_custom_widget(
    array(
        'name' => 'pxl_coin_marquee',
        'title' => esc_html__('Case Coin Marquee', 'brighthub'),
        'icon' => 'eicon-wordart case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => array(
                                'style-1' => esc_html__('Style 1', 'brighthub'),
                            ),
                            'default' => 'style-1',
                        ),
                        array(
                            'name' => 'fading',
                            'label' => esc_html__('Fading', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_off' => esc_html__('No', 'brighthub'),
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'list_number',
                            'label' => esc_html__('List Number', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => array(
                                '1' => esc_html__('1', 'brighthub'),
                                '2' => esc_html__('2', 'brighthub'),
                                '3' => esc_html__('3', 'brighthub'),
                                '4' => esc_html__('4', 'brighthub'),
                                '5' => esc_html__('5', 'brighthub'),
                            ),
                            'default' => '2',
                        ),
                        array(
                            'name' => 'list_max_width',
                            'label' => esc_html__('List Max Width', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px', '%'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-marquee' => 'max-width: {{SIZE}}{{UNIT}}; margin: 0 auto;',
                            ],
                        ),
                    ),
                ),

                array(
                    'name' => 'tab_style',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'text_color',
                            'label' => esc_html__('Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-coin-marquee__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'text_typography',
                            'label' => esc_html__('Text Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-coin-marquee__title',
                        ),
                        array(
                            'name' => 'price_color',
                            'label' => esc_html__('Price Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-coin-marquee__price' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'price_typography',
                            'label' => esc_html__('Price Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-text-marquee .pxl-marquee__item-price',
                        ),
                        array(
                            'name' => 'percent_color_decrease',
                            'label' => esc_html__('Percent Color Decrease', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-coin-marquee__percent.decrease' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'percent_color_increase',
                            'label' => esc_html__('Percent Color Increase', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-coin-marquee__percent.increase' => 'color: {{VALUE}};',
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