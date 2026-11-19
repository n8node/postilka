<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_career_info',
        'title' => esc_html__('Case Career Infomation', 'brighthub'),
        'icon' => 'eicon-posts-ticker case-widget',
        'categories' => array('pxltheme-core'),
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
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_career_info/layout-1.jpg'
                                ], 
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'brighthub' ),
                                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_career_info/layout-2.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_layout_1',
                    'label' => esc_html__('Layout', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => ['layout' => '1'],
                    'controls' => array(
                        array(
                            'name' => 'show_pos',
                            'label' => esc_html__('Show Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_time',
                            'label' => esc_html__('Show Time', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_slot',
                            'label' => esc_html__('Show Slot', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_type',
                            'label' => esc_html__('Show Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_team',
                            'label' => esc_html__('Show Team', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_location',
                            'label' => esc_html__('Show Location', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'show_salary',
                            'label' => esc_html__('Show Salary', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_layout_2',
                    'label' => esc_html__('Layout', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => ['layout' => '2'],
                    'controls' => array(
                        array(
                            'name' => 'title_2',
                            'label' => esc_html__('Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Job Overview',
                        ),
                        array(
                            'name' => 'show_pos_2',
                            'label' => esc_html__('Show Position', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'position_title_2',
                            'label' => esc_html__('Position Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Position',
                            'condition' => ['show_pos_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_time_2',
                            'label' => esc_html__('Show Time Posted', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'time_title_2',
                            'label' => esc_html__('Posted Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Posted',
                            'condition' => ['show_time_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_slot_2',
                            'label' => esc_html__('Show Slot', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'slot_title_2',
                            'label' => esc_html__('Slot Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Slot',
                            'condition' => ['show_slot_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_type_2',
                            'label' => esc_html__('Show Type', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'type_title_2',
                            'label' => esc_html__('Type Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Type',
                            'condition' => ['show_type_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_team_2',
                            'label' => esc_html__('Show Team', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'team_title_2',
                            'label' => esc_html__('Team Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Team',
                            'condition' => ['show_team_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_location_2',
                            'label' => esc_html__('Show Location', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'location_title_2',
                            'label' => esc_html__('Location Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Location',
                            'condition' => ['show_location_2' => 'true'],
                            'separator' => 'after'
                        ),
                        array(
                            'name' => 'show_salary_2',
                            'label' => esc_html__('Show Salary', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'salary_title_2',
                            'label' => esc_html__('Salary Title', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Salary',
                            'condition' => ['show_salary_2' => 'true'],
                            'separator' => 'after'
                        ),
                    ),
                ),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);