<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_wave',
        'title' => esc_html__('Case Wave', 'brighthub' ),
        'icon' => 'eicon-posts-ticker case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'wave_color',
                            'label' => esc_html__('Wave Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);