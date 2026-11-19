<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_banner_box',
        'title' => esc_html__('Case Banner Box', 'brighthub'),
        'icon' => 'eicon-posts-ticker case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(),
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-1.webp'
                                ], 
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-2.webp'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-3.webp'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-4.webp'
                                ],
                                '5' => [
                                    'label' => esc_html__('Layout 5', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-5.webp'
                                ],
                                '6' => [
                                    'label' => esc_html__('Layout 6', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-6.jpg'
                                ],
                                '7' => [
                                    'label' => esc_html__('Layout 7', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-7.jpg'
                                ],
                                '8' => [
                                    'label' => esc_html__('Layout 8', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-8.jpg'
                                ],
                                '9' => [
                                    'label' => esc_html__('Layout 9', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_banner_box/layout-9.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'scl1',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl1_fav',
                            'label' => esc_html__('Favicon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl1_fea',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 5 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl1_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'scl1_text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ scl1_text }}}',
                        ),
                        array(
                            'name' => 'scl1_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'title_tag1',
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
                            'name' => 'scl1_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                        ),
                        array(
                            'name' => 'scl1_url',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '1'
                    ]
                ),
                array(
                    'name' => 'scl2',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl2_type',
                            'label' => esc_html__('Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'SEO Optimization',
                        ),
                        array(
                            'name' => 'scl2_type_desc',
                            'label' => esc_html__('Type Description', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'default' => 'Boost your business growth with our <em>productivity software.</em> Streamline workflows and increase efficiency effortlessly',
                            'description' => 'If you have Hightlight text, please add into <em></em>'
                        ),
                        array(
                            'name' => 'scl2_chart_sub',
                            'label' => esc_html__('Chart Sub Description', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'default' => 'Boost in SEO Performance',
                        ),
                        array(
                            'name' => 'scl2_chart_number',
                            'label' => esc_html__('Chart Number', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '70',
                        ),
                        array(
                            'name' => 'scl2_chart_suffix',
                            'label' => esc_html__('Chart Suffix', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '+',
                        ),
                        array(
                            'name' => 'scl2_chart_prefix',
                            'label' => esc_html__('Chart Prefix', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '%',
                        ),
                        array(
                            'name' => 'scl2_chart_svg',
                            'label' => esc_html__('Chart Image(SVG)', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'description' => 'Please select "upload SVG" option and upload.'
                        ),
                        array(
                            'name' => 'scl2_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'title_tag2',
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
                            'name' => 'scl2_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                        ),
                        array(
                            'name' => 'scl2_link',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '2'
                    ]
                ),
                array(
                    'name' => 'scl3',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl3_fea',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 5 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl3_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'scl3_text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ scl3_text }}}',
                        ),
                        array(
                            'name' => 'scl3_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            array(
                            'name' => 'title_tag3',
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
                        ),
                        array(
                            'name' => 'scl3_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                        ),
                        array(
                            'name' => 'scl3_link',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '3'
                    ]
                ),
                array(
                    'name' => 'scl4',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl4_content_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl4_fea',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 8 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl4_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'scl4_text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ scl4_text }}}',
                        ),
                        array(
                            'name' => 'scl4_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
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
                        ),
                        array(
                            'name' => 'scl4_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                        ),
                        array(
                            'name' => 'scl4_link',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '4'
                    ]
                ),
                array(
                    'name' => 'scl5',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl5_content_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl5_fea',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 8 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl5_text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ scl5_text }}}',
                        ),
                        array(
                            'name' => 'scl5_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'title_tag5',
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
                            'name' => 'scl5_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                        ),
                        array(
                            'name' => 'scl5_link',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '5'
                    ]
                ),
                array(
                    'name' => 'scl6',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl6_img_1',
                            'label' => esc_html__('Image 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl6_img_2',
                            'label' => esc_html__('Image 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl6_img_3',
                            'label' => esc_html__('Image 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl6_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl6_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => 'Ecommerce'
                        ),
                        array(
                            'name' => 'title_tag6',
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
                            'name' => 'scl6_link',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '6'
                    ]
                ),
                array(
                    'name' => 'scl6_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'scl6_style_txt',
                            'label' => esc_html__('Feature Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'scl6_style_bg',
                            'label' => esc_html__('Feature Background Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__title' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'scl6_style_title',
                            'label' => esc_html__('Title Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-banner-box__title',
                        ),
                    ),
                    'condition' => [
                        'layout' => ['6', '7', '8']
                    ]
                ),
                array(
                    'name' => 'scl7',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl7_img_1',
                            'label' => esc_html__('Image 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl7_img_2',
                            'label' => esc_html__('Image 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl7_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl7_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => 'Ecommerce'
                        ),
                        array(
                            'name' => 'title_tag7',
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
                            'name' => 'scl7_link',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '7'
                    ]
                ),
                array(
                    'name' => 'scl8',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl8_img_1',
                            'label' => esc_html__('Image 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'scl8_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl8_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => 'Ecommerce'
                        ),
                        array(
                            'name' => 'title_tag8',
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
                            'name' => 'scl8_link',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '8'
                    ]
                ),
                array(
                    'name' => 'scl9',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl9_title',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => '❓ FAQs'
                        ),
                        array(
                            'name' => 'title_tag9',
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
                            'name' => 'scl9_desc',
                            'label' => esc_html__('Description', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => 'Got a question? Our FAQs provide quick answers, from setup to troubleshooting, in just a few clicks.'
                        ),
                        array(
                            'name' => 'scl9_btn',
                            'label' => esc_html__('Button Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'defaut' => 'Browse FAQs'
                        ),
                        array(
                            'name' => 'scl9_link',
                            'label' => esc_html__('Link', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '9'
                    ]
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);