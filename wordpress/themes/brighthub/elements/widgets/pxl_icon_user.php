<?php
// Register Button Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_icon_user',
        'title' => esc_html__('Case User', 'brighthub' ),
        'icon' => 'eicon-lock-user case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'source_section',
                    'label' => esc_html__('Source Settings', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'text_button_login',
                            'label' => esc_html__('Text Button Log In', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Log In',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'login_url',
                            'label' => esc_html__('Login Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                            'description' => esc_html__('Link to login page. If this field is empty, the default login form will be popup.', 'brighthub' ),
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'text_button_register',
                            'label' => esc_html__('Text Button Register', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Sign Up (Free)',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'register_url',
                            'label' => esc_html__('Register Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                            'description' => esc_html__('Link to register page. If this field is empty, the default register form will be popup.', 'brighthub' ),
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'icon_type',
                            'label' => esc_html__('Icon Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none' => 'None',
                                'icon' => 'Icon',
                                'image' => 'Image',
                                'avatar' => 'Avatar',
                            ],
                            'default' => 'avatar',
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
                            'name' => 'post_type',
                            'label' => esc_html__('User Post Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '',
                            'options' => [
                                '' => esc_html__('All', 'brighthub' ),
                                'page' => esc_html__('Page', 'brighthub' ),
                                'post' => esc_html__('Post', 'brighthub' ),
                                'lp_course' => esc_html__('Course', 'brighthub' ),
                                'product' => esc_html__('Product', 'brighthub' ),
                            ],
                        ),
                        array(
                            'name' => 'align',
                            'label' => esc_html__( 'Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
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
                                ]
                            ],
                            'default' => 'left'
                        ),
                        array(
                            'name' => 'space_icon_user',
                            'label' => esc_html__('Space Between Icon & Text(px)', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users' => 'gap: {{VALUE}}px;',
                            ],
                        ),
                        array(
                            'name' => 'space_between_two_items',
                            'label' => esc_html__('Space Between Two Items(px)', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-hasnt-login' => 'gap: {{VALUE}}px;',
                            ],
                        ),
                        
                    ),
                ),
                array(
                    'name' => 'section_style_logged_in',
                    'label' => esc_html__('Style Logged In', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'text_logged_color',
                            'label' => esc_html__('Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__text' => 'color: {{VALUE}};',
                            ],
                        ),
                        
                        array(
                            'name' => 'name_logged_color',
                            'label' => esc_html__('Name Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__text a' => 'color: {{VALUE}};',
                            ],
                        ), 
                        
                        array(
                            'name' => 'text_logged_color_hover',
                            'label' => esc_html__('Name Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__text:hover a' => 'color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'text_typography_loggedin',
                            'label' => esc_html__('Text Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon__users .pxl-item__text',
                        ), 
                        
                        array(
                            'name' => 'name_typography_loggedin',
                            'label' => esc_html__('Name Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon__users .pxl-item__text a',
                        ),
                    ),
                ),

                
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style Login Button', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'text_color',
                            'label' => esc_html__('Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bgr_login_color',
                            'label' => esc_html__('Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'text_color_hover',
                            'label' => esc_html__('Text Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in:hover' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bgr_login_color_hover',
                            'label' => esc_html__('Background Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in:hover' => 'background-color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'text_typography_login',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .btn-user__sign-in',
                        ),
                        array(
                            'name' => 'border_type_login',
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
                                '{{WRAPPER}} .btn-user__sign-in' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width_login',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'border_type_login!' => ''
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_login_color',
                            'label' => esc_html__('Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type_login!' => ''
                            ],
                        ),
                        array(
                            'name' => 'border_login_color_hover',
                            'label' => esc_html__('Border Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in:hover' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type_login!' => ''
                            ],
                        ),

                        array(
                            'name' => 'btn_login_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'btn_login_padding',
                            'label' => esc_html__('Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-in' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),

                array(
                    'name' => 'section_style_register',
                    'label' => esc_html__('Style Register Button', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'text_register_color',
                            'label' => esc_html__('Text Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bgr_register_color',
                            'label' => esc_html__('Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'text_register_color_hover',
                            'label' => esc_html__('Text Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up:hover' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bgr_register_color_hover',
                            'label' => esc_html__('Background Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up:hover' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'text_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .btn-user__sign-up',
                        ),

                        array(
                            'name' => 'border_type',
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
                                '{{WRAPPER}} .btn-user__sign-up' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'border_type!' => ''
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_register_color',
                            'label' => esc_html__('Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type!' => ''
                            ],
                        ),
                        array(
                            'name' => 'border_register_color_hover',
                            'label' => esc_html__('Border Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up:hover' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type!' => ''
                            ],
                        ),

                        array(
                            'name' => 'btn_register_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'btn_register_padding',
                            'label' => esc_html__('padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn-user__sign-up' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_icon',
                    'label' => esc_html__('Style Icon', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Icon Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users i' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_hover',
                            'label' => esc_html__('Icon Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users:hover i' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_size',
                            'label' => esc_html__('Icon Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users:hover i' => 'font-size: {{VALUE}};',
                            ],
                        ),
                        
                    ),
                    'condition' => [
                        'icon_type' => 'icon'
                    ]
                ),

                array(
                    'name' => 'section_style_image',
                    'label' => esc_html__('Style Image', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'image_width',
                            'label' => esc_html__('Image Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__image img' => 'width: {{VALUE}}px;',
                            ],
                        ),
                        
                        array(
                            'name' => 'image_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => [
                        'icon_type' => ['image']
                    ]
                ),

                
                array(
                    'name' => 'section_style_avatar',
                    'label' => esc_html__('Style Avatar', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'avt_width',
                            'label' => esc_html__('Avatar Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '40'
                        ),
                        
                        array(
                            'name' => 'avt_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon__users .pxl-item__avatar img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                    'condition' => [
                        'icon_type' => ['avatar']
                    ]
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);