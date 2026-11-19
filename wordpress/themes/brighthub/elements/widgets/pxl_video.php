<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_video',
        'title' => esc_html__('Case Video', 'brighthub' ),
        'icon' => 'eicon-play case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'magnific-popup'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Layout', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '1' => 'Layout 1',
                            ],
                            'default' => '1',
                        ),
                        array(
                            'name' => 'pxl_icon',
                            'label' => esc_html__('Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'number',
                            'label' => esc_html__('Number', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                        ),
                        array(
                            'name' => 'video_source',
                            'label' => esc_html__('Video Source', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'youtube' => 'YouTube',
                                'vimeo' => 'Vimeo',
                                'self_hosted' => 'Self Hosted',
                                'external' => 'External URL',
                            ],
                            'default' => 'youtube',
                        ),
                        array(
                            'name' => 'video_url',
                            'label' => esc_html__('Video URL', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => esc_html__('Enter YouTube or Vimeo URL, or external video URL', 'brighthub' ),
                            'default' => 'https://www.youtube.com/watch?v=SF4aHwxHtZ0',
                            'condition' => [
                                'video_source' => ['youtube', 'vimeo', 'external'],
                            ],
                        ),
                        array(
                            'name' => 'video_file',
                            'label' => esc_html__('Video URL', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => esc_html__('Enter video file URL', 'brighthub'),
                            'condition' => [
                                'video_source' => 'self_hosted',
                            ],
                        ),
                        array(
                            'name' => 'video_display_type',
                            'label' => esc_html__('Display Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'inline' => 'Inline (Embedded)',
                                'popup' => 'Popup (Lightbox)',
                            ],
                            'default' => 'inline',
                        ),
                        array(
                            'name' => 'autoplay',
                            'label' => esc_html__('Autoplay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'no',
                            'condition' => [
                                'video_display_type' => 'inline',
                            ],
                        ),
                        array(
                            'name' => 'mute',
                            'label' => esc_html__('Mute', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'yes',
                            'condition' => [
                                'video_display_type' => 'inline',
                            ],
                        ),
                        array(
                            'name' => 'loop',
                            'label' => esc_html__('Loop', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'no',
                            'condition' => [
                                'video_display_type' => 'inline',
                            ],
                        ),
                        array(
                            'name' => 'controls',
                            'label' => esc_html__('Show Controls', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'yes',
                            'condition' => [
                                'video_source' => 'self_hosted',
                                'video_display_type' => 'inline',
                            ],
                        ),
                        array(
                            'name' => 'aspect_ratio',
                            'label' => esc_html__('Aspect Ratio', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '16/9' => '16:9',
                                '4/3' => '4:3',
                                '21/9' => '21:9',
                                '9/16' => '9:16 (Vertical)',
                                '1/1' => '1:1 (Square)',
                                'custom' => 'Custom',
                            ],
                            'default' => '16/9',
                            'condition' => [
                                'video_display_type' => 'inline',
                            ],
                        ),
                        array(
                            'name' => 'aspect_ratio_custom',
                            'label' => esc_html__('Custom Aspect Ratio', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => esc_html__('Enter custom aspect ratio (e.g., 16/9, 4/3)', 'brighthub' ),
                            'default' => '16/9',
                            'condition' => [
                                'video_display_type' => 'inline',
                                'aspect_ratio' => 'custom',
                            ],
                        ),
                        array(
                            'name' => 'video_height',
                            'label' => esc_html__('Video Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', 'vh', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 100,
                                    'max' => 2000,
                                    'step' => 10,
                                ],
                                'vh' => [
                                    'min' => 10,
                                    'max' => 100,
                                ],
                                '%' => [
                                    'min' => 10,
                                    'max' => 100,
                                ],
                            ],
                            'default' => [
                                'unit' => 'px',
                            ],
                            'condition' => [
                                'video_display_type' => 'inline',
                                'aspect_ratio' => 'custom',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__wrapper' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'play_button_icon',
                            'label' => esc_html__('Play Button Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                            'default' => [
                                'value' => 'caseicon-play-button',
                                'library' => 'caseicon',
                            ],
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                        ),
                        array(
                            'name' => 'play_button_text',
                            'label' => esc_html__('Play Button Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                        ),
                        array(
                            'name' => 'play_button_position',
                            'label' => esc_html__('Play Button Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'center' => 'Center',
                                'top-left' => 'Top Left',
                                'top-right' => 'Top Right',
                                'bottom-left' => 'Bottom Left',
                                'bottom-right' => 'Bottom Right',
                            ],
                            'default' => 'center',
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'video_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__wrapper, {{WRAPPER}} .pxl-video__wrapper iframe, {{WRAPPER}} .pxl-video__wrapper video' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'video_max_width',
                            'label' => esc_html__('Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'play_button_size',
                            'label' => esc_html__('Play Button Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 20,
                                    'max' => 200,
                                ],
                            ],
                            'default' => [
                                'size' => 80,
                            ],
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__play-button i' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-video__play-button svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'play_button_color',
                            'label' => esc_html__('Play Button Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#ffffff',
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__play-button i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-video__play-button svg' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'play_button_bg',
                            'label' => esc_html__('Play Button Background', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__play-button' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'play_button_border_radius',
                            'label' => esc_html__('Play Button Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 200,
                                ],
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__play-button' => 'border-radius: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'overlay_color',
                            'label' => esc_html__('Overlay Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__overlay' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'overlay_opacity',
                            'label' => esc_html__('Overlay Opacity', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'default' => [
                                'size' => 0,
                            ],
                            'condition' => [
                                'video_display_type' => 'popup',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__overlay' => 'opacity: {{SIZE}}%;',
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
