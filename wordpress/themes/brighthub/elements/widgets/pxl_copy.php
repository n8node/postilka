<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_copy',
        'title' => esc_html__('Case Copy', 'brighthub' ),
        'icon' => 'eicon-copy case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'copy_text',
                            'label' => esc_html__('Copy Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'copy_suc_text',
                            'label' => esc_html__('Copy Success Text', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);