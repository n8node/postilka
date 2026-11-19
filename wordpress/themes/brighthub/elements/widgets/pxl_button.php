<?php
$templates_df = ['0' => esc_html__('None', 'brighthub')];
$templates = $templates_df + brighthub_get_templates_option('page') ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_button',
        'title' => esc_html__('Case Button', 'brighthub' ),
        'icon' => 'eicon-button case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'btn_style',
                            'label' => esc_html__('Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'btn-default',
                            'options' => [
                                'btn-default' => esc_html__('Default', 'brighthub' ),
                                'btn-primary' => esc_html__('Primary', 'brighthub' ),
                                'btn-secondary' => esc_html__('Secondary', 'brighthub' ),
                                'btn-white' => esc_html__('White', 'brighthub' ),                                
                                'btn__linear-blur' => esc_html__('Linear Background Gradient Blur', 'brighthub' ),
                                'btn__linear-blur-2' => esc_html__('Linear Background Gradient Blur 2', 'brighthub' ),
                                'btn-transparent' => esc_html__('Transparent', 'brighthub' ),
                                'btn-mix-blend-mode-light' => esc_html__('Mix Blend Mode Light', 'brighthub' ),
                                'btn-mix-blend-mode-dark' => esc_html__('Mix Blend Mode Dark', 'brighthub' ),
                                'btn-blur' => esc_html__('Background Blur', 'brighthub' ),
                                'btn-gradient-3colors' => esc_html__('Gradient 3 Colors', 'brighthub' ),
                                'btn-text-outline' => esc_html__('Text Outline', 'brighthub' ),
                                'btn-border-bottom-gradient' => esc_html__('Border Bottom Gradient', 'brighthub' ),
                                'light' => esc_html__('Light', 'brighthub' ),
                                'shadow-inset' => esc_html__('Shadow Inset', 'brighthub' ),
                            ],
                        ),

                        array(
                            'name' => 'btn_rotate_button',
                            'label' => esc_html__('Rotate Button', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                            'condition' => [
                                'btn_style' => ['light'],
                            ],
                        ),

                        array(
                            'name' => 'style_rotate_button',
                            'label' => esc_html__('Style Rotate Button', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'both',
                            'options' => [
                                'both' => esc_html__('Line and Light', 'brighthub' ),
                                'light' => esc_html__('Light', 'brighthub' ),
                                'line-only' => esc_html__('Line Only', 'brighthub' ),
                            ],
                            'condition' => [
                                'btn_rotate_button' => 'true',
                            ],
                        ),
                        
                        array(
                            'name' => 'btn_gradient_blur_2_color_1',
                            'label' => esc_html__('Gradient Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#6248FF',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-1: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2', 'btn-gradient-3colors', 'btn-border-bottom-gradient'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_color_2',
                            'label' => esc_html__('Gradient Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#6B49F6',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-2: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2', 'btn-gradient-3colors', 'btn-border-bottom-gradient'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_color_3',
                            'label' => esc_html__('Gradient Color 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#9049CD',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-3: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2', 'btn-gradient-3colors'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_color_4',
                            'label' => esc_html__('Gradient Color 4', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#C44A92',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-4: {{VALUE}};',      
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_color_5',
                            'label' => esc_html__('Gradient Color 5', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#0478CE', 
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-5: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),

                        array(
                            'name' => 'btn_gradient_blur_2_hv_color_1',
                            'label' => esc_html__('Hover Gradient Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#577590',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-6: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_hv_color_2',
                            'label' => esc_html__('Hover Gradient Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#43aa8b',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-7: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_hv_color_3',
                            'label' => esc_html__('Hover Gradient Color 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#90be6d',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-8: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_hv_color_4',
                            'label' => esc_html__('Hover Gradient Color 4', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#f9c74f',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-9: {{VALUE}};',      
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),
                        array(
                            'name' => 'btn_gradient_blur_2_hv_color_5',
                            'label' => esc_html__('Hover Gradient Color 5', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#f3722c', 
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button' => '--gradient-color-10: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn__linear-blur', 'btn__linear-blur-2'],
                            ],
                        ),

                        // gradient blur 2 
                        array(
                            'name' => 'btn_hover_animation',
                            'label' => esc_html__('Hover Animation', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'btn-hv-default',
                            'options' => [
                                'btn-hv-default' => esc_html__('Default', 'brighthub' ),
                                'btn-hv-shake' => esc_html__('Shake', 'brighthub' ),
                                'btn-hv-icon-to-right' => esc_html__('Icon to Right', 'brighthub' ),
                                'btn-hv-icon-to-left' => esc_html__('Icon to Left', 'brighthub' ),
                                'btn-hv-icon-to-top' => esc_html__('Icon to Top', 'brighthub' ),
                                'btn-hv-icon-to-bottom' => esc_html__('Icon to Bottom', 'brighthub' ),
                                'btn-hv-icon-to-top-right' => esc_html__('Icon to Top Right', 'brighthub' ),
                                'btn-hv-icon-to-bottom-right' => esc_html__('Icon to Bottom Right', 'brighthub' ),
                                'btn-hv-icon-to-bottom-left' => esc_html__('Icon to Bottom Left', 'brighthub' ),
                                'btn-hv-icon-to-top-left' => esc_html__('Icon to Top Left', 'brighthub' ),
                                'btn-hv-icon-on-press' => esc_html__('Icon on Press', 'brighthub' ),
                            ],
                        ),
                        array(
                            'name' => 'btn_glossy',
                            'label' => esc_html__('Glossy', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),

                        array(
                            'name' => 'btn_arrow_target',
                            'label' => esc_html__('Arrow Target', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),

                        array(
                            'name' => 'btn_arrow_target_type',
                            'label' => esc_html__('Arrow Target Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'arrow',
                            'options' => [
                                'none' => esc_html__('None', 'brighthub' ),
                                'arrow' => esc_html__('Arrow', 'brighthub' ),
                                'cursor' => esc_html__('Cursor', 'brighthub' ),
                                'custom' => esc_html__('Custom', 'brighthub' ),
                            ],
                            'condition' => [
                                'btn_arrow_target' => 'true',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_custom_position',
                            'label' => esc_html__('Arrow Target Custom Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'top',
                            'options' => [
                                'top-left' => esc_html__('Top Left', 'brighthub' ),
                                'top-right' => esc_html__('Top Right', 'brighthub' ),
                                'bottom-left' => esc_html__('Bottom Left', 'brighthub' ),
                                'bottom-right' => esc_html__('Bottom Right', 'brighthub' ),                                
                            ],
                            'condition' => [
                                'btn_arrow_target' => 'true',
                                'btn_arrow_target_type' => 'custom',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_top',
                            'label' => esc_html__('Arrow Target Top', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => -1000,
                                    'max' => 1000,
                                ],
                            ],
                            'condition' => [
                                'btn_arrow_target_type' => 'custom',
                                'btn_arrow_target_custom_position' => ['top-left', 'top-right'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button__arrow-target' => 'top: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_left',
                            'label' => esc_html__('Arrow Target Left', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => -1000,
                                    'max' => 1000,
                                ],
                            ],
                            'condition' => [
                                'btn_arrow_target_type' => 'custom',
                                'btn_arrow_target_custom_position' => ['top-left', 'bottom-left'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button__arrow-target' => 'left: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_bottom',
                            'label' => esc_html__('Arrow Target Bottom', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => -1000,
                                    'max' => 1000,
                                ],
                            ],
                            'condition' => [
                                'btn_arrow_target_type' => 'custom',
                                'btn_arrow_target_custom_position' => ['bottom-left', 'bottom-right'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button__arrow-target' => 'bottom: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_right',
                            'label' => esc_html__('Arrow Target Right', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => -1000,
                                    'max' => 1000,
                                ],
                            ],
                            'condition' => [
                                'btn_arrow_target_type' => 'custom',
                                'btn_arrow_target_custom_position' => ['top-right', 'bottom-right'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button__arrow-target' => 'right: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_arrow_target_icon',
                            'label' => esc_html__('Arrow Target Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'condition' => [
                                'btn_arrow_target_type' => 'custom',
                            ],
                        ),

                        array(
                            'name' => 'btn_space_between',
                            'label' => esc_html__('Space Between', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'text',
                            'label' => esc_html__('Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => esc_html__('Click Here', 'brighthub'),
                        ),
                        array(
                            'name' => 'btn_action',
                            'label' => esc_html__('Action', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'btn__link' => esc_html__('Link', 'brighthub' ),
                                'btn__popup' => esc_html__('Popup', 'brighthub' ),
                                'btn__popup-video' => esc_html__('Popup Video', 'brighthub' ),
                            ],
                            'default' => 'btn__link',
                            'separator' => 'before',
                        ),
                        array(
                            'name' => 'link',
                            'label' => esc_html__('Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                            'default' => [
                                'url' => '#',
                            ],
                            'condition' => [
                                'btn_action' => ['btn__link', 'btn__popup-video'],
                            ],
                        ),
                        array(
                            'name' => 'btn_offset',
                            'label' => esc_html__('Offset', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'condition' => [
                                'btn_action' => ['btn__link'],
                            ],
                        ),

                        array(
                            'name' => 'popup_template',                             
                            'type' => 'select',
                            'options' => $templates,
                            'default' => 'df',
                            'description' => 'Add new type Page template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>"',
                            'condition' => [
                                'btn_action' => ['btn__popup'],
                            ],
                        ),

                        array(
                            'name' => 'align',
                            'label' => esc_html__('Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left'    => [
                                    'title' => esc_html__('Left', 'brighthub' ),
                                    'icon' => 'fa fa-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'brighthub' ),
                                    'icon' => 'fa fa-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'brighthub' ),
                                    'icon' => 'fa fa-align-right',
                                ],
                                'justify' => [
                                    'title' => esc_html__('Justified', 'brighthub' ),
                                    'icon' => 'fa fa-align-justify',
                                ],
                            ],
                            'prefix_class' => 'elementor-align-',
                            'default' => '',
                            'selectors'         => [
                                '{{WRAPPER}} .pxl-button' => 'text-align: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'btn_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'label_block' => true,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'btn_icon_image',
                            'label' => esc_html__('Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'icon_align',
                            'label' => esc_html__('Icon Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'left',
                            'options' => [
                                'left' => esc_html__('Before', 'brighthub' ),
                                'right' => esc_html__('After', 'brighthub' ),
                            ],
                        ),
                    ),
                ),

                array(
                    'name' => 'section_style_button',
                    'label' => esc_html__('Button Normal', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'color',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'btn_background_type',
                                'label' => esc_html__('Background Type', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'default' => esc_html__('Default', 'brighthub' ),
                                    'gradient' => esc_html__('Gradient', 'brighthub' ),
                                ],
                                'default' => 'default',
                            ),
                            array(
                                'name' => 'btn_bg_color',
                                'label' => esc_html__('Background Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'background-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'btn_background_type' => 'default',
                                ],
                            ),
                            array(
                                'name'         => 'btn_gradient',
                                'label' => esc_html__( 'Background Type', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Background::get_type(),
                                'control_type' => 'group',
                                'types' => [ 'gradient' ],
                                'selector'     => '{{WRAPPER}} .pxl-button .btn',
                                'condition' => [
                                    'btn_background_type' => 'gradient',
                                ],
                            ),
                            array(
                                'name' => 'btn_typography',
                                'label' => esc_html__('Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-button .btn',
                            ),
                            array(
                                'name'         => 'btn_box_shadow',
                                'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-button .btn',
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
                                    '{{WRAPPER}} .pxl-button .btn' => 'border-style: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'border_width',
                                'label' => esc_html__( 'Border Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'border_color',
                                'label' => esc_html__( 'Border Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'border-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'button_bdr_blur',
                                'label' => esc_html__( 'Backdrop Filter Blur', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'backdrop-filter: blur({{SIZE}}px);',
                                ],
                            ),
                        ),

                        array(
                            array(
                                'name' => 'btn_border_radius',
                                'label' => esc_html__('Border Radius', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'control_type' => 'responsive',
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn, {{WRAPPER}} .pxl-button__linear-blur' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'btn_padding',
                                'label' => esc_html__('Padding', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name' => 'text_inner_margin',
                                'label' => esc_html__('Text Inner Margin', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-button .btn .btn-text' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                        )
                    ),
                ),

                array(
                    'name' => 'section_style_button_hover',
                    'label' => esc_html__('Button Hover', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'color_hover',
                            'label' => esc_html__('Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn:hover, {{WRAPPER}} .pxl-button .btn:focus' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'btn_bg_color_hover',
                            'label' => esc_html__('Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn:hover, {{WRAPPER}} .pxl-button .btn:focus' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style!' => ['btn-text-underline','btn-gradient-rotate','btn-gradient-horizontal','btn-gradient-horizontal2'],
                            ],
                        ),
                        array(
                            'name' => 'border_type_hover',
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
                                '{{WRAPPER}} .pxl-button .btn:hover' => 'border-style: {{VALUE}};',
                            ],
                            'condition' => [
                                'btn_style' => ['btn-default'],
                            ],
                        ),
                        array(
                            'name' => 'border_width_hover',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn:hover' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'border_type_hover!' => '',
                                'btn_style' => ['btn-default'],
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color_hover',
                            'label' => esc_html__( 'Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn:hover' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type_hover!' => '',
                                'btn_style' => ['btn-default'],
                            ],
                        ),

                        array(
                            'name' => 'btn_border_radius_hover',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn:hover, {{WRAPPER}} .pxl-button .btn:focus' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name'         => 'btn_box_shadow_hover',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-button .btn:hover, {{WRAPPER}} .pxl-button .btn:focus',
                        ),

                        array(
                            'name' => 'btn_text_effect',
                            'label' => esc_html__('Text Effect', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '',
                            'options' => [
                                '' => esc_html__('Default', 'brighthub' ),
                                'btn-text-nina' => esc_html__('Nina', 'brighthub' ),
                                'btn-text-nanuk' => esc_html__('Nanuk', 'brighthub' ),
                                'btn-text-parallax' => esc_html__('Parallax', 'brighthub' ),
                            ],
                        ),
                    ),
                ),

                array(
                    'name' => 'section_style_icon',
                    'label' => esc_html__('Icon', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn .btn-icon' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_svg',
                            'label' => esc_html__('Color SVG', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn .btn-icon svg' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_svg_path',
                            'label' => esc_html__('Color SVG Fill Path', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn .btn-icon svg path' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_font_size',
                            'label' => esc_html__('Font Size', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-button .btn .btn-icon' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-button .btn svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}',
                            ],
                        ),
                        array(
                            'name' => 'icon_image_size',
                            'label' => esc_html__('Image Size', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-button .btn .btn-icon' => 'width: {{SIZE}}{{UNIT}}; height: auto;',
                            ],
                        ),
                        array(
                            'name' => 'icon_space_left',
                            'label' => esc_html__('Icon Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'default' => [
                                'size' => 9,
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn-icon' => 'margin-right: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'icon_align' => ['left'],
                            ],
                        ),
                        array(
                            'name' => 'icon_space_right',
                            'label' => esc_html__('Icon Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'default' => [
                                'size' => 9,
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-button .btn__icon-right .btn-icon' => 'margin-left: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'icon_align' => ['right'],
                            ],
                        ),
                        array(
                            'name' => 'icon_box_color',
                            'label' => esc_html__( 'Box Color Main', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'background-color: {{VALUE}};--gradient-color-from2: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_box_width',
                            'label' => esc_html__('Box Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_box_height',
                            'label' => esc_html__('Box Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_padding',
                            'label' => esc_html__('Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'Padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'icon_margin',
                            'label' => esc_html__('Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .btn.btn__icon-active .btn-icon' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'control_type' => 'responsive',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);