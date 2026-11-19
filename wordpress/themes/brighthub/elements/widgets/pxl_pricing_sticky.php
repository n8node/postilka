<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_pricing_sticky',
        'title' => esc_html__('Case Pricing Sticky', 'brighthub'),
        'icon' => 'eicon-price-table case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'pricing_items',
                            'label' => esc_html__('Content', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'plan',
                                    'label' => esc_html__('Title', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'SEO Setup & Consulting',
                                ),
                                array(
                                    'name' => 'desc',
                                    'label' => esc_html__('Description', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                    'default' => 'Perfect SEO setup without the technical hassle.',
                                ),
                                array(
                                    'name' => 'currency',
                                    'label' => esc_html__('Currency', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => '$',
                                ),
                                array(
                                    'name' => 'price',
                                    'label' => esc_html__('Price', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => '99',
                                ),
                                array(
                                    'name' => 'period',
                                    'label' => esc_html__('Period', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'one-time',
                                ),
                                array(
                                    'name' => 'btn_text',
                                    'label' => esc_html__('Button Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Get Started',
                                ),
                                array(
                                    'name' => 'btn_link',
                                    'label' => esc_html__('Button Link', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature',
                                    'label' => esc_html__('Feature', 'brighthub'),
                                    'type' => 'pxl_icons',
                                ),
                            ),
                            'title_field' => '{{{ plan }}}',
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
                            'name' => 'top_offset',
                            'label' => esc_html__('Top Offset', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 100,
                        ),
                        array(
                            'name' => 'data_top_next_item',
                            'label' => esc_html__('Top Offset Next Item', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'description' => esc_html__('Distance from top when next item = top offset + this value (px)', 'brighthub'),
                            'default' => 100,
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'bg_color',
                            'label' => esc_html__('Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing-sticky' => 'background-color: {{VALUE}};',
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