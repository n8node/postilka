<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_table',
        'title' => esc_html__('Case Table', 'brighthub'),
        'icon' => 'eicon-table case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-table',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'row',
                            'label' => esc_html__('Title Row', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'column',
                            'label' => esc_html__('Title Column', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'res_type',
                            'label' => esc_html__('Responsive Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'row'    => esc_html__('Row', 'brighthub'),
                                'column'    => esc_html__('Column', 'brighthub'),
                            ],
                            'default' => 'row',
                            'description' => 'Work when Title Row and Title Column on!'
                        ),
                        array(
                            'name' => 'res_screen',
                            'label' => esc_html__('Responsive When', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1600'    => esc_html__('1600', 'brighthub'),
                                '1400'    => esc_html__('1400', 'brighthub'),
                                '1200'    => esc_html__('1200', 'brighthub'),
                                '1024'    => esc_html__('1024', 'brighthub'),
                                '991'    => esc_html__('991', 'brighthub'),
                                '767'    => esc_html__('767', 'brighthub'),
                                '676'    => esc_html__('676', 'brighthub'),
                                '575'    => esc_html__('575', 'brighthub'),
                                '320'    => esc_html__('320', 'brighthub'),
                            ],
                            'default' => '767',
                        ),
                        array(
                            'name' => 'table',
                            'label' => esc_html__('Table Content', 'brighthub'),
                            'type' => 'pxl_table',
                            'rows' => 3, 
                            'cols' => 3, 
                            'first_row_as_header' => true, 
                            'button_text' => esc_html__('Add Row', 'brighthub'),
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);