<?php
$templates = brighthub_get_templates_option('tab', []) ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_office_info',
        'title' => esc_html__('Case Office Infomation', 'brighthub' ),
        'icon' => 'eicon-accordion case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'brighthub-map'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'image',
                            'label' => esc_html__('Choose Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'description' => 'Select Image Maping'
                        ),
                        array(
                            'name' => 'office',
                            'label' => esc_html__('Office', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Position', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'image_flag',
                                    'label' => esc_html__('Flag', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                    'description' => 'Select flag or image to create position map',
                                ),
                                array(
                                    'name' => 'top_pos',
                                    'label' => esc_html__('Top', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'size_units' => [ '%' ],
                                    'control_type' => 'responsive',
                                    'range' => [
                                        '%' => [
                                            'min' => 0,
                                            'max' => 100,
                                            'step' => 0.1
                                        ],
                                    ],
                                    'selectors' => array(
                                        '{{WRAPPER}} .pxl-office {{CURRENT_ITEM}}' => 'top: {{SIZE}}%;',
                                    ),
                                ),
                                array(
                                    'name' => 'left_pos',
                                    'label' => esc_html__('Left', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'size_units' => [ '%' ],
                                    'control_type' => 'responsive',
                                    'range' => [
                                        '%' => [
                                            'min' => 0,
                                            'max' => 100,
                                            'step' => 0.1
                                        ],
                                    ],
                                    'selectors' => array(
                                        '{{WRAPPER}} .pxl-office {{CURRENT_ITEM}}' => 'left: {{SIZE}}%;',
                                    ),
                                ),
                                array(
                                    'name' => 'icon_color',
                                    'label' => esc_html__('Color', 'brighthub'),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'selectors' => array(
                                        '{{WRAPPER}} .pxl-office {{CURRENT_ITEM}} svg ellipse' => 'fill: {{VALUE}} !important;',
                                        '{{WRAPPER}} .pxl-office {{CURRENT_ITEM}} svg path' => 'fill: {{VALUE}} !important;',
                                    ),
                                ),
                                array(
                                    'name' => 'content_template',
                                    'label' => esc_html__('Select Template', 'brighthub'),
                                    'type' => 'select',
                                    'options' => $templates,
                                    'default' => 'df',
                                    'description' => 'Add new "Tab" template: "<a href="' . esc_url(admin_url('edit.php?post_type=pxl-template')) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url(admin_url('edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1')) . '" target="_blank">Here.</a>"',
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                            'separator' => 'after',
                        ),
                        
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);