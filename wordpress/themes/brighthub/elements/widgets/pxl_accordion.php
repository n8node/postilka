<?php
$templates = brighthub_get_templates_option('accordion', []) ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_accordion',
        'title' => esc_html__('Case Accordion', 'brighthub' ),
        'icon' => 'eicon-accordion case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-accordion',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Layout', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Default',
                                '2' => 'Tabs FAQs',
                                '3' => 'Shop Single',
                                '4' => 'Template',
                            ],
                            'default' => '1',
                        ),
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Default',
                                'style-2' => 'Style 2 (Background Dark)',
                                'style-3' => 'Style 3',
                                'style-4' => 'Style 4',
                                'style-5' => 'Style 5 (Background Dark)',
                                'style-6' => 'Style 6 (Orange Number)',
                            ],
                            'default' => 'style-1',
                            'condition' => [
                                'layout' => ['1']
                            ]
                        ),
                        array(
                            'name' => 'active',
                            'label' => esc_html__('Active', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'separator' => 'after',
                            'default' => '1',
                        ),
                        array(
                            'name' => 'accordion',
                            'label' => esc_html__('Accordion', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'desc',
                                    'label' => esc_html__('Content', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                ),
                                array(
                                    'name' => 'pxl_icon',
                                    'label' => esc_html__('Icon', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'number',
                                    'label' => esc_html__('Number', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                            'separator' => 'after',
                            'condition' => [
                                'layout' => ['1', '3']
                            ]
                        ),
                        array(
                            'name' => 'accordion_l2',
                            'label' => esc_html__('Accordion', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'tit_l2',
                                    'label' => esc_html__('Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'desc_l2',
                                    'label' => esc_html__('Content', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                ),
                                array(
                                    'name' => 'fea_l2',
                                    'label' => esc_html__('Feature', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                    'default' => '<li>Feature 1</li> <li>Feature 2</li> <li>Feature 3</li>',
                                ),
                                array(
                                    'name' => 'ques_l2',
                                    'label' => esc_html__('Question', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'url_txt_l2',
                                    'label' => esc_html__('Url Text', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'url_l2',
                                    'label' => esc_html__('Url Link', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ tit_l2 }}}',
                            'separator' => 'after',
                            'condition' => [
                                'layout' => '2'
                            ]
                        ),
                        array(
                            'name' => 'accordion_l4',
                            'label' => esc_html__('Accordion', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'tit_l4',
                                    'label' => esc_html__('Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'accordion_template',
                                    'label' => esc_html__('Select Template', 'brighthub'),
                                    'type' => 'select',
                                    'options' => $templates,
                                    'default' => 'df',
                                    'description' => 'Add new accordion template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=accordion&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                                ),
                            ),
                            'title_field' => '{{{ tit_l4 }}}',
                            'separator' => 'after',
                            'condition' => [
                                'layout' => '4'
                            ]
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_box',
                    'label' => esc_html__('Box', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'box_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'         => 'btn_shadow',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-accordion__item',
                        ),
                        array(
                            'name' => 'hide_overlay',
                            'label' => esc_html__( 'Hide Overlay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
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
                            'condition' => [
                                'style' => ['style-5']
                            ],
                        ),
                        array(
                            'name' => 'pxl_background_reveal_extra_light_pos',
                            'label' => esc_html__('Background Reveal Extra Light Position', 'brighthub'),
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
                            ],
                            'default' => 'none',
                            'condition' => [
                                'style' => ['style-5']
                            ],
                        ),
                        array(
                            'name' => 'pxl_background_reveal_extra_light_color',
                            'label' => esc_html__('Background Reveal Extra Light Color', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-background-reveal-extra-light' => '--color-extra-light: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['style-5']
                            ],
                        ),
                        array(
                            'name' => 'box_border_type',
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
                                '{{WRAPPER}} .pxl-accordion__item' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'box_border_width',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'box_border_color',
                            'label' => esc_html__( 'Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item' => 'border-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'box_border__active_color',
                            'label' => esc_html__( 'Border Active Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item.active' => 'border-color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'bgr_color',
                            'label' => esc_html__( 'Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bgr_active_color',
                            'label' => esc_html__( 'Background Active Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item.active' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        
                        array(
                            'name' => 'box_bdr_blur',
                            'label' => esc_html__( 'Backdrop Filter Blur', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item' => 'backdrop-filter: blur({{SIZE}}px);',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item-title' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-accordion__item-action:before' => 'background-color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-accordion__item-action:after' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color_active',
                            'label' => esc_html__('Color Active', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item.active .pxl-accordion__item-title' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-accordion__item.active .pxl-accordion__item-action:before' => 'background-color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-accordion__item.active .pxl-accordion__item-action:after' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-accordion__item-title',
                        ),
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
                    ),
                ),
                array(
                    'name' => 'section_style_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'content_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item-content' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'content_color_active',
                            'label' => esc_html__('Color Active', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-accordion__item.active .pxl-accordion__item-content' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'desc_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-accordion__item-content',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);