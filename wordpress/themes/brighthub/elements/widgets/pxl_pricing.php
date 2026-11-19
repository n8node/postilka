<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_pricing',
        'title' => esc_html__('Case Pricing', 'brighthub'),
        'icon' => 'eicon-price-table case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_layout',
                    'label' => esc_html__('Layout', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    'controls' => array(
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
                            'name' => 'layout',
                            'label' => esc_html__('Templates', 'brighthub'),
                            'type' => 'layoutcontrol',
                            'default' => '1',
                            'options' => [
                                '1' => [
                                    'label' => esc_html__('Layout 1', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-2.jpg'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-3.jpg'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-4.jpg'
                                ],
                                '5' => [
                                    'label' => esc_html__('Layout 5', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-5.webp'
                                ],
                                '6' => [
                                    'label' => esc_html__('Layout 6', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-6.webp'
                                ],
                                '7' => [
                                    'label' => esc_html__('Layout 7', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-7.webp'
                                ],
                                '8' => [
                                    'label' => esc_html__('Layout 8', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-8.webp'
                                ],
                                '9' => [
                                    'label' => esc_html__('Layout 9', 'brighthub'),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_pricing/layout-9.jpg'
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
                            'name' => 'active',
                            'label' => esc_html__('Is Active?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'yes' => 'Yes',
                                'no' => 'No',
                            ],
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'plan',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free Plan'
                        ),
                        array(
                            'name' => 'currency',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price',
                            'label' => esc_html__('Price', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '0'
                        ),
                        array(
                            'name' => 'period',
                            'label' => esc_html__('Price Period', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'month'
                        ),
                        array(
                            'name' => 'desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Best for personal use, students'
                        ),
                        array(
                            'name' => 'feature',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_text }}}',
                        ),
                        array(
                            'name' => 'btn_text',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Start Free'
                        ),
                        array(
                            'name' => 'btn_link',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                    ),
                    'condition' => ['layout' => ['1', '8']]
                ),
                array(
                    'name' => 'section_content_l2',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_l2',
                            'label' => esc_html__('Is Active?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'yes' => 'Yes',
                                'no' => 'No',
                            ],
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'plan_l2',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free Plan'
                        ),
                        array(
                            'name' => 'currency_l2',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l2',
                            'label' => esc_html__('Price', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '0'
                        ),
                        array(
                            'name' => 'period_l2',
                            'label' => esc_html__('Price Period', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Per Month'
                        ),
                        array(
                            'name' => 'btn_text_l2',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free Plan'
                        ),
                        array(
                            'name' => 'btn_link_l2',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'feature_l2',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_label_l2',
                                    'label' => esc_html__('Label', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_text_l2',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l2',
                                    'label' => esc_html__('Icon', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_label_l2 }}}',
                        ),
                        array(
                            'name' => 'show_label',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                            'control_type' => 'responsive'
                        ),
                    ),
                    'condition' => ['layout' => '2']
                ),
                array(
                    'name' => 'section_content_l3',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_l3',
                            'label' => esc_html__('Is Active?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'yes' => 'Yes',
                                'no' => 'No',
                            ],
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'icon_l3',
                            'label' => esc_html__('Icon', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::ICONS,
                        ),
                        array(
                            'name' => 'icon_l3_bg_color',
                            'label' => esc_html__('Icon Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__icon' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'plan_l3',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free Plan'
                        ),
                        array(
                            'name' => 'desc_l3',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Individuals & small teams'
                        ),
                        array(
                            'name' => 'currency_l3',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l3',
                            'label' => esc_html__('Price', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '0'
                        ),
                        array(
                            'name' => 'period_l3',
                            'label' => esc_html__('Price Period', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/month'
                        ),
                        array(
                            'name' => 'btn_text_l3',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free Plan'
                        ),
                        array(
                            'name' => 'btn_link_l3',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'feature_l3',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l3',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l3',
                                    'label' => esc_html__('Icon', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_text_l3 }}}',
                        ),
                    ),
                    'condition' => ['layout' => '3']
                ),
                array(
                    'name' => 'section_content_l4',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_l4',
                            'label' => esc_html__('Is Active?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'popular_l4',
                            'label' => esc_html__('Show Popular?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'popular_text_l4',
                            'label' => esc_html__('Popular Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Most Popular',
                            'condition' => ['popular_l4' => 'true']
                        ),
                        array(
                            'name' => 'plan_l4',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Starter'
                        ),
                        array(
                            'name' => 'currency_l4',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l41',
                            'label' => esc_html__('Price Option 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '12',
                        ),
                        array(
                            'name' => 'price_l42',
                            'label' => esc_html__('Price Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '99',
                            'condition' => ['layout' =>  ['4', '9']]
                        ),
                        array(
                            'name' => 'period_l41',
                            'label' => esc_html__('Price Period Option 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/month'
                        ),
                        array(
                            'name' => 'period_l42',
                            'label' => esc_html__('Price Period Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/year',
                            'condition' => ['layout' => ['4', '9']]
                        ),
                        array(
                            'name' => 'other_opt1_l4',
                            'label' => esc_html__('View other option price 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'View yearly billing'
                        ),
                        array(
                            'name' => 'other_opt2_l4',
                            'label' => esc_html__('View other option price 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'View monthly billing',
                            'condition' => ['layout' => '4']
                        ),
                        array(
                            'name' => 'desc_l4',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Best for personal use, students'
                        ),
                        array(
                            'name' => 'tit_fea_l4',
                            'label' => esc_html__('Feature Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Features',
                            'condition' => ['layout' => ['4', '9']]
                        ),
                        array(
                            'name' => 'desc_fea_l4',
                            'label' => esc_html__('Feature Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Everything in our free plan plus...',
                            'condition' => ['layout' => '4']
                        ),
                        array(
                            'name' => 'feature_l4',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l4',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l4',
                                    'label' => esc_html__('Icon', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_text_l4 }}}',
                        ),
                        array(
                            'name' => 'btn_text_l4',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Choose Starter'
                        ),
                        array(
                            'name' => 'btn_link_l4',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'text_under_button',
                            'label' => esc_html__('Text Under Button', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Free forever',
                            'condition' => ['layout' => '4']
                        ),
                    ),
                    'condition' => ['layout' => ['4', '6', '9']]
                ),
                array(
                    'name' => 'section_content_l5',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'plan_l5',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Basic Plan'
                        ),
                        array(
                            'name' => 'desc_l5',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Perfect for startups and small teams getting started.'
                        ),
                        array(
                            'name' => 'currency_l5',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l5',
                            'label' => esc_html__('Price Option 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '12'
                        ),
                        array(
                            'name' => 'sale_price_l5',
                            'label' => esc_html__('Sale Price Option 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '10'
                        ),
                        array(
                            'name' => 'period_l5',
                            'label' => esc_html__('Price Period', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/ month',

                        ),
                        array(
                            'name' => 'price_l5_option_2',
                            'label' => esc_html__('Price Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '120'
                        ),
                        array(
                            'name' => 'sale_price_l5_option_2',
                            'label' => esc_html__('Sale Price Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '100',
                        ),

                        array(
                            'name' => 'period_l5_option_2',
                            'label' => esc_html__('Price Period Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/ year',

                        ),
                        array(
                            'name' => 'desc_price_l5',
                            'label' => esc_html__('Description Below Price', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => '20% off billed annually'
                        ),
                        array(
                            'name' => 'btn_text_l5',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Subscribe'
                        ),
                        array(
                            'name' => 'btn_link_l5',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'text_below_button_l5',
                            'label' => esc_html__('Text Below Button', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'View yearly billing'
                        ),
                        array(
                            'name' => 'text_below_button_l5_option_2',
                            'label' => esc_html__('Text Below Button Option 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'View monthly billing'
                        ),
                        array(
                            'name' => 'feature_l5',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l5',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l5',
                                    'label' => esc_html__('Icon', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_text_l5 }}}',
                        ),

                    ),
                    'condition' => ['layout' => '5']
                ),
                array(
                    'name' => 'section_content_l7',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_l7',
                            'label' => esc_html__('Is Active?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'is_popular_l7',
                            'label' => esc_html__('Is Popular?', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'no',
                        ),
                        array(
                            'name' => 'popular_text_l7',
                            'label' => esc_html__('Popular Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Popular',
                        ),
                        array(
                            'name' => 'plan_l7',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Personal Plan'
                        ),
                        array(
                            'name' => 'currency_l7',
                            'label' => esc_html__('Currency', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l7',
                            'label' => esc_html__('Price Option 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '25'
                        ),
                        array(
                            'name' => 'period_l7',
                            'label' => esc_html__('Price Period', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/month',

                        ),
                        array(
                            'name' => 'desc_l7',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Perfect for individuals and small shops.'
                        ),
                        array(
                            'name' => 'feature_l7',
                            'label' => esc_html__('Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l7',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_desc_l7',
                                    'label' => esc_html__('Description', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l7',
                                    'label' => esc_html__('Icon', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ feature_text_l7 }}}',
                        ),

                        array(
                            'name' => 'feature_min_height_l7',
                            'label' => esc_html__('Feature Min Height', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'label_block' => true,
                            'size_units' => ['px'],
                            'control_type' => 'responsive',
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 2000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__fea' => 'min-height: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_text_l7',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Subscribe'
                        ),
                        array(
                            'name' => 'btn_link_l7',
                            'label' => esc_html__('Button Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                    ),
                    'condition' => ['layout' => '7']
                ),
                array(
                    'name' => 'section_style_box',
                    'label' => esc_html__('Style Box', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'box_l4_bgcolor',
                            'label' => esc_html__('Box Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing' => 'background-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'box_l4_bgcolor_hover',
                            'label' => esc_html__('Box Background Color Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing:hover' => 'background-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'box_l4_bg_top_type',
                            'label' => esc_html__('Box Background Top Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'separator' => 'before',
                            'description' => esc_html__('If you want to use gradient, 1 set default gradient, 2 set gradient color hover', 'brighthub'),
                            'options' => [
                                'none' => esc_html__('None', 'brighthub'),
                                'color' => esc_html__('Color', 'brighthub'),
                                'gradient' => esc_html__('Gradient', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__top' => 'background-image: {{VALUE}};'
                            ],
                            'condition' => [
                                'layout' => ['4', '6']
                            ],
                        ),
                        array(
                            'name' => 'box_l4_bg_top_color',
                            'label' => esc_html__('Box Background Top Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__top' => 'background-color: {{VALUE}};'
                            ],
                            'condition' => [
                                'box_l4_bg_top_type' => 'color'
                            ],
                        ),

                        array(
                            'name'         => 'box_l4_bg_top_gradient',
                            'label' => esc_html__('Box Background Top Gradient', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => ['gradient'],
                            'selector'     =>  '{{WRAPPER}} .pxl-pricing__top',
                            'condition' => [
                                'box_l4_bg_top_type' => 'gradient'
                            ],
                        ),
                        array(
                            'name' => 'box_l4_bg_top_gradient_hover',
                            'label' => esc_html__('Box Background Top Gradient', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => ['gradient'],
                            'selector'     =>  '{{WRAPPER}} .pxl-pricing:hover .pxl-pricing__top',
                            'condition' => [
                                'box_l4_bg_top_type' => 'gradient'
                            ],
                        ),
                        array(
                            'name' => 'border_type_hover',
                            'label' => esc_html__('Border Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'separator' => 'before',
                            'options' => [
                                '' => esc_html__('None', 'brighthub'),
                                'solid' => esc_html__('Solid', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width_hover',
                            'label' => esc_html__('Border Width', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color_hover',
                            'label' => esc_html__('Border Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type_hover!' => '',
                            ],
                        ),

                        array(
                            'name' => 'box_border_radius_hover',
                            'label' => esc_html__('Border Radius', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name'         => 'box_box_shadow_hover',
                            'label' => esc_html__('Box Shadow', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-pricing',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_l4',
                    'label' => esc_html__('Style Text', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'popular_l4_color',
                            'label' => esc_html__('Popular Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__popular' => 'color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'popular_l4_typography',
                            'label' => esc_html__('Popular Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__popular',
                        ),
                        array(
                            'name' => 'title_l4_color',
                            'label' => esc_html__('Title Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__title' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'title_l4_typography',
                            'label' => esc_html__('Title Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__title',
                        ),
                        array(
                            'name' => 'price_l4_color',
                            'label' => esc_html__('Price Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__price-detail' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'price_l4_typography',
                            'label' => esc_html__('Price Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__price-detail',
                        ),
                        array(
                            'name' => 'price_l4_period_color',
                            'label' => esc_html__('Price Period Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__price-period' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'price_l4_period_typography',
                            'label' => esc_html__('Price Period Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__price-period',
                        ),
                        array(
                            'name' => 'opt_l4_color',
                            'label' => esc_html__('Option Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__option, {{WRAPPER}} .pxl-pricing__option svg path' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'opt_l4_color_hover',
                            'label' => esc_html__('Option Color Hover', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__option:hover, {{WRAPPER}} .pxl-pricing__option:hover svg path' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'opt_l4_typography',
                            'label' => esc_html__('Option Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__option',
                        ),
                        array(
                            'name' => 'desc_l4_color',
                            'label' => esc_html__('Description Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__desc' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'desc_l4_typography',
                            'label' => esc_html__('Description Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__desc',
                        ),
                        array(
                            'name' => 'feature_l4_box_bg',
                            'label' => esc_html__('Feature Box Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__bottom' => 'background-color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'feature_l4_box_border_radius',
                            'label' => esc_html__('Feature Box Border Radius', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__bottom' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'feature_l4_box_title_color',
                            'label' => esc_html__('Feature Box Title Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__bottom-tit' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'feature_l4_box_title_typography',
                            'label' => esc_html__('Feature Box Title Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__bottom-tit',
                        ),
                        array(
                            'name' => 'feature_l4_box_desc_color',
                            'label' => esc_html__('Feature Box Description Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__bottom-desc' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'feature_l4_box_desc_typography',
                            'label' => esc_html__('Feature Box Description Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__bottom-desc',
                        ),
                        array(
                            'name' => 'feature_l4_item_color',
                            'label' => esc_html__('Feature Box Item Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__fea-item' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'feature_l4_item_typography',
                            'label' => esc_html__('Feature Box Item Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__fea-item',
                        ),
                        array(
                            'name' => 'feature_l4_item_spacer',
                            'label' => esc_html__('Feature Box Item Spacer', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__fea' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => ['layout' => ['4', '6']]
                ),
                array(
                    'name' => 'section_style_button',
                    'label' => esc_html__('Style Button', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => ['layout!' => ['7']],
                    'controls' => array(
                        array(
                            'name' => 'button_color',
                            'label' => esc_html__('Button Text Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_hover_color',
                            'label' => esc_html__('Button Hover Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button:hover' => 'color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_typography',
                            'label' => esc_html__('Button Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__button',
                        ),
                        array(
                            'name' => 'button_border_color',
                            'label' => esc_html__('Button Border Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'border-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_border_width',
                            'label' => esc_html__('Button Border Width', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_border_radius',
                            'label' => esc_html__('Button Border Radius', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_background_type',
                            'label' => esc_html__('Button Background Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'default' => esc_html__('Default', 'brighthub'),
                                'gradient' => esc_html__('Gradient', 'brighthub'),
                            ],
                            'default' => 'default',
                        ),
                        array(
                            'name' => 'button_background_color',
                            'label' => esc_html__('Button Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'background-color: {{VALUE}};'
                            ],
                            'condition' => [
                                'button_background_type' => 'default',
                            ],
                        ),
                        array(
                            'name'         => 'btn_gradient',
                            'label' => esc_html__('Background Type', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => ['gradient'],
                            'selector'     => '{{WRAPPER}} .pxl-pricing__button',
                            'condition' => [
                                'button_background_type' => 'gradient',
                            ],
                        ),
                        array(
                            'name' => 'button_hover_background_color',
                            'label' => esc_html__('Button Hover Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button:hover' => 'background-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_hover_border_color',
                            'label' => esc_html__('Button Hover Border Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button:hover' => 'border-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_padding',
                            'label' => esc_html__('Button Padding', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'button_margin',
                            'label' => esc_html__('Button Margin', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                    ),
                ),
                array(
                    'name' => 'section_style_l7',
                    'label' => esc_html__('Style Text', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'popular_l7_color',
                            'label' => esc_html__('Popular Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__popular' => 'color: {{VALUE}};'
                            ],
                            'condition' => [
                                'is_popular_l7' => 'yes',
                            ],
                        ),
                        array(
                            'name' => 'popular_l7_typography',
                            'label' => esc_html__('Popular Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__popular',
                            'condition' => [
                                'is_popular_l7' => 'yes',
                            ],
                        ),
                        array(
                            'name' => 'popular_l7_bg_color',
                            'label' => esc_html__('Popular Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__popular' => 'background-color: {{VALUE}};'
                            ],
                            'condition' => [
                                'is_popular_l7' => 'yes',
                            ],
                        ),
                        array(
                            'name' => 'title_l7_color',
                            'label' => esc_html__('Title Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__title' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'title_l7_typography',
                            'label' => esc_html__('Title Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__title',
                        ),
                        array(
                            'name' => 'price_l7_color',
                            'label' => esc_html__('Price Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__price-detail' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'price_l7_typography',
                            'label' => esc_html__('Price Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__price-detail',
                        ),
                        array(
                            'name' => 'price_l7_period_color',
                            'label' => esc_html__('Price Period Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__price-period' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'price_l7_period_typography',
                            'label' => esc_html__('Price Period Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__price-period',
                        ),
                        array(
                            'name' => 'desc_l7_color',
                            'label' => esc_html__('Description Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__desc' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'desc_l7_typography',
                            'label' => esc_html__('Description Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__desc',
                        ),
                        array(
                            'name' => 'button_l7_color',
                            'label' => esc_html__('Button Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button a' => 'color: {{VALUE}};'
                            ],
                            'separator' => 'before'
                        ),
                        array(
                            'name' => 'button_l7_typography',
                            'label' => esc_html__('Button Typography', 'brighthub'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-pricing__button a',
                        ),
                        array(
                            'name' => 'button_l7_bg_color',
                            'label' => esc_html__('Button Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button a' => 'background-color: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_l7_hover_color_1',
                            'label' => esc_html__('Button Hover Color 1', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => '--gradient-color-1: {{VALUE}};'
                            ],
                        ),
                        array(
                            'name' => 'button_l7_hover_color_2',
                            'label' => esc_html__('Button Hover Color 2', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-pricing__button' => '--gradient-color-2: {{VALUE}};'
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
