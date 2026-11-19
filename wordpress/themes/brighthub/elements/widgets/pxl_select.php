<?php
pxl_add_custom_widget(
    array(
        'name'       => 'pxl_select',
        'title'      => esc_html__('Case Select', 'brighthub'),
        'icon'       => 'eicon-select case-widget',
        'categories' => array('pxltheme-core'),
        'params'     => array(
            'sections' => array(
                array(
                    'name'  => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name'   => 'select_list',
                            'label'  => esc_html__('Select Items', 'brighthub'),
                            'type'   => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name'  => 'image',
                                    'label' => esc_html__('Image', 'brighthub'),
                                    'type'  => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name'    => 'select_value',
                                    'label'   => esc_html__('Value (Key)', 'brighthub'),
                                    'type'    => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name'    => 'select_label',
                                    'label'   => esc_html__('Label (Text)', 'brighthub'),
                                    'type'    => \Elementor\Controls_Manager::TEXT,
                                ),
                            ),
                            'title_field' => '{{{ select_label }}}',
                        ),
                        array(
                            'name'    => 'options_position',
                            'label'   => esc_html__('Options Position', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'default' => 'center',
                            'options' => [
                                'left'   => esc_html__('Left', 'brighthub'),
                                'center' => esc_html__('Center', 'brighthub'),
                                'right'  => esc_html__('Right', 'brighthub'),
                            ],
                        ),
                    ),
                ),

                array(
                    'name'  => 'section_style',
                    'label' => esc_html__('Style Current', 'brighthub'),
                    'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name'      => 'current_color',
                            'label'     => esc_html__('Current Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'         => 'current_typography',
                            'label'        => esc_html__('Current Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-selects__current',
                        ),
                        array(
                            'name'      => 'current_bg_color',
                            'label'     => esc_html__('Current Background Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'    => 'current_border_type',
                            'label'   => esc_html__('Current Border Type', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'default' => 'none',
                            'options' => [
                                'none'   => esc_html__('None', 'brighthub'),
                                'solid'  => esc_html__('Solid', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'      => 'current_border_color',
                            'label'     => esc_html__('Current Border Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'current_border_type!' => 'none',
                            ],
                        ),
                        array(
                            'name'      => 'current_border_radius',
                            'label'     => esc_html__('Current Border Radius', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px', '%'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'      => 'current_border_width',
                            'label'     => esc_html__('Current Border Width', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'current_border_type!' => 'none',
                            ],
                        ),
                        array(
                            'name'         => 'current_box_shadow',
                            'label'        => esc_html__('Current Box Shadow', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-selects__current',
                        ),
                        array(
                            'name'      => 'current_padding',
                            'label'     => esc_html__('Current Padding', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px', '%'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__current' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),

                array(
                    'name'  => 'section_style_options',
                    'label' => esc_html__('Style Options', 'brighthub'),
                    'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name'      => 'options_min_width',
                            'label'     => esc_html__('Options Min Width', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range'     => [
                                'px' => ['min' => 0, 'max' => 1200],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'min-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'      => 'options_color',
                            'label'     => esc_html__('Options Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'         => 'options_typography',
                            'label'        => esc_html__('Options Typography', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-selects__option',
                        ),
                        array(
                            'name'      => 'options_bg_color',
                            'label'     => esc_html__('Options Background Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'    => 'options_border_type',
                            'label'   => esc_html__('Options Border Type', 'brighthub'),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'default' => 'none',
                            'options' => [
                                'none'   => esc_html__('None', 'brighthub'),
                                'solid'  => esc_html__('Solid', 'brighthub'),
                                'double' => esc_html__('Double', 'brighthub'),
                                'dotted' => esc_html__('Dotted', 'brighthub'),
                                'dashed' => esc_html__('Dashed', 'brighthub'),
                                'groove' => esc_html__('Groove', 'brighthub'),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name'      => 'options_border_width',
                            'label'     => esc_html__('Options Border Width', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'options_border_type!' => 'none',
                            ],
                        ),
                        array(
                            'name'      => 'options_border_radius',
                            'label'     => esc_html__('Options Border Radius', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px', '%'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'      => 'options_border_color',
                            'label'     => esc_html__('Options Border Color', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'options_border_type!' => 'none',
                            ],
                        ),
                        array(
                            'name'         => 'options_box_shadow',
                            'label'        => esc_html__('Options Box Shadow', 'brighthub'),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-selects__option',
                        ),
                        array(
                            'name'      => 'options_padding',
                            'label'     => esc_html__('Options Padding', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px', '%'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'separator' => 'before',
                        ),
                        array(
                            'name'      => 'options_margin',
                            'label'     => esc_html__('Options Margin', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => ['px', '%'],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name'      => 'options_hover_bg_color',
                            'label'     => esc_html__('Options Hover BG', 'brighthub'),
                            'type'      => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-selects__option:hover' => 'background-color: {{VALUE}};',
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