<?php
if(class_exists('WPCF7')) {
    $cf7 = get_posts('post_type="wpcf7_contact_form"&numberposts=-1');

    $contact_forms = array();
    if ($cf7) {
        foreach ($cf7 as $cform) {
            $contact_forms[$cform->ID] = $cform->post_title;
        }
    } else {
        $contact_forms[esc_html__('No contact forms found', 'brighthub')] = 0;
    }

    pxl_add_custom_widget(
        array(
            'name' => 'pxl_contact_form',
            'title' => esc_html__('Case Contact Form', 'brighthub'),
            'icon' => 'eicon-form-horizontal case-widget',
            'categories' => array('pxltheme-core'),
            'params' => array(
                'sections' => array(
                    array(
                        'name' => 'tab_content',
                        'label' => esc_html__('Content', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                        'controls' => array(
                            array(
                                'name' => 'form_id',
                                'label' => esc_html__('Select Form', 'brighthub'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => $contact_forms,
                            ),
                            array(
                                'name' => 'style_form',
                                'label' => esc_html__('Style', 'brighthub'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'df' => 'Default',
                                    'style-1' => 'Style 1',
                                    'style-2' => 'Border Bottom Only',
                                    'style-3' => 'Form Home B2B',
                                ],
                                'default' => 'df'
                            ),
                        ),
                    ),
                    array(
                        'name' => 'tab_style_input',
                        'label' => esc_html__('Input', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                        'controls' => array(
                            array(
                                'name' => 'input_typography',
                                'label' => esc_html__('Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight',
                            ),
                            array(
                                'name' => 'input_color',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'input_bg_color',
                                'label' => esc_html__('Background Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'background-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'input_padding',
                                'label' => esc_html__('Padding Input', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):not(.wpcf7-textarea), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name' => 'input_border_radius',
                                'label' => esc_html__('Border Radius', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name'         => 'input_box_shadow',
                                'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight'
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):not(.wpcf7-acceptance), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'border-style: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'border_width',
                                'label' => esc_html__( 'Border Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'border_type!' => '',
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'border_color',
                                'label' => esc_html__( 'Border Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'border-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'border_type!' => '',
                                ],
                            ),
                            array(
                                'name' => 'input_height',
                                'label' => esc_html__('Input Height', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):not(.wpcf7-textarea), {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight' => 'height: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'textarea_height',
                                'label' => esc_html__('Textarea Height', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea' => 'height: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'textarea_padding',
                                'label' => esc_html__('Padding Textarea', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name' => 'textarea_border_type',
                                'label' => esc_html__( 'Textarea Border Type', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea' => 'border-style: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'textarea_border_width',
                                'label' => esc_html__( 'Textarea Border Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'textarea_border_type!' => '',
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'textarea_typography',
                                'label' => esc_html__('Textarea Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea',
                            ),
                            array(
                                'name' => 'textarea_color',
                                'label' => esc_html__('Textarea Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control.wpcf7-textarea' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'input_spacer_bottom',
                                'label' => esc_html__('Item Spacer Bottom', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control-wrap' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_top_position',
                                'label' => esc_html__('Icon Top Position', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'size_units' => [ 'px' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-wrap svg' => 'top: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_left_position',
                                'label' => esc_html__('Icon Left Position', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'size_units' => [ 'px' ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-wrap svg' => 'left: {{SIZE}}{{UNIT}};',
                                ],
                            ),

                        ),
                    ),
                    array(
                        'name' => 'tab_style_input_hover',
                        'label' => esc_html__('Input Hover', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                        'controls' => array(
                            array(
                                'name' => 'input_color_hover',
                                'label' => esc_html__('Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover, {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight:hover, {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight.active' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'input_bg_color_hover',
                                'label' => esc_html__('Background Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover' => 'background-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name'         => 'input_box_shadow_hover',
                                'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover'
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
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover, {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight:hover' => 'border-style: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'border_width_hover',
                                'label' => esc_html__( 'Border Width', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover, {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight:hover' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'border_type_hover!' => '',
                                ],
                                'responsive' => true,
                            ),
                            array(
                                'name' => 'border_color_hover',
                                'label' => esc_html__( 'Border Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form-control:not(.wpcf7-submit):hover, {{WRAPPER}} .pxl-cf7 .pxl-select-higthlight:hover' => 'border-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'border_type_hover!' => '',
                                ],
                            ),
                        ),
                    ),
                    array(
                        'name' => 'tab_style_button',
                        'label' => esc_html__('Button', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                        'controls' => array_merge(
                            array(
                                array(
                                    'name' => 'button_type',
                                    'label' => esc_html__( 'Button Type', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'default' => esc_html__( 'Default', 'brighthub' ),
                                        'button-right' => esc_html__( 'Button Right Input', 'brighthub' ),
                                        'button-left' => esc_html__( 'Button Left Input', 'brighthub' ),
                                        'button-gradient' => esc_html__( 'Button Gradient 3 colors', 'brighthub' ),
                                    ],
                                    'default' => 'default'
                                ),
                                array(
                                    'name' => 'button_gradient_color_1',
                                    'label' => esc_html__( 'Button Gradient Color 1', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'default' => '#957EFC',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => '--gradient-color-1: {{VALUE}};',
                                    ],
                                    'condition' => [
                                        'button_type' => 'button-gradient',
                                    ],
                                ),
                                array(
                                    'name' => 'button_gradient_color_2',
                                    'label' => esc_html__( 'Button Gradient Color 2', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'default' => '#DEB1FF',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => '--gradient-color-2: {{VALUE}};',
                                    ],
                                    'condition' => [
                                        'button_type' => 'button-gradient',
                                    ],
                                ),
                                array(
                                    'name' => 'button_gradient_color_3',
                                    'label' => esc_html__( 'Button Gradient Color 3', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'default' => '#F7F7FB',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => '--gradient-color-3: {{VALUE}};',
                                    ],
                                    'condition' => [
                                        'button_type' => 'button-gradient',
                                    ],
                                ),
                                array(
                                    'name' => 'button_typography',
                                    'label' => esc_html__('Button Typography', 'brighthub' ),
                                    'type' => \Elementor\Group_Control_Typography::get_type(),
                                    'control_type' => 'group',
                                    'selector' => '{{WRAPPER}} .pxl-cf7 .wpcf7-submit, {{WRAPPER}} .pxl-cf7 button',
                                ),
                                array(
                                    'name' => 'button_color',
                                    'label' => esc_html__('Button Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'color: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_color_hover',
                                    'label' => esc_html__('Button Color Hover', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit:hover, {{WRAPPER}} .pxl-cf7 .wpcf7-submit:focus' => 'color: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_icon_color',
                                    'label' => esc_html__('Button Icon Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'separator' => 'before',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit svg' => 'fill: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_icon_color_hv',
                                    'label' => esc_html__('Button Icon Color Hover', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit:hover svg' => 'fill: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_bg_color',
                                    'label' => esc_html__('Button Background Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'separator' => 'before',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'background: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_bg_color_hover',
                                    'label' => esc_html__('Button Background Color Hover', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit:hover, {{WRAPPER}} .pxl-cf7 .wpcf7-submit:focus' => 'background-color: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_padding',
                                    'label' => esc_html__('Padding', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                    'size_units' => [ 'px' ],
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit, {{WRAPPER}} .pxl-cf7 button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                    ],
                                    'control_type' => 'responsive',
                                ),
                                array(
                                    'name' => 'button_margin',
                                    'label' => esc_html__('Margin', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                    'size_units' => [ 'px' ],
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit, {{WRAPPER}} .pxl-cf7 button' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                    ],
                                    'control_type' => 'responsive',
                                ),
                                array(
                                    'name' => 'button_border_radius',
                                    'label' => esc_html__('Border Radius', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                    'size_units' => [ 'px' ],
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit, {{WRAPPER}} .pxl-cf7 button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                    ],
                                    'control_type' => 'responsive',
                                ),
                                array(
                                    'name'         => 'button_box_shadow',
                                    'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                                    'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                    'control_type' => 'group',
                                    'selector'     => '{{WRAPPER}} .pxl-cf7 .wpcf7-submit, {{WRAPPER}} .pxl-cf7 button'
                                ),
                                array(
                                    'name' => 'button_border_type',
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
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'border-style: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'button_border_width',
                                    'label' => esc_html__( 'Border Width', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                    ],
                                    'condition' => [
                                        'button_border_type!' => '',
                                    ],
                                    'responsive' => true,
                                ),
                                array(
                                    'name' => 'button_border_color',
                                    'label' => esc_html__( 'Border Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'default' => '',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'border-color: {{VALUE}};',
                                    ],
                                    'condition' => [
                                        'button_border_type!' => '',
                                    ],
                                ),
                                array(
                                    'name' => 'btn_width',
                                    'label' => esc_html__( 'Width', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'pxl-cf7__btn-auto' => 'Auto',
                                        'pxl-cf7__btn-full' => '100%',
                                    ],
                                    'default' => 'pxl-cf7__btn-auto',
                                ),
                                array(
                                    'name' => 'btn_spacer_top',
                                    'label' => esc_html__('Spacer Top', 'brighthub' ),
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
                                        '{{WRAPPER}} .pxl-cf7 .wpcf7-submit' => 'margin-top: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                            ),
                        ),
                    ),

                    brighthub_widget_animation_settings(),

                    array(
                        'name' => 'extra',
                        'label' => esc_html__('Extra', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                        'controls' => array(
                            array(
                                'name' => 'f_width',
                                'label' => esc_html__('Form Max Width', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7' => 'max-width: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'notification_color',
                                'label' => esc_html__('Notification Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-form .wpcf7-response-output' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'validate_color',
                                'label' => esc_html__('Validate Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .wpcf7-not-valid-tip' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'label_color',
                                'label' => esc_html__('Label Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .pxl--item > label, {{WRAPPER}} .pxl-cf7 .pxl--item .pxl-form--label' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'label_typography',
                                'label' => esc_html__('Label Typography', 'brighthub' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-cf7 .pxl--item > label, {{WRAPPER}} .pxl-cf7 .pxl--item .pxl-form--label',
                            ),
                            array(
                                'name' => 'label_spacer_bottom',
                                'label' => esc_html__('Label Spacer Bottom', 'brighthub' ),
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
                                    '{{WRAPPER}} .pxl-cf7 .pxl--item > label, {{WRAPPER}} .pxl-cf7 .pxl--item .pxl-form--label' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_color',
                                'label' => esc_html__('Icon Color', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .pxl--form-icon' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'icon_space',
                                'label' => esc_html__('Icon Spacer', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => [ 'px' ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-cf7 .pxl--form-icon' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name'         => 'radio_box_shadow',
                                'label' => esc_html__( 'Radio Box Shadow', 'brighthub' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-cf7 .pxl-radio--button .wpcf7-radio .wpcf7-list-item [type="radio"]:checked + .wpcf7-list-item-label',
                            ),
                        ),
                    ),
                ),
            ),
        ),
        brighthub_get_class_widget_path()
    );
}