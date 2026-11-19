<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_tags',
        'title' => esc_html__('Case Tags', 'brighthub'),
        'icon' => 'eicon-editor-list-ul case-widget',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'default' => 'Default',
                            ],
                            'default' => 'default',
                        ),
                        array(
                            'name' => 'show_tags',
                            'label' => esc_html__('Show Tags', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'description' => esc_html__('Show tags "#" before each tag', 'brighthub' ),
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'tag_color',
                            'label' => esc_html__('Tag Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tags a' => 'color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'tag_hover_color',
                            'label' => esc_html__('Tag Hover Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tags a:hover' => 'color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'tag_background_color',
                            'label' => esc_html__('Tag Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'separator' => 'before',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tags a' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'tag_hover_background_color',
                            'label' => esc_html__('Tag Hover Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tags a:hover' => 'background-color: {{VALUE}}',
                            ],
                        ),
                        array(
                            'name' => 'tags_typography',
                            'label' => esc_html__('Tags Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'separator' => 'before',
                            'selector' => '{{WRAPPER}} .pxl-tags a',
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);