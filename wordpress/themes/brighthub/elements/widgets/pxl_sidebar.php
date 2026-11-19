<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_sidebar',
        'title' => esc_html__('Case Sidebar', 'brighthub' ),
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
                            'name' => 'sidebar_type',
                            'label' => esc_html__('Sidebar Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none' => esc_html__('None', 'brighthub' ),
                                'sidebar-blog' => esc_html__('Blog Sidebar', 'brighthub' ),
                                'sidebar-page' => esc_html__('Page Sidebar', 'brighthub' ),
                                'sidebar-career' => esc_html__('Career Sidebar', 'brighthub' ),
                                'sidebar-shop' => esc_html__('Shop Sidebar', 'brighthub' ),
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