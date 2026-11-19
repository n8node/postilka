<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_select_change_counter_value',
        'title' => esc_html__('Case Select Change Counter Value', 'brighthub' ),
        'icon' => 'eicon-number-field case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_item',
                            'label' => esc_html__('Active Item', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '1',
                        ),
                        array(
                            'name' => 'select_change_counter_value_list',
                            'label' => esc_html__('Select Value', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'select_key',
                                    'label' => esc_html__('Key', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'default' => '1 day',
                                ),
                                array(
                                    'name' => 'select_value',
                                    'label' => esc_html__('Value', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'default' => '12450',
                                ),
                            ),
                            'title_field' => '{{{ select_key }}}',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
 0            ),
        ),
    ),
    brighthub_get_class_widget_path()
);