<?php
// Register Video Player Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_video_player',
        'title' => esc_html__('Case Video Button', 'brighthub' ),
        'icon' => 'eicon-play case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'tilt'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'video_link',
                            'label' => esc_html__('Video Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'https://www.youtube.com/watch?v=vqXLGX0szIQ',
                            'description' => esc_html__('Enter the video link (e.g. https://www.youtube.com/watch?v=vqXLGX0szIQ).', 'brighthub' ),
                        ),
                        array(
                            'name' => 'video_link_demo_type',
                            'label' => esc_html__('Link Demo Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'youtube' => 'Youtube',
                                'video-upload' => 'Video Upload',
                            ],
                            'default' => 'youtube',
                        ),
                        array(
                            'name' => 'video_link_demo_before',
                            'label' => esc_html__('Link Demo Youtube', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'https://www.youtube.com/watch?v=Z5cuCDED1gQ',
                            'condition' => [
                                'video_link_demo_type' => 'youtube',
                            ],
                        ),
                        array(
                            'name' => 'video_link_demo_upload',
                            'label' => esc_html__('Demo Upload', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'video_link_demo_type' => 'video-upload',
                            ],
                        ),
                        array(
                            'name' => 'video_icon',
                            'label' => esc_html__('Video Icon', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'image_type',
                            'label' => esc_html__('Image Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none' => 'None',
                                'img' => 'Image',
                                'bg' => 'Background',
                            ],
                            'default' => 'none',
                        ),
                        array(
                            'name' => 'image',
                            'label' => esc_html__('Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'image_type' => ['img', 'bg'],
                            ],
                        ),
                        array(
                            'name' => 'image_opacity',
                            'label' => esc_html__('Image Opacity', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'default' => [
                                'size' => 100,
                                'unit' => '%',
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__inner .pxl-video__holder img' => 'opacity: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'img_size',
                            'label' => esc_html__('Image Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Example: 200x100 (Width x Height).',
                            'condition' => [
                                'image_type' => 'img',
                            ],
                        ),
                        array(
                            'name' => 'img_border_radius',
                            'label' => esc_html__('Image Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__inner .pxl-video__holder, {{WRAPPER}} .pxl-video .pxl-video__inner .pxl-video__holder img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'image_type' => ['img', 'bg'],
                            ],
                        ),
                        array(
                            'name' => 'image_height',
                            'label' => esc_html__('Image Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                            'condition' => [
                                'image_type' => 'bg',
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video-player .pxl-video__imagebg' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'btn_video_style',
                            'label' => esc_html__('Button Video Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Default',
                                'style-2' => 'Liquid Glass',
                            ],
                            'default' => 'style-1',
                        ),
                        array(
                            'name' => 'overlay',
                            'label' => esc_html__('Overlay Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none' => 'None',
                                'gradient' => 'Overlay gradient',
                            ],
                            'default' => 'none',
                            'condition' => [
                                'image_type' => 'img',
                            ],
                        ),
                        array(
                            'name' => 'overlay_border_radius',
                            'label' => esc_html__('Overlay Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__inner:before' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'overlay' => 'gradient',
                            ],
                        ),
                        array(
                            'name' => 'overlay_color_1',
                            'label' => esc_html__('Overlay Color 1', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#A692FF',
                            'condition' => [
                                'overlay' => 'gradient',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__inner' => '--overlay-color-1: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'overlay_color_2',
                            'label' => esc_html__('Overlay Color 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#DEB1FF',
                            'condition' => [
                                'overlay' => 'gradient',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__inner' => '--overlay-color-2: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'overlay_color_3',
                            'label' => esc_html__('Overlay Color 3', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#F7F7FB',
                            'condition' => [
                                'overlay' => 'gradient',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__inner' => '--overlay-color-3: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'show_info_video',
                            'label' => esc_html__('Show Info Video', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Yes', 'brighthub'),
                            'label_off' => esc_html__('No', 'brighthub'),
                            'default' => 'false',
                            'condition' => [
                                'image_type' => ['img', 'bg'],
                            ],
                        ),
                        array(
                            'name' => 'info_video_image',
                            'label' => esc_html__('Info Video Author Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'show_info_video' => 'true',
                            ],
                        ),
                        array(
                            'name' => 'info_video_description',
                            'label' => esc_html__('Info Video Description', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'default' => '“We switched to BrightHub and never looked back.”',
                            'condition' => [
                                'show_info_video' => 'true',
                            ],
                        ),
                        array(
                            'name' => 'info_video_author',
                            'label' => esc_html__('Info Video Author', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '— Tomas V., CTO @DeltaNode',
                            'condition' => [
                                'show_info_video' => 'true',
                            ],
                        ),
                        array(
                            'name' => 'padding_overlay',
                            'label' => esc_html__('Padding Overlay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'default' => [
                                'top' => 16,
                                'right' => 16,
                                'bottom' => 16,
                                'left' => 16,
                            ],
                            'condition' => [
                                'overlay' => 'gradient',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'btn_video_position',
                            'label' => esc_html__('Button Video Position', 'brighthub' ),
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
                                'image_type' => ['img','bg'],
                            ],
                        ),
                        array(
                            'name' => 'top_positioon',
                            'label' => esc_html__('Top Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'control_type' => 'responsive',
                            'default' => [
                                'size' => 0,
                                'unit' => '%',
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__holder + .pxl-video__btn-top-left, {{WRAPPER}} .pxl-video__holder + .pxl-video__btn-top-right' => 'top: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'btn_video_position' => ['top-left', 'top-right'],
                            ],
                        ),
                        array(
                            'name' => 'right_positioon',
                            'label' => esc_html__('Right Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'control_type' => 'responsive',
                            'default' => [
                                'size' => 0,
                                'unit' => '%',
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__holder + .pxl-video__btn-top-right, {{WRAPPER}} .pxl-video__holder + .pxl-video__btn-bottom-right' => 'right: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'btn_video_position' => ['top-right', 'bottom-right'],
                            ],
                        ),
                        array(
                            'name' => 'bottom_positioon',
                            'label' => esc_html__('Bottom Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'control_type' => 'responsive',
                            'default' => [
                                'size' => 0,
                                'unit' => '%',
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__holder + .pxl-video__btn-bottom-left, {{WRAPPER}} .pxl-video__holder + .pxl-video__btn-bottom-right' => 'bottom: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'btn_video_position' => ['bottom-left', 'bottom-right'],
                            ],
                        ),
                        array(
                            'name' => 'left_positioon',
                            'label' => esc_html__('Left Position', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'control_type' => 'responsive',
                            'default' => [
                                'size' => 0,
                                'unit' => '%',
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video__holder + .pxl-video__btn-top-left, {{WRAPPER}} .pxl-video__holder + .pxl-video__btn-bottom-left' => 'left: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'btn_video_position' => ['top-left', 'bottom-left'],
                            ],
                        ),
                        array(
                            'name' => 't_width',
                            'label' => esc_html__('Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px', '%' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__inner' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'overlay_color',
                            'label' => esc_html__('Overlay Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-overlay-color' => 'background-color: {{VALUE}};',
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
                            'name' => 'icon_size',
                            'label' => esc_html__('Icon Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn i' => 'font-size: {{SIZE}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-video .pxl-video__btn svg' => 'width: {{SIZE}}{{UNIT}}; height: auto;',
                            ],
                        ),
                        array(
                            'name' => 'icon_color',
                            'label' => esc_html__('Icon Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn i' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-video .pxl-video__btn svg' => 'fill: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_margin',
                            'label' => esc_html__('Icon Margin', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn i' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-video .pxl-video__btn svg' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'border_radius',
                            'label' => esc_html__('Border Radius Box', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'separator' => 'before',
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video' => 'overflow: hidden; border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_width',
                            'label' => esc_html__('Button Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px', '%' ],
                            'control_type' => 'responsive',
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_height',
                            'label' => esc_html__('Button Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'control_type' => 'responsive',
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_border_radius',
                            'label' => esc_html__('Button Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'button_background_color',
                            'label' => esc_html__('Button Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'button_border_color',
                            'label' => esc_html__('Button Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-video .pxl-video__btn' => 'border-color: {{VALUE}};',
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