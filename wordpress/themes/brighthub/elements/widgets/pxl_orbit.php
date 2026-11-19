<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_orbit',
        'title' => esc_html__('Case Orbit User', 'brighthub'),
        'icon' => 'eicon-posts-ticker case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_layout',
                    'label' => esc_html__('Layout', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Templates', 'brighthub' ),
                            'type' => 'layoutcontrol',
                            'default' => '1',
                            'options' => [
                                '1' => [
                                    'label' => esc_html__('Layout 1', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_orbit/layout-1.jpg'
                                ], 
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'favicon',
                            'label' => esc_html__('Favicon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'list_user',
                            'label' => esc_html__('List User', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'user_image',
                                    'label' => esc_html__('User Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'user_flag',
                                    'label' => esc_html__('Flag', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'label_block' => true,
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);