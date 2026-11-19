<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_step_image',
        'title' => esc_html__('Case Step Image', 'brighthub' ),
        'icon' => 'eicon-image case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'tilt',
            'pxl-tweenmax',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT   ,
                            'options' => [
                                'style-1' => 'Style 1 (Default)',
                                'style-2' => 'Style 2',
                            ],
                            'default' => 'style-1',
                        ),
                        array(
                            'name' => 'step_image',
                            'label' => esc_html__('List Image', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'The number of Images is equal to the number of steps in the Step widget.',
                            'controls' => array(
                                array(
                                    'name' => 'step_image_item',
                                    'label' => esc_html__('Choose Image', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                            ),
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);