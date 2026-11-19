<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_speed',
        'title' => esc_html__('Case Speed', 'brighthub'),
        'icon' => 'eicon-library-import case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'lists',
                            'label' => esc_html__('Content', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Title', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'rows' => 10,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'speed',
                                    'label' => esc_html__('Speed', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'default' => 100,
                                ),
                                array(
                                    'name' => 'unit',
                                    'label' => esc_html__('Unit', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'default' => 'ms',
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);