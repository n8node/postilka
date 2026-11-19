<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_icon_search_popup',
        'title' => esc_html__('Case Search Popup', 'brighthub' ),
        'icon' => 'eicon-search case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'text_search_icon',
                            'label' => esc_html__('Text Search Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'SEARCH',
                        ),
                        array(
                            'name' => 'icon_image_type',
                            'label' => esc_html__('Icon Image Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'img' => 'Image',
                                'ic' => 'Icon',
                            ],
                            'default' => 'img',
                        ),
                        array(
                            'name' => 'pxl_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                            'condition' => [
                                'icon_image_type' => ['ic'],
                            ],
                        ),
                        array(
                            'name' => 'image',
                            'label' => esc_html__( 'Icon Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'icon_image_type' => ['img'],
                            ],
                        ),
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Icon Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button i' => 'color: {{VALUE}} !important;',
                                '{{WRAPPER}} .pxl-search-popup-button svg path' => 'stroke: {{VALUE}} !important;',
                                '{{WRAPPER}} .pxl-search-popup-button svg ' => 'fill: {{VALUE}} !important;',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_hover',
                            'label' => esc_html__('Icon Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button:hover i' => 'color: {{VALUE}} !important;',
                                '{{WRAPPER}} .pxl-search-popup-button:hover svg path' => 'stroke: {{VALUE}} !important;',
                                '{{WRAPPER}} .pxl-search-popup-button:hover svg ' => 'fill: {{VALUE}} !important;',
                            ],
                        ),
                        array(
                            'name' => 'bd_icon_color',
                            'label' => esc_html__('Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button ' => 'border-color: {{VALUE}} !important;',
                            ],
                        ),
                        array(
                            'name' => 'icon_font_size',
                            'label' => esc_html__('Icon Font Size', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-search-popup-button' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-search-popup-button svg' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-default' => 'Default',
                                'style-box' => 'Box',
                                'style-box-bd' => 'Box Border',
                            ],
                            'default' => 'style-default',
                        ),
                        array(
                            'name' => 'box_color',
                            'label' => esc_html__('Box Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button.style-box' => 'background-color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-search-popup-button.style-box-bd' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'style' => ['style-box','style-box-bd'],
                            ],
                        ),
                        array(
                            'name' => 'box_color_hv',
                            'label' => esc_html__('Box Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button.style-box:hover' => 'background-color: {{VALUE}};border-color: {{VALUE}} !important;',
                                '{{WRAPPER}} .pxl-search-popup-button.style-box-bd:hover' => 'background-color: {{VALUE}};border-color: {{VALUE}} !important;',
                            ],
                            'condition' => [
                                'style' => ['style-box','style-box-bd'],
                            ],
                        ),
                        array(
                            'name' => 'box_height',
                            'label' => esc_html__('Box Height', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-search-popup-button.style-box' => 'height: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-search-popup-button.style-box-bd' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => ['style-box','style-box-bd'],
                            ],
                        ),
                        array(
                            'name' => 'box_width',
                            'label' => esc_html__('Box Width', 'brighthub' ),
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
                                '{{WRAPPER}} .pxl-search-popup-button.style-box' => 'width: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-search-popup-button.style-box-bd' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => ['style-box','style-box-bd'],
                            ],
                        ),
                        array(
                            'name' => 'border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-search-popup-button.style-box' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-search-popup-button.style-box-bd' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'style' => ['style-box','style-box-bd'],
                            ],
                        ),
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);

