<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_blob',
        'title' => esc_html__('Case Blob', 'brighthub' ),
        'icon' => 'eicon-anchor case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'blob_color',
                            'label' => esc_html__('Blob Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#3AFFFF',
                        ),
                        array(
                            'name' => 'blob_color_nd',
                            'label' => esc_html__('Blob Color ND', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#01ACAC',
                        ),
                        array(
                            'name' => 'blob_bottom_color',
                            'label' => esc_html__('Blob Bottom Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#000000',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-blob__wrap:after' => 'background: {{VALUE}}',
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