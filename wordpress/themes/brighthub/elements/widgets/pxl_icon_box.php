<?php
// Register Icon Box Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_icon_box',
        'title' => esc_html__('Case Icon Box', 'brighthub' ),
        'icon' => 'eicon-icon-box case-widget',
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-2.jpg'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-3.jpg'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-4.webp'
                                ],
                                '5' => [
                                    'label' => esc_html__('Layout 5', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-5.webp'
                                ],
                                '6' => [
                                    'label' => esc_html__('Layout 6', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_icon_box/layout-6.webp'
                                ],
                            ],
                        ), 
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'df' => 'Default',
                                'bg-blur' => 'Background Blur',
                                'hover-shadow' => 'Hover Shadow',
                            ],
                            'default' => 'df',
                        ),
                        array(
                            'name' => 'align',
                            'label' => esc_html__( 'Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-text-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__( 'Center', 'brighthub' ),
                                    'icon' => 'eicon-text-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-text-align-right',
                                ],
                            ],
                            'default' => 'left',
                        ),
                        array(
                            'name' => 'icon_align',
                            'label' => esc_html__( 'Icon Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-h-align-left',
                                ],
                                'top' => [
                                    'title' => esc_html__( 'Top', 'brighthub' ),
                                    'icon' => 'eicon-v-align-top',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-h-align-right',
                                ],
                            ],
                            'default' => 'top',
                        ),

                        array(
                            'name' => 'icon_inline_title',
                            'label' => esc_html__( 'Icon Inline Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
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
                            'name' => 'icon_image',
                            'label' => esc_html__( 'Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'icon_type' => 'image',
                            ],
                        ),
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'desc',
                            'label' => esc_html__('Description', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'rows' => 10,
                            'show_label' => false,
                        ),
                        array(
                            'name' => 'item_link',
                            'label' => esc_html__('Item Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                        array(
                            'name' => 'h_width',
                            'label' => esc_html__('Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => [
                        'layout' => ['1', '5']
                    ]
                ),
                array(
                    'name' => 'section_content_layout_2',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'list_f2',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 3 item',
                            'controls' => array(
                                array(
                                    'name' => 'pxl_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'text',
                                    'label' => esc_html__('Text', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ text }}}',
                        ),
                        array(
                            'name' => 'pxl_favicon',
                            'label' => esc_html__('Favicon', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'description' => 'Insert Favicon in center widget',
                        ),
                        array(
                            'name' => 'image_feature_1',
                            'label' => esc_html__('Main Image Demo', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'description' => 'Add main image demo',
                        ),
                        array(
                            'name' => 'image_feature_2',
                            'label' => esc_html__('Sub Image Demo', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'description' => 'Add sub image demo',
                        ),
                    ),
                    'condition' => [
                        'layout' => '2'
                    ]
                ),
                array(
                    'name' => 'section_content_layout_3',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'list_f3',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 5 item',
                            'controls' => array(
                                array(
                                    'name' => 'pxl_icon3',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                            ),
                        ),
                        array(
                            'name' => 'align_l3',
                            'label' => esc_html__( 'Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left' => [
                                    'title' => esc_html__( 'Left', 'brighthub' ),
                                    'icon' => 'eicon-text-align-left',
                                ],
                                'right' => [
                                    'title' => esc_html__( 'Right', 'brighthub' ),
                                    'icon' => 'eicon-text-align-right',
                                ],
                            ],
                            'default' => 'left'
                        ),
                    ),
                    'condition' => [
                        'layout' => '3'
                    ]
                ),
                array(
                    'name' => 'section_content_layout_4',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'list_f4',
                            'label' => esc_html__('List Feature', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 5 item',
                            'controls' => array(
                                array(
                                    'name' => 'pxl_icon4',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                    'description' => 'The first icon will be main icon',
                                ),
                            ),
                        ),
                    ),
                    'condition' => [
                        'layout' => '4'
                    ]
                ),
                array(
                    'name' => 'section_content_layout_6',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'icon_type_layout_6',
                            'label' => esc_html__('Icon Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'icon' => 'Icon',
                                'image' => 'Image',
                            ],
                            'default' => 'icon',
                        ),
                        array(
                            'name' => 'pxl_icon_layout_6',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                            'condition' => [
                                'icon_type_layout_6' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_image_layout_6',
                            'label' => esc_html__('Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'icon_type_layout_6' => 'image',
                            ],
                        ),
                        array(
                            'name' => 'content_layout_6',
                            'label' => esc_html__('Content', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'rows' => 10,
                            'show_label' => false,
                        ),
                        array(
                            'name' => 'pxl_background_reveal_dot_pos',
                            'label' => esc_html__('Background Reveal Dot Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none'    => esc_html__('None', 'brighthub'),
                                'top-left'    => esc_html__('Top Left', 'brighthub'),
                                'top-right'   => esc_html__('Top Right', 'brighthub'),
                                'bottom-left' => esc_html__('Bottom Left', 'brighthub'),
                                'bottom-right'  => esc_html__('Bottom Right', 'brighthub'),
                                'center-top' => esc_html__('Center Top', 'brighthub'),
                                'center-bottom' => esc_html__('Center Bottom', 'brighthub'),
                                'center-left' => esc_html__('Center Left', 'brighthub'),
                                'center-right' => esc_html__('Center Right', 'brighthub'),
                                'center-center' => esc_html__('Center Center', 'brighthub'),
                                'auto' => esc_html__('Auto (Follow Mouse)', 'brighthub'),
                            ],
                            'default' => 'none',
                        ),
                    ),
                    'condition' => [
                        'layout' => '6'
                    ]
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'title_tag',
                            'label' => esc_html__('HTML Tag', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
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
                            'default' => 'h5',
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon-box__title',
                        ),
                        array(
                            'name' => 'title_margin',
                            'label' => esc_html__('Title Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_top_spacer',
                            'label' => esc_html__('Top Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__title' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'title_bottom_spacer',
                            'label' => esc_html__('Bottom Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'section_style_desc',
                    'label' => esc_html__('Description', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'desc_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__desc' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'desc_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon-box__desc',
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'section_style_icon',
                    'label' => esc_html__('Icon', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'icon_stylee',
                            'label' => esc_html__('Icon Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'normal' => esc_html__('Normal', 'brighthub' ),
                                'gradient' => esc_html__('Gradient', 'brighthub' ),
                                'icon-liquid-glass' => esc_html__('Icon Liquid Glass', 'brighthub' ),
                            ],
                            'default' => 'normal',
                        ),  

                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon i' => 'color: {{VALUE}};text-fill-color: {{VALUE}};-webkit-text-fill-color: {{VALUE}};background-image: none;',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_svg',
                            'label' => esc_html__('Icon Type SVG', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon svg' => 'fill: {{VALUE}};',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_svg_path',
                            'label' => esc_html__('Icon Fill Path', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon svg path' => 'fill: {{VALUE}};',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_bg_color',
                            'label' => esc_html__('Icon Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'background-color: {{VALUE}}',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_font_size',
                            'label' => esc_html__('Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon i' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-icon-box__icon svg' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'icon_type' => 'icon',
                            ],
                        ),
                        array(
                            'name' => 'icon_img_max_height',
                            'label' => esc_html__('Image Max Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon img' => 'max-height: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'icon_type' => 'image',
                            ],
                        ),
                        array(
                            'name' => 'box_icon_width',
                            'label' => esc_html__('Box Icon Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_icon_height',
                            'label' => esc_html__('Box Icon Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_padding',
                            'label' => esc_html__('Icon Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_margin',
                            'label' => esc_html__('Icon Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_radius',
                            'label' => esc_html__('Icon Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'         => 'icon_box_shadow',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-icon-box__icon',
                        ),
                        array(
                            'name' => 'icon_border_type',
                            'label' => esc_html__( 'Border Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => esc_html__( 'None', 'brighthub' ),
                                'solid' => esc_html__( 'Solid', 'brighthub' ),
                                'double' => esc_html__( 'Double', 'brighthub' ),
                                'dotted' => esc_html__( 'Dotted', 'brighthub' ),
                                'dashed' => esc_html__( 'Dashed', 'brighthub' ),
                                'groove' => esc_html__( 'Groove', 'brighthub' ),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color',
                            'label' => esc_html__( 'Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'border-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'button_bdr_blur',
                            'label' => esc_html__( 'Backdrop Filter Blur', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box__icon' => 'backdrop-filter: blur({{SIZE}}px);',
                            ],
                        ),
                    ),
                    'condition' => ['layout' => '1']
                ),
                array(
                    'name' => 'section_style_box',
                    'label' => esc_html__('Box', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'box_padding',
                            'label' => esc_html__('Box Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_padding_hover',
                            'label' => esc_html__('Box Padding Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box:hover' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_margin',
                            'label' => esc_html__('Box Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_border_radius',
                            'label' => esc_html__('Box Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_border_type',
                            'label' => esc_html__('Box Border Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => esc_html__( 'None', 'brighthub' ),
                                'solid' => esc_html__( 'Solid', 'brighthub' ),  
                                'double' => esc_html__( 'Double', 'brighthub' ),
                                'dotted' => esc_html__( 'Dotted', 'brighthub' ),
                                'dashed' => esc_html__( 'Dashed', 'brighthub' ),
                                'groove' => esc_html__( 'Groove', 'brighthub' ),
                            ],
                            'selectors' => [    
                                '{{WRAPPER}} .pxl-icon-box' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'box_border_width',
                            'label' => esc_html__('Box Border Width', 'brighthub' ),    
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'responsive' => true,
                            'condition' => [
                                'box_border_type!' => '',
                            ],
                        ),
                        array(
                            'name' => 'box_border_color',
                            'label' => esc_html__('Box Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'box_border_type!' => '',
                            ],
                        ),
                        array(
                            'name' => 'box_border_color_hover',
                            'label' => esc_html__('Box Border Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box:hover' => 'border-color: {{VALUE}};',
                            ],  
                            'condition' => [
                                'box_border_type!' => '',
                            ],
                        ),
                        array(
                            'name' => 'box_background_color',
                            'label' => esc_html__('Box Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'background-color: {{VALUE}};',  
                            ],
                        ),
                        
                        array(
                            'name' => 'box_background_color_blur_hover',
                            'label' => esc_html__('Box Background Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box:hover' => 'background-color: {{VALUE}};',  
                            ],
                        ),
                        array(
                            'name' => 'backdrop_filter',
                            'label' => esc_html__('Backdrop Filter', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon-box' => 'backdrop-filter: blur({{SIZE}}px);',  
                            ],
                            'condition' => [
                                'box_border_type' => '',
                            ],
                            'separator' => 'before',
                        ),
                       
                        array(
                            'name' => 'box_box_shadow',
                            'label' => esc_html__('Box Shadow', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-icon-box',
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'box_hover_shadow',
                            'label' => esc_html__('Box Hover Shadow', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-icon-box:hover',
                        ),
                    ), 
                    'condition' => ['layout' => '1']
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);