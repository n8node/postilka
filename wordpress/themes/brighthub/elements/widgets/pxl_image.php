<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_image',
        'title' => esc_html__('Case Image', 'brighthub' ),
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
                            'name' => 'source_type',
                            'label' => esc_html__('Source Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                's_img' => 'Select Image',
                                'f_img' => 'Featured Image',
                            ],
                            'default' => 's_img',
                        ),
                        array(
                            'name' => 'image_type',
                            'label' => esc_html__('Image Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'img' => 'Image',
                                'bg' => 'Background',
                            ],
                            'default' => 'img',
                        ),
                        array(
                            'name' => 'image',
                            'label' => esc_html__('Choose Image', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => [
                                'source_type' => ['s_img'],
                            ],
                        ),
                        array(
                            'name' => 'img_size',
                            'label' => esc_html__('Image Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => 'Enter image size - Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme. Alternatively enter size in pixels Example: 200x100 - Width x Height.',
                            'condition' => [
                                'image_type' => ['img'],
                            ],
                        ),
                        array(
                            'name' => 'image_link',
                            'label' => esc_html__('Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_style_img',
                    'label' => esc_html__('Image', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        
                        array(
                            'name' => 'image_max_height',
                            'label' => esc_html__('Image Max Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                            'condition' => [
                                'image_type' => 'img',
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image img' => 'max-height: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'image_type' => 'img',
                            ],
                        ),
                    
                        array(
                            'name' => 'image_width',
                            'label' => esc_html__('Image Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'auto' => [
                                    'title' => esc_html__( 'Auto', 'brighthub' ),
                                    'icon' => 'fas fa-arrows-alt-v',
                                ],
                                '100%' => [
                                    'title' => esc_html__( 'Full', 'brighthub' ),
                                    'icon' => 'fas fa-arrows-alt-h',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image img' => 'width: {{VALUE}};',
                            ],
                            'condition' => [
                                'image_type' => 'img',
                            ],
                            'control_type' => 'responsive',
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
                                '{{WRAPPER}} .pxl-image .pxl-item--bg' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'image_overlay',
                            'label' => esc_html__( 'Image Overlay', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '',
                            'options' => [
                                '' => esc_html__( 'None', 'brighthub' ),
                                'gradient' => esc_html__( 'Gradient', 'brighthub' ),
                                'angle' => esc_html__( 'Angle', 'brighthub' ),
                            ],
                        ),

                        array(
                            'name' => 'border_angle_overlay_color',
                            'label' => esc_html__('Border Angle Overlay Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-angle' => 'border-color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'angle_color',
                            'label' => esc_html__('Angle Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-angle__item' => 'border-color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'angle_width',
                            'label' => esc_html__('Angle Width/Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-angle__item' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                            ],
                        ),

                        array(
                            'name' => 'padding',
                            'label' => esc_html__('Padding', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image__inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image, {{WRAPPER}} .pxl-image__inner' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'border_radius_hover',
                            'label' => esc_html__('Border Radius Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image:hover, {{WRAPPER}} .pxl-image:hover .pxl-image__inner' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                      
                        array(
                            'name' => 'border_type',
                            'label' => esc_html__( 'Border Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => esc_html__( 'None', 'brighthub' ),
                                'solid' => esc_html__( 'Solid', 'brighthub' ),
                                'double' => esc_html__( 'Double', 'brighthub' ),
                                'dotted' => esc_html__( 'Dotted', 'brighthub' ),
                                'dashed' => esc_html__( 'Dashed', 'brighthub' ),
                                'groove' => esc_html__( 'Groove', 'brighthub' ),
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image img' => 'border-style: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__( 'Border Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image img' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'condition' => [
                                'border_type!' => '',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_color',
                            'label' => esc_html__( 'Border Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image img' => 'border-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'border_type!' => '',
                            ],
                        ),
                        array(
                            'name'         => 'box_shadow',
                            'label' => esc_html__( 'Box Shadow', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                            'control_type' => 'group',
                            'selector'     => '{{WRAPPER}} .pxl-image img',
                            'separator' => 'before'
                            
                        ),
                        array(
                            'name' => 'img_effect',
                            'label' => esc_html__('Image Effect', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                '' => 'None',
                                'pxl-image__3d-ui' => '3D UI',
                                'pxl-image__zigzag' => 'Zigzag',
                                'pxl-image__tilt' => 'Tilt',
                                'pxl-image__spin' => 'Spin',
                                'pxl-image__zoom' => 'Zoom 1',
                                'pxl-image__zoom2' => 'Zoom 2',
                                'pxl-image__bounce' => 'Bounce',
                                'pxl-image__slide-updown' => 'Slide Up Down',
                                'pxl-image__slide-ttb' => 'Slide Top To Bottom ',
                                'pxl-image__effect-2' => 'Slide Bottom To Top ',
                                'pxl-image__slide-rtl' => 'Slide Right To Left ',
                                'pxl-image__slide-ltr' => 'Slide Left To Right ',
                                'pxl-image__zoom-in' => 'ZoomIn',
                                'pxl-image__hover-2' => 'ZoomOut',
                                'pxl-image__ani-round' => 'Round',
                                'pxl-image__parallax' => 'Parallax Hover',
                                'pxl-image__parallax-scroll' => 'Parallax Scroll',
                                'pxl-image__light-blur' => 'Light Blur',
                                'pxl-image__zoom-on-scroll' => 'Zoom On Scroll',
                            ],
                            'separator' => 'before',
                            'default' => '',
                            'condition' => [
                                'image_type' => 'img',
                            ],
                        ),

                        array(  
                            'name' => 'light_blur_color',
                            'label' => esc_html__('Light Blur Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => [
                                'img_effect' => 'pxl-image__light-blur',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image__light-blur' => '--light-blur-color: {{VALUE}};',
                            ],
                        ),

                        array(
                            'name' => 'parallax_scroll_type',
                            'label' => esc_html__('Parallax Scroll Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'y' => 'Effect Y',
                                'x' => 'Effect X',
                                'z' => 'Effect Z',
                            ],
                            'default' => 'y',
                            'condition' => [
                                'img_effect' => 'pxl-image__parallax-scroll',
                            ],
                        ),
                        array(
                            'name' => 'data_rotateX_from',
                            'label' => esc_html__('Rotate X From', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__3d-ui',
                            ],
                            'default' => '15',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'data_rotateY_from',
                            'label' => esc_html__('Rotate Y From', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__3d-ui',
                            ],
                            'default' => '0',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'data_rotateX_to',
                            'label' => esc_html__('Rotate X To', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__3d-ui',
                            ],
                            'default' => '0',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'data_rotateY_to',
                            'label' => esc_html__('Rotate Y To', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__3d-ui',
                            ],
                            'default' => '0',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                            'separator' => 'after',
                        ),

                        array(
                            'name' => 'parallax_scroll_value_x',
                            'label' => esc_html__('Parallax Value', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'parallax_scroll_type' => 'x',
                            ],
                            'default' => '80',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'parallax_value',
                            'label' => esc_html__('Parallax Value', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => ['pxl-image__parallax','pxl-image__parallax-scroll'],
                            ],
                            'default' => '40',
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'max_tilt',
                            'label' => esc_html__('Max Tilt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__tilt',
                            ],
                            'default' => [
                                'size' => 10,
                            ],
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'speed_tilt',
                            'label' => esc_html__('Speed Tilt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__tilt',
                            ],
                            'default' => [
                                'size' => 400,
                            ],
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'perspective_tilt',
                            'label' => esc_html__('Perspective Tilt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => [
                                'img_effect' => 'pxl-image__tilt',
                            ],
                            'default' => [
                                'size' => 1000,
                            ],
                            'description' => esc_html__('Enter number.', 'brighthub' ),
                        ),
                        array(
                            'name' => 'speed_effect',
                            'label' => esc_html__('Speed', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image, {{WRAPPER}} .pxl-image img' => 'animation-duration: {{SIZE}}ms;',
                            ],
                            'condition' => [
                                'img_effect!' => ['pxl-image__tilt','pxl-image__parallax-scroll'],
                            ],
                            'description' => 'Enter number, unit is ms.',
                        ),
                        array(
                            'name' => 'hide_parallax_sm',
                            'label' => esc_html__('Disable Parallax on Mobile <= 767px', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                            'condition' => [
                                'img_effect' => ['pxl-image__parallax-scroll'],
                            ],
                        ),
                        array(
                            'name' => 'overlay_color',
                            'label' => esc_html__('Overlay Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image .pxl-image__overlay' => 'background-color: {{VALUE}};',
                            ],
                            'separator' => 'before'
                        ),

                        array(
                            'name' => 'overlay_color_hover',
                            'label' => esc_html__('Overlay Background Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image:hover .pxl-image__overlay' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'opacity',
                            'label' => esc_html__('Image Opacity', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ '%' ],
                            'separator' => 'before',
                            'default'    => [
                                'unit' => '%'
                            ],
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image' => 'opacity: {{SIZE}}%;',
                            ],
                        ),
                        array(
                            'name' => 'img_bg',
                            'label' => esc_html__('Image Background', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                            'separator' => 'before',
                            'condition' => ['image_type' => 'img']
                        ),
                        array(
                            'name'         => 'image_bg',
                            'label' => esc_html__( 'Image Background', 'brighthub' ),
                            'type'         => \Elementor\Group_Control_Background::get_type(),
                            'control_type' => 'group',
                            'types' => ['classic', 'gradient' ],
                            'selector'     => '{{WRAPPER}} .pxl-image__bgr',
                           
                            'condition' => ['img_bg' => 'true']
                        ),

                        array(
                            'name'         => 'blur_type',
                            'label' => esc_html__( 'Blur Type', 'brighthub' ),
                            'type'         => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'none' => esc_html__( 'None', 'brighthub' ),
                                'blur' => esc_html__( 'Blur Normal', 'brighthub' ),
                                'backdrop' => esc_html__( 'Backdrop Filter Blur', 'brighthub' ),
                            ],
                            'default' => 'none',
                            'condition' => ['img_bg' => 'true']
                        ),

                        array(
                            'name' => 'blur',
                            'label' => esc_html__('Blur', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image__bgr' => 'filter: blur({{SIZE}}{{UNIT}}); width: calc(100% - {{SIZE}}{{UNIT}}); height: calc(100% - {{SIZE}}{{UNIT}});',
                            ],
                            'condition' => ['blur_type' => 'blur']
                        ),

                        array(
                            'name' => 'backdrop_filter_blur',
                            'label' => esc_html__('Backdrop Filter Blur', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image__bgr' => 'backdrop-filter: blur({{SIZE}}{{UNIT}}); width: 100%; height: 100%;',
                            ],
                            'condition' => ['blur_type' => 'backdrop']
                        ),
                        array(
                            'name' => 'image_bg_opacity',
                            'label' => esc_html__('Image Background Opacity(%)', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'range' => [
                                '%' => [
                                    'min' => 0,
                                    'max' => 100,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-image__bgr' => 'opacity: {{SIZE}}%;',
                            ],
                            'condition' => ['img_bg' => 'true']
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);