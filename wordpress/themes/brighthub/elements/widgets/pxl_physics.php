<?php
// Register Button Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_physics',
        'title' => esc_html__('Case Physics', 'brighthub' ),
        'icon' => 'eicon-meta-data case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-physics',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'source_section',
                    'label' => esc_html__('Source Settings', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'texts',
                            'label' => esc_html__('List', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'text',
                                    'label' => esc_html__('Text', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'color',
                                    'label' => esc_html__('Color', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}} .pxl-physics-item__text' => 'color: {{VALUE}}',
                                    ],
                                ),
                                array(
                                    'name' => 'background',
                                    'label' => esc_html__('Background', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}} .pxl-physics-item__text' => 'background-color: {{VALUE}}',
                                    ],
                                ),
                            ),
                            'title_field' => '{{{ text }}}',
                        ),
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);