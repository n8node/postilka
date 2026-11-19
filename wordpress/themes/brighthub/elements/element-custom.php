<?php 
use Elementor\Element_Base;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Image_Size;
use Elementor\Group_Control_Typography;
use Elementor\Schemes\Color;
use Elementor\Schemes\Typography;
use Elementor\Utils;
use Elementor\Control_Media;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;
use Elementor\Includes\Elements\PXL_Container;

defined('ABSPATH') || die();

class PXL_Elementor_Custom_Controls {
    public static function init() {
        // Section Fixed and Sticky Inner
        add_filter('elementor/frontend/container/should_render', '__return_true');
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_sticky',
                    [
                        'label' => __('Container Fixed', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
                
                $element->add_control(
                    'pxl_container_sticky_top',
                    [
                        'label' => esc_html__('Enable Fixed?', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                    ]
                );
                $element->add_control(
                    'pxl_container_sticky_position_mode',
                    [
                        'label' => esc_html__('Fixed Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'default' => 'top',
                        'options' => [
                            'top' => esc_html__('Top', 'brighthub'),
                            'bottom' => esc_html__('Bottom', 'brighthub'),
                        ],
                        'condition' => [
                            'pxl_container_sticky_top' => 'yes',
                        ],
                    ]
                );
                
                $element->add_control(
                    'pxl_container_sticky_top_position',
                    [
                        'label' => esc_html__('Offset (px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 30,
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 2000,
                            ],
                        ],
                        'condition' => [
                            'pxl_container_sticky_top' => 'yes',
                        ],
                        'description' => esc_html__('Distance from top when fixed is active', 'brighthub'),
                    ]
                );
                
                $element->add_control(
                    'pxl_container_sticky_position',    
                    [
                        'label' => esc_html__('Trigger Position (px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 300,
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 20000,
                            ],
                        ],
                        'description' => esc_html__('Position from top where sticky effect starts', 'brighthub'),
                        'condition' => [
                            'pxl_container_sticky_top' => 'yes',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_footer_position',    
                    [
                        'label' => esc_html__('Hide On Footer (px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 300,
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 20000,
                            ],
                        ],
                        'description' => esc_html__('Hide on scroll to footer', 'brighthub'),
                        'condition' => [
                            'pxl_container_sticky_top' => 'yes',
                        ],
                    ]
                );
        
                $element->add_control(
                    'pxl_container_sticky_z_index',
                    [
                        'label' => esc_html__('Z-Index', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 999,
                        'condition' => [
                            'pxl_container_sticky_top' => 'yes', 
                        ],
                        'selectors' => [
                            '{{WRAPPER}}.pxl-sticky-active' => 'z-index: {{VALUE}};',
                        ],
                    ]
                );
        
                $element->end_controls_section();
            }
        }, 10, 2);

        add_action('elementor/frontend/container/before_render', function($element) {
            $settings = $element->get_settings_for_display();
            if (!empty($settings['pxl_container_sticky_top']) && $settings['pxl_container_sticky_top'] === 'yes') {
                $sticky_offset = !empty($settings['pxl_container_sticky_top_position']) ? $settings['pxl_container_sticky_top_position'] : 30;
                $sticky_mode = !empty($settings['pxl_container_sticky_position_mode']) ? $settings['pxl_container_sticky_position_mode'] : 'top';
                $trigger_position = !empty($settings['pxl_container_sticky_position']) ? $settings['pxl_container_sticky_position'] : 300;
                $hide_on_footer = !empty($settings['pxl_container_sticky_footer_position']) ? $settings['pxl_container_sticky_footer_position'] : 300;

                $element->add_render_attribute('_wrapper', [
                    'data-pxl-sticky' => 'true',
                    'data-sticky-mode' => $sticky_mode,
                    'data-sticky-offset' => $sticky_offset,
                    'data-trigger-position' => $trigger_position,
                    'data-ft-hide' => $hide_on_footer,
                    'class' => 'pxl-sticky-container' 
                ]);
            }
        });

        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_sticky_inner',
                    [
                        'label' => __('Container Sticky', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
                
                $element->add_control(
                    'pxl_container_sticky_scroll',
                    [
                        'label' => esc_html__('Enable Sticky Scroll Top', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_scroll_bottom',
                    [
                        'label' => esc_html__('Enable Sticky Scroll Bottom', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_top',
                    [
                        'label' => esc_html__('Enable Sticky?', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                    ]
                );
                $element->add_control(
                    'pxl_container_sticky_inner_type',
                    [
                        'label' => esc_html__('Sticky Type', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'top' => esc_html__('Top', 'brighthub'),
                            'bottom' => esc_html__('Bottom', 'brighthub'),
                        ],
                        'default' => 'top',
                        'condition' => [
                            'pxl_container_sticky_inner_top' => 'yes',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_sticky_inner_top_position',
                    [
                        'label' => esc_html__('Sticky Top Space (px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 30,
                        'condition' => [
                            'pxl_container_sticky_inner_type' => 'top',
                        ],
                        'selectors' => [
                            '{{WRAPPER}}.pxl-sticky-inner-container' => 'position: sticky; top: {{VALUE}}px; bottom: unset;',
                        ],
                        'description' => esc_html__('Distance from top when sticky is active', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_bottom_position',
                    [
                        'label' => esc_html__('Sticky Bottom Space (px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 30,
                        'condition' => [
                            'pxl_container_sticky_inner_type' => 'bottom',
                        ],
                        'selectors' => [
                            '{{WRAPPER}}.pxl-sticky-inner-container' => 'position: sticky; top: unset; bottom: {{VALUE}}px; top: {{VALUE}}px;',
                        ],
                        'description' => esc_html__('Distance from top when sticky is active', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_scale',
                    [
                        'label' => esc_html__('Scale', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                        'description' => esc_html__('Scale sibling item sticky before in same the container', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_scale_size',
                    [
                        'label' => esc_html__('Scale', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'description' => esc_html__('Scale width of the sibling item ex: from 100% to 90% follow default value', 'brighthub'),
                        'default' => 90,
                        'condition' => [
                            'pxl_container_sticky_inner_scale' => 'yes',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_blur',
                    [
                        'label' => esc_html__('Blur', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'default' => '',
                        'label_on' => esc_html__('Yes', 'brighthub'),
                        'label_off' => esc_html__('No', 'brighthub'),
                        'description' => esc_html__('Blur sibling item sticky before in same the container', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_sticky_inner_blur_width',
                    [
                        'label' => esc_html__('Blur Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'description' => esc_html__('Blur width of the sibling item in pixels (default: 10px)', 'brighthub'),
                        'default' => 10,
                        'condition' => [
                            'pxl_container_sticky_inner_blur' => 'yes',
                        ],
                    ]
                );
        
                $element->end_controls_section();
            }
        }, 10, 2);
        
        add_action('elementor/frontend/container/before_render', function($element) {
            $settings = $element->get_settings_for_display();
            
            if (!empty($settings['pxl_container_sticky_inner_top']) && $settings['pxl_container_sticky_inner_top'] === 'yes') {
                $attrs = [
                    'class' => 'pxl-sticky-inner-container',
                ];
                
                if (!empty($settings['pxl_container_sticky_inner_scale']) && $settings['pxl_container_sticky_inner_scale'] === 'yes') {
                    $scale_size = !empty($settings['pxl_container_sticky_inner_scale_size']) ? $settings['pxl_container_sticky_inner_scale_size'] : 0;
                    $attrs['data-pxl-sticky-inner-scale-size'] = $scale_size;
                } else {
                    $attrs['data-pxl-sticky-inner-scale-size'] = 100;
                }
                if (!empty($settings['pxl_container_sticky_inner_blur']) && $settings['pxl_container_sticky_inner_blur'] === 'yes') {
                    $blur_width = !empty($settings['pxl_container_sticky_inner_blur_width']) ? $settings['pxl_container_sticky_inner_blur_width'] : 0;
                    $attrs['data-pxl-sticky-inner-blur-width'] = $blur_width;
                } else {
                    $attrs['data-pxl-sticky-inner-blur-width'] = 0;
                }
                
                $element->add_render_attribute('_wrapper', $attrs);
            }

            if (!empty($settings['pxl_container_sticky_scroll']) && $settings['pxl_container_sticky_scroll'] === 'yes') {
                $attrs = [
                    'class' => 'pxl-section-sticky-top',
                ];
                
                $element->add_render_attribute('_wrapper', $attrs);
            }

            if (!empty($settings['pxl_container_sticky_scroll_bottom']) && $settings['pxl_container_sticky_scroll_bottom'] === 'yes') {
                $attrs = [
                    'class' => 'pxl-section-sticky-bottom',
                ];
                
                $element->add_render_attribute('_wrapper', $attrs);
            }

        });
        

        // Container Border Running
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_max_width_title',
                    [
                        'label' => __('Container Max Width', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
    
                $element->add_control(
                    'pxl_container_max_width',
                    [
                        'label' => esc_html__('Max Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'control_type' => 'responsive',
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 2000,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} ' => 'max-width: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );
    
                $element->end_controls_section();
            }
        }, 10, 2);
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_border_running',
                    [
                        'label' => __('Border Container Running', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
    
                $element->add_control(
                    'pxl_container_border_options',
                    [
                        'label' => esc_html__('Container Border Sides', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT2,
                        'multiple' => true,
                        'options' => [
                            'top'    => esc_html__('Top', 'brighthub'),
                            'bottom' => esc_html__('Bottom', 'brighthub'),
                            'left' => esc_html__('Left', 'brighthub'),
                            'right' => esc_html__('Right', 'brighthub'),
                        ],
                        'default' => [],
                    ]
                );
    
                $element->add_control(
                    'pxl_container_border_style',
                    [
                        'label' => esc_html__('Container Border Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            '1' => esc_html__('Style Dashed', 'brighthub'),
                            '2' => esc_html__('Style Solid', 'brighthub'),
                        ],
                        'default' => '1',
                        'condition' => [
                            'pxl_container_border_options!' => ''
                        ]
                    ]
                );

                $element->add_control(
                    'pxl_container_border_height',
                    [
                        'label' => esc_html__('Container Border Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 2000,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-container-border__item' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );

                
                $element->add_control(
                    'pxl_container_border_color',
                    [
                        'label' => esc_html__('Container Border Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-container-border__item' => '--border-color: {{VALUE}};',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_border_dot_color',
                    [
                        'label' => esc_html__('Container Border Dot Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-container-border__item' => '--border-dot-color: {{VALUE}};',
                        ],
                        'separator' => 'before',
                    ]
                );
                $element->add_control(
                    'pxl_container_border_dot_width',
                    [
                        'label' => esc_html__('Container Border Dot Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 2000,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-container-border__item:before, {{WRAPPER}} .pxl-container-border__item:after' => 'width: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_border_dot_height',
                    [
                        'label' => esc_html__('Container Border Dot Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 2000,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-container-border__item:before, {{WRAPPER}} .pxl-container-border__item:after' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );

                $element->end_controls_section();
            }
        }, 10, 2);
    
        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_container_border_options']) && is_array($settings['pxl_container_border_options'])) {
                $sides = $settings['pxl_container_border_options'];
                $style = !empty($settings['pxl_container_border_style']) ? $settings['pxl_container_border_style'] : '1';
                $style_class = is_array($style) ? implode('-', $style) : $style;
    
                $html .= '<div class="pxl-container-border pxl-container-border__style-' . esc_attr($style_class) . '">';
                foreach ($sides as $side) {
                    $html .= '<span class="pxl-container-border__item pxl-container-border__item-' . esc_attr($side) . '"></span>';
                }
                $html .= '</div>';
            }
    
            return $html;
        }, 10, 2);

        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_line',
                    [
                        'label' => __('Line Container', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );

                $element->add_control(
                    'pxl_container_line_o',
                    [
                        'label' => esc_html__('Container Line Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT2,
                        'multiple' => true,
                        'options' => [
                            'top'    => esc_html__('Top', 'brighthub'),
                            'bottom' => esc_html__('Bottom', 'brighthub'),
                            'right' => esc_html__('Right', 'brighthub'),
                            'left' => esc_html__('Left', 'brighthub'),
                            'horizontal' => esc_html__('Horizontal', 'brighthub'),
                            'vertical' => esc_html__('Vertical 1', 'brighthub'),
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_line_styles_heading',
                    [
                        'label' => esc_html__('Responsive Line Styles', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_laptop_heading',
                    [
                        'label' => esc_html__('Laptop Styles (>1366px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_s_laptop',
                    [
                        'label' => esc_html__('Laptop - Line Left/Right Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-btt'    => esc_html__('Gradient Bottom To Top', 'brighthub'),
                            'gr-ttb' => esc_html__('Gradient Top To Bottom', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'gr-df'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_srl_laptop',
                    [
                        'label' => esc_html__('Laptop - Line Top/Bottom Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-rtl' => esc_html__('Gradient Right To Left', 'brighthub'),
                            'gr-ltr' => esc_html__('Gradient Left To Right', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'gr-df'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_c_laptop',
                    [
                        'label' => esc_html__('Laptop - Line Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                    ]
                );

                $element->add_control(
                    'pxl_container_line_tablet_landscape_heading',
                    [
                        'label' => esc_html__('Tablet Landscape Styles (1025px - 1366px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_s_tablet_landscape',
                    [
                        'label' => esc_html__('Tablet Landscape - Line Left/Right Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-btt'    => esc_html__('Gradient Bottom To Top', 'brighthub'),
                            'gr-ttb' => esc_html__('Gradient Top To Bottom', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_srl_tablet_landscape',
                    [
                        'label' => esc_html__('Tablet Landscape - Line Top/Bottom Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-rtl' => esc_html__('Gradient Right To Left', 'brighthub'),
                            'gr-ltr' => esc_html__('Gradient Left To Right', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_c_tablet_landscape',
                    [
                        'label' => esc_html__('Tablet Landscape - Line Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'description' => esc_html__('Leave empty to inherit', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_line_tablet_portrait_heading',
                    [
                        'label' => esc_html__('Tablet Portrait Styles (768px - 1024px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_s_tablet_portrait',
                    [
                        'label' => esc_html__('Tablet Portrait - Line Left/Right Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-btt'    => esc_html__('Gradient Bottom To Top', 'brighthub'),
                            'gr-ttb' => esc_html__('Gradient Top To Bottom', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_srl_tablet_portrait',
                    [
                        'label' => esc_html__('Tablet Portrait - Line Top/Bottom Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-rtl' => esc_html__('Gradient Right To Left', 'brighthub'),
                            'gr-ltr' => esc_html__('Gradient Left To Right', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_c_tablet_portrait',
                    [
                        'label' => esc_html__('Tablet Portrait - Line Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'description' => esc_html__('Leave empty to inherit', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_line_mobile_landscape_heading',
                    [
                        'label' => esc_html__('Mobile Landscape Styles (576px - 767px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_s_mobile_landscape',
                    [
                        'label' => esc_html__('Mobile Landscape - Line Left/Right Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-btt'    => esc_html__('Gradient Bottom To Top', 'brighthub'),
                            'gr-ttb' => esc_html__('Gradient Top To Bottom', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_srl_mobile_landscape',
                    [
                        'label' => esc_html__('Mobile Landscape - Line Top/Bottom Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-rtl' => esc_html__('Gradient Right To Left', 'brighthub'),
                            'gr-ltr' => esc_html__('Gradient Left To Right', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_c_mobile_landscape',
                    [
                        'label' => esc_html__('Mobile Landscape - Line Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'description' => esc_html__('Leave empty to inherit', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_container_line_mobile_portrait_heading',
                    [
                        'label' => esc_html__('Mobile Portrait Styles (≤575px)', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::HEADING,
                        'separator' => 'before',
                    ]
                );

                $element->add_control(
                    'pxl_container_line_s_mobile_portrait',
                    [
                        'label' => esc_html__('Mobile Portrait - Line Left/Right Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-btt'    => esc_html__('Gradient Bottom To Top', 'brighthub'),
                            'gr-ttb' => esc_html__('Gradient Top To Bottom', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_srl_mobile_portrait',
                    [
                        'label' => esc_html__('Mobile Portrait - Line Top/Bottom Style', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'inherit' => esc_html__('Inherit', 'brighthub'),
                            'gr-df'    => esc_html__('Default', 'brighthub'),
                            'gr-df-bold'    => esc_html__('Bold Than Default', 'brighthub'),
                            'gr-rtl' => esc_html__('Gradient Right To Left', 'brighthub'),
                            'gr-ltr' => esc_html__('Gradient Left To Right', 'brighthub'),
                            'clr' => esc_html__('A Color', 'brighthub'),
                        ],
                        'default' => 'inherit'
                    ]
                );

                $element->add_control(
                    'pxl_container_line_c_mobile_portrait',
                    [
                        'label' => esc_html__('Mobile Portrait - Line Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'description' => esc_html__('Leave empty to inherit', 'brighthub'),
                    ]
                );

                // Responsive visibility controls for each position
                $all_positions = [
                    'top' => 'Top',
                    'bottom' => 'Bottom', 
                    'right' => 'Right',
                    'left' => 'Left',
                    'horizontal' => 'Horizontal',
                    'vertical' => 'Vertical',    
                ];

                foreach ($all_positions as $position_key => $position_label) {
                    $element->add_control(
                        'pxl_container_line_responsive_heading_' . str_replace('-', '_', $position_key),
                        [
                            'label' => sprintf(esc_html__('Responsive Visibility - %s', 'brighthub'), $position_label),
                            'type' => \Elementor\Controls_Manager::HEADING,
                            'separator' => 'before',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );

                    $element->add_control(
                        'pxl_container_line_hide_laptop_' . str_replace('-', '_', $position_key),
                        [
                            'label' => esc_html__('Hide on Laptop (>1366px)', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Hide', 'brighthub'),
                            'label_off' => esc_html__('Show', 'brighthub'),
                            'return_value' => 'yes',
                            'default' => '',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );

                    $element->add_control(
                        'pxl_container_line_hide_tablet_landscape_' . str_replace('-', '_', $position_key),
                        [
                            'label' => esc_html__('Hide on Tablet Landscape (1025px - 1366px)', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Hide', 'brighthub'),
                            'label_off' => esc_html__('Show', 'brighthub'),
                            'return_value' => 'yes',
                            'default' => '',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );

                    $element->add_control(
                        'pxl_container_line_hide_tablet_portrait_' . str_replace('-', '_', $position_key),
                        [
                            'label' => esc_html__('Hide on Tablet Portrait (768px - 1024px)', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Hide', 'brighthub'),
                            'label_off' => esc_html__('Show', 'brighthub'),
                            'return_value' => 'yes',
                            'default' => '',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );

                    $element->add_control(
                        'pxl_container_line_hide_mobile_landscape_' . str_replace('-', '_', $position_key),
                        [
                            'label' => esc_html__('Hide on Mobile Landscape (576px - 767px)', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Hide', 'brighthub'),
                            'label_off' => esc_html__('Show', 'brighthub'),
                            'return_value' => 'yes',
                            'default' => '',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );

                    $element->add_control(
                        'pxl_container_line_hide_mobile_portrait_' . str_replace('-', '_', $position_key),
                        [
                            'label' => esc_html__('Hide on Mobile Portrait (≤575px)', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'label_on' => esc_html__('Hide', 'brighthub'),
                            'label_off' => esc_html__('Show', 'brighthub'),
                            'return_value' => 'yes',
                            'default' => '',
                            'condition' => [
                                'pxl_container_line_o' => $position_key,
                            ],
                        ]
                    );
                }

                $element->add_control(
                    'pxl_container_line_z',
                    [
                        'label' => esc_html__('Container Line z-index', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-line' => 'z-index: {{VALUE}};',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_line_w',
                    [
                        'label' => esc_html__('Line Width/Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
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
                            '{{WRAPPER}} .pxl-line__top' => 'height: {{SIZE}}{{UNIT}};',
                            '{{WRAPPER}} .pxl-line__bottom' => 'height: {{SIZE}}{{UNIT}};',
                            '{{WRAPPER}} .pxl-line__right' => 'width: {{SIZE}}{{UNIT}};',
                            '{{WRAPPER}} .pxl-line__left' => 'width: {{SIZE}}{{UNIT}};',
                            '{{WRAPPER}} .pxl-line__vertical' => 'width: {{SIZE}}{{UNIT}};',
                            '{{WRAPPER}} .pxl-line__horizontal' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );

                $element->end_controls_section();
            }
        }, 10, 2);

        if (!function_exists('pxl_get_line_responsive_classes')) {
            function pxl_get_line_responsive_classes($settings, $position) {
                $responsive_classes = [];
                $position_key = str_replace('-', '_', $position);
                
                if (!empty($settings['pxl_container_line_hide_laptop_' . $position_key])) {
                    $responsive_classes[] = 'pxl-hide-laptop';
                }
                if (!empty($settings['pxl_container_line_hide_tablet_landscape_' . $position_key])) {
                    $responsive_classes[] = 'pxl-hide-tablet-landscape';
                }
                if (!empty($settings['pxl_container_line_hide_tablet_portrait_' . $position_key])) {
                    $responsive_classes[] = 'pxl-hide-tablet-portrait';
                }
                if (!empty($settings['pxl_container_line_hide_mobile_landscape_' . $position_key])) {
                    $responsive_classes[] = 'pxl-hide-mobile-landscape';
                }
                if (!empty($settings['pxl_container_line_hide_mobile_portrait_' . $position_key])) {
                    $responsive_classes[] = 'pxl-hide-mobile-portrait';
                }
                
                return !empty($responsive_classes) ? ' ' . implode(' ', $responsive_classes) : '';
            }
        }

        if (!function_exists('pxl_get_responsive_line_styles')) {
            function pxl_get_responsive_line_styles($settings, $is_vertical = false) {
                $laptop_style = !empty($settings['pxl_container_line_s_laptop']) ? $settings['pxl_container_line_s_laptop'] : 'gr-df';
                $laptop_style_lr = !empty($settings['pxl_container_line_srl_laptop']) ? $settings['pxl_container_line_srl_laptop'] : 'gr-df';
                $laptop_color = !empty($settings['pxl_container_line_c_laptop']) ? $settings['pxl_container_line_c_laptop'] : '';
                
                $tablet_landscape_style = (!empty($settings['pxl_container_line_s_tablet_landscape']) && $settings['pxl_container_line_s_tablet_landscape'] !== 'inherit') 
                            ? $settings['pxl_container_line_s_tablet_landscape'] : $laptop_style;
                $tablet_landscape_style_lr = (!empty($settings['pxl_container_line_srl_tablet_landscape']) && $settings['pxl_container_line_srl_tablet_landscape'] !== 'inherit') 
                                ? $settings['pxl_container_line_srl_tablet_landscape'] : $laptop_style_lr;
                $tablet_landscape_color = !empty($settings['pxl_container_line_c_tablet_landscape']) ? $settings['pxl_container_line_c_tablet_landscape'] : $laptop_color;
                
                $tablet_portrait_style = (!empty($settings['pxl_container_line_s_tablet_portrait']) && $settings['pxl_container_line_s_tablet_portrait'] !== 'inherit') 
                            ? $settings['pxl_container_line_s_tablet_portrait'] : $tablet_landscape_style;
                $tablet_portrait_style_lr = (!empty($settings['pxl_container_line_srl_tablet_portrait']) && $settings['pxl_container_line_srl_tablet_portrait'] !== 'inherit') 
                                ? $settings['pxl_container_line_srl_tablet_portrait'] : $tablet_landscape_style_lr;
                $tablet_portrait_color = !empty($settings['pxl_container_line_c_tablet_portrait']) ? $settings['pxl_container_line_c_tablet_portrait'] : $tablet_landscape_color;
                
                $mobile_landscape_style = (!empty($settings['pxl_container_line_s_mobile_landscape']) && $settings['pxl_container_line_s_mobile_landscape'] !== 'inherit') 
                            ? $settings['pxl_container_line_s_mobile_landscape'] : $tablet_portrait_style;
                $mobile_landscape_style_lr = (!empty($settings['pxl_container_line_srl_mobile_landscape']) && $settings['pxl_container_line_srl_mobile_landscape'] !== 'inherit') 
                                ? $settings['pxl_container_line_srl_mobile_landscape'] : $tablet_portrait_style_lr;
                $mobile_landscape_color = !empty($settings['pxl_container_line_c_mobile_landscape']) ? $settings['pxl_container_line_c_mobile_landscape'] : $tablet_portrait_color;
                
                $mobile_portrait_style = (!empty($settings['pxl_container_line_s_mobile_portrait']) && $settings['pxl_container_line_s_mobile_portrait'] !== 'inherit') 
                            ? $settings['pxl_container_line_s_mobile_portrait'] : $mobile_landscape_style;
                $mobile_portrait_style_lr = (!empty($settings['pxl_container_line_srl_mobile_portrait']) && $settings['pxl_container_line_srl_mobile_portrait'] !== 'inherit') 
                                ? $settings['pxl_container_line_srl_mobile_portrait'] : $mobile_landscape_style_lr;
                $mobile_portrait_color = !empty($settings['pxl_container_line_c_mobile_portrait']) ? $settings['pxl_container_line_c_mobile_portrait'] : $mobile_landscape_color;
                
                return [
                    'laptop' => [
                        'style' => $is_vertical ? $laptop_style : $laptop_style_lr,
                        'color' => $laptop_color
                    ],
                    'tablet_landscape' => [
                        'style' => $is_vertical ? $tablet_landscape_style : $tablet_landscape_style_lr,
                        'color' => $tablet_landscape_color
                    ],
                    'tablet_portrait' => [
                        'style' => $is_vertical ? $tablet_portrait_style : $tablet_portrait_style_lr,
                        'color' => $tablet_portrait_color
                    ],
                    'mobile_landscape' => [
                        'style' => $is_vertical ? $mobile_landscape_style : $mobile_landscape_style_lr,
                        'color' => $mobile_landscape_color
                    ],
                    'mobile_portrait' => [
                        'style' => $is_vertical ? $mobile_portrait_style : $mobile_portrait_style_lr,
                        'color' => $mobile_portrait_color
                    ]
                ];
            }
        }

        if (!function_exists('hex2rgba')) {
            function hex2rgba($color, $opacity = 1) {
                if (empty($color)) return 'transparent';
                
                $hex = str_replace('#', '', $color);
                
                if (strlen($hex) == 3) {
                    $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
                }
                
                $r = hexdec(substr($hex, 0, 2));
                $g = hexdec(substr($hex, 2, 2));
                $b = hexdec(substr($hex, 4, 2));
                
                return "rgba($r, $g, $b, $opacity)";
            }
        }

        if (!function_exists('pxl_generate_line_css')) {
            function pxl_generate_line_css($style, $color, $is_vertical = false) {
                if (empty($color)) return '';
                
                if ($is_vertical) {
                    switch ($style) {
                        case 'gr-btt': 
                            return 'background: linear-gradient(180deg, ' 
                                . hex2rgba($color, 0) . ' 0%, '
                                . hex2rgba($color, 0.88) . ' 50%, '
                                . $color . ' 100%);';
                        case 'gr-ttb': 
                            return 'background: linear-gradient(180deg, ' 
                                . $color . ' 0%, ' 
                                . hex2rgba($color, 0.88) . ' 50%, '
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'gr-df': 
                            return 'background: linear-gradient(180deg, ' 
                                . hex2rgba($color, 0) . ' 0%, ' 
                                . $color . ' 25%, ' 
                                . $color . ' 50%, ' 
                                . $color . ' 75%, ' 
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'gr-df-bold': 
                            return 'background: linear-gradient(180deg, ' 
                                . hex2rgba($color, 0) . ' 0%, ' 
                                . hex2rgba($color, 0.8) . ' 25%, ' 
                                . $color . ' 50%, ' 
                                . hex2rgba($color, 0.8) . ' 75%, ' 
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'clr': 
                            return 'background: ' . $color . ';';
                        default:
                            return 'background: ' . $color . ';';
                    }
                } else {
                    switch ($style) {
                        case 'gr-rtl': 
                            return 'background: linear-gradient(90deg, ' 
                                . $color . ' 0%, '
                                . hex2rgba($color, 0.88) . ' 50%, '
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'gr-ltr': 
                            return 'background: linear-gradient(90deg, ' 
                                . hex2rgba($color, 0) . ' 0%, ' 
                                . hex2rgba($color, 0.88) . ' 50%, '
                                . $color . ' 100%);';
                        case 'gr-df': 
                            return 'background: linear-gradient(90deg, ' 
                                . hex2rgba($color, 0) . ' 0%, ' 
                                . hex2rgba($color, 0.13) . ' 25%, ' 
                                . hex2rgba($color, 0.16) . ' 50%, ' 
                                . hex2rgba($color, 0.13) . ' 75%, ' 
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'gr-df-bold': 
                            return 'background: linear-gradient(90deg, ' 
                                . hex2rgba($color, 0) . ' 0%, ' 
                                . hex2rgba($color, 0.8) . ' 25%, ' 
                                . hex2rgba($color, 1) . ' 50%, ' 
                                . hex2rgba($color, 0.8) . ' 75%, ' 
                                . hex2rgba($color, 0) . ' 100%);';
                        case 'clr': 
                            return 'background: ' . $color . ';';
                        default:
                            return 'background: ' . $color . ';';
                    }
                }
            }
        }

        add_filter('pxl_element_container/before-render', function ($html, $settings) {
            if (!empty($settings['pxl_container_line_o']) && is_array($settings['pxl_container_line_o'])) {

                foreach ($settings['pxl_container_line_o'] as $item) {
                    $responsive_class_string = pxl_get_line_responsive_classes($settings, $item);
                    
                    $is_vertical = ($item === 'left' || $item === 'right' || strpos($item, 'vertical') !== false);
                    
                    $responsive_styles = pxl_get_responsive_line_styles($settings, $is_vertical);
                    
                    $laptop_css = pxl_generate_line_css(
                        $responsive_styles['laptop']['style'], 
                        $responsive_styles['laptop']['color'], 
                        $is_vertical
                    );
                    $tablet_landscape_css = pxl_generate_line_css(
                        $responsive_styles['tablet_landscape']['style'], 
                        $responsive_styles['tablet_landscape']['color'], 
                        $is_vertical
                    );
                    $tablet_portrait_css = pxl_generate_line_css(
                        $responsive_styles['tablet_portrait']['style'], 
                        $responsive_styles['tablet_portrait']['color'], 
                        $is_vertical
                    );
                    $mobile_landscape_css = pxl_generate_line_css(
                        $responsive_styles['mobile_landscape']['style'], 
                        $responsive_styles['mobile_landscape']['color'], 
                        $is_vertical
                    );
                    $mobile_portrait_css = pxl_generate_line_css(
                        $responsive_styles['mobile_portrait']['style'], 
                        $responsive_styles['mobile_portrait']['color'], 
                        $is_vertical
                    );

                    $html .= '<span class="pxl-line pxl-line__' . esc_attr($item) . $responsive_class_string . '"
                    data-laptop-style="' . esc_attr($laptop_css) . '"
                    data-tablet-landscape-style="' . esc_attr($tablet_landscape_css) . '"
                    data-tablet-portrait-style="' . esc_attr($tablet_portrait_css) . '"
                    data-mobile-landscape-style="' . esc_attr($mobile_landscape_css) . '"
                    data-mobile-portrait-style="' . esc_attr($mobile_portrait_css) . '"
                    style="' . $laptop_css . '"></span>';
                }
            }
            return $html;
        }, 10, 2);

        add_action('wp_footer', function() {
            ?>
            <script>
            (function() {
                function applyResponsiveLineStyles() {
                    const lines = document.querySelectorAll('.pxl-line[data-laptop-style]');
                    const windowWidth = window.innerWidth;
                    
                    lines.forEach(line => {
                        let targetStyle = '';
                        
                        if (windowWidth <= 575) {
                            targetStyle = line.getAttribute('data-mobile-portrait-style') || 
                                        line.getAttribute('data-mobile-landscape-style') ||
                                        line.getAttribute('data-tablet-portrait-style') ||
                                        line.getAttribute('data-tablet-landscape-style') ||
                                        line.getAttribute('data-laptop-style');
                        } else if (windowWidth >= 576 && windowWidth <= 767) {
                            targetStyle = line.getAttribute('data-mobile-landscape-style') || 
                                        line.getAttribute('data-tablet-portrait-style') ||
                                        line.getAttribute('data-tablet-landscape-style') ||
                                        line.getAttribute('data-laptop-style');
                        } else if (windowWidth >= 768 && windowWidth <= 1024) {
                            targetStyle = line.getAttribute('data-tablet-portrait-style') || 
                                        line.getAttribute('data-tablet-landscape-style') ||
                                        line.getAttribute('data-laptop-style');
                        } else if (windowWidth >= 1025 && windowWidth <= 1366) {
                            targetStyle = line.getAttribute('data-tablet-landscape-style') || 
                                        line.getAttribute('data-laptop-style');
                        } else {
                            targetStyle = line.getAttribute('data-laptop-style');
                        }
                        
                        if (targetStyle) {
                            const currentStyles = line.style.cssText
                                .replace(/background[^;]*;?/g, '')
                                .replace(/;\s*;/g, ';')
                                .replace(/^;|;$/g, '')
                                .trim();
                            
                            line.style.cssText = targetStyle + (currentStyles ? '; ' + currentStyles : '');
                        }
                    });
                }
                
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyResponsiveLineStyles);
                } else {
                    applyResponsiveLineStyles();
                }
                
                let resizeTimeout;
                window.addEventListener('resize', function() {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(applyResponsiveLineStyles, 100);
                });
                
                if (typeof elementorFrontend !== 'undefined') {
                    elementorFrontend.hooks.addAction('frontend/element_ready/global', function() {
                        setTimeout(applyResponsiveLineStyles, 100);
                    });
                    
                    elementorFrontend.hooks.addAction('frontend/element_ready/container', function() {
                        setTimeout(applyResponsiveLineStyles, 50);
                    });
                }
                
                window.addEventListener('load', function() {
                    setTimeout(applyResponsiveLineStyles, 200);
                });
                
                window.debugResponsiveLines = function() {
                    console.log('Current window width:', window.innerWidth);
                    const lines = document.querySelectorAll('.pxl-line[data-laptop-style]');
                    lines.forEach((line, index) => {
                        console.log(`Line ${index + 1} - Inheritance Chain:`, {
                            classes: line.className,
                            inheritance: {
                                '5_laptop': line.getAttribute('data-laptop-style'),
                                '4_tablet_landscape': line.getAttribute('data-tablet-landscape-style'),
                                '3_tablet_portrait': line.getAttribute('data-tablet-portrait-style'),
                                '2_mobile_landscape': line.getAttribute('data-mobile-landscape-style'),
                                '1_mobile_portrait': line.getAttribute('data-mobile-portrait-style')
                            },
                            currentStyle: line.style.cssText
                        });
                    });
                };
                
            })();
            </script>
            <?php
        });
    
        // Container Overlay
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_overlay',
                    [
                        'label' => __('Background Container Overlay', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
    
                $element->add_control(
                    'pxl_container_overlay_sides',
                    [
                        'label' => esc_html__('Container Overlay Sides', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT2,
                        'multiple' => true,
                        'options' => [
                            'top'    => esc_html__('Top', 'brighthub'),
                            'left'   => esc_html__('Left', 'brighthub'),
                            'right'  => esc_html__('Right', 'brighthub'),
                            'bottom' => esc_html__('Bottom', 'brighthub'),
                            'full' => esc_html__('Full Dark', 'brighthub'),
                            'full-light' => esc_html__('Full Light', 'brighthub'),
                        ],
                        'default' => [],
                    ]
                );

                $element->add_control(
                    'pxl_container_overlay_type',
                    [
                        'label' => esc_html__('Container Overlay Type', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'multiple' => true,
                        'options' => [
                            'default'    => esc_html__('Default', 'brighthub'),
                            '3d'   => esc_html__('3D Grid', 'brighthub'),
                            '3d-line'   => esc_html__('3D Grid Has Line', 'brighthub'),
                            'upload'   => esc_html__('Upload', 'brighthub'),
                        ],
                        'default' => 'default',
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_zindex',
                    [
                        'label' => esc_html__('Container Overlay z-index', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item' => 'z-index: {{VALUE}}',
                        ],
                    ]
                );
                
                $element->add_responsive_control(
                    'pxl_container_overlay_lw',
                    [
                        'label' => esc_html__('Container Overlay Left Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%' ],
                        'control_type' => 'responsive',
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                            '%' => [
                                'min' => 0,
                                'max' => 100,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-left' => 'width: {{SIZE}}{{UNIT}};',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'left',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_limg',
                    [
                        'label' => esc_html__('Container Overlay Left Image', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::MEDIA,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-left' => 'background: url({{pxl_container_overlay_limg.url}}) no-repeat center;',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'left',
                            'pxl_container_overlay_type' => 'upload',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_bgpl',
                    [
                        'label' => esc_html__('Container Overlay Left Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'top left'    => esc_html__('Top Left', 'brighthub'),
                            'top right'    => esc_html__('Top Right', 'brighthub'),
                            'bottom right'   => esc_html__('Bottom Right', 'brighthub'),
                            'bottom left'   => esc_html__('Bottom Left', 'brighthub'),
                            'center'   => esc_html__('Center', 'brighthub'),
                            'center top'   => esc_html__('Center Top', 'brighthub'),
                            'center bottom'   => esc_html__('Center Bottom', 'brighthub'),
                            'center left'   => esc_html__('Center Left', 'brighthub'),
                            'center right'   => esc_html__('Center Right', 'brighthub'),
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-left' => 'background-position: {{VALUE}}',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'left',
                        ],
                    ]
                );
                $element->add_responsive_control(
                    'pxl_container_overlay_rw',
                    [
                        'label' => esc_html__('Container Overlay Right Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%' ],
                        'control_type' => 'responsive',
                        'separator' => 'before',
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                            '%' => [
                                'min' => 0,
                                'max' => 100,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-right' => 'width: {{SIZE}}{{UNIT}};',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'right',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_rimg',
                    [
                        'label' => esc_html__('Container Overlay Right Image', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::MEDIA,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-right' => 'background: url({{pxl_container_overlay_rimg.url}}) no-repeat center;',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'right',
                            'pxl_container_overlay_type' => 'upload',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_bgpr',
                    [
                        'label' => esc_html__('Container Overlay Right Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'top left'    => esc_html__('Top Left', 'brighthub'),
                            'top right'    => esc_html__('Top Right', 'brighthub'),
                            'bottom right'   => esc_html__('Bottom Right', 'brighthub'),
                            'bottom left'   => esc_html__('Bottom Left', 'brighthub'),
                            'center'   => esc_html__('Center', 'brighthub'),
                            'center top'   => esc_html__('Center Top', 'brighthub'),
                            'center bottom'   => esc_html__('Center Bottom', 'brighthub'),
                            'center left'   => esc_html__('Center Left', 'brighthub'),
                            'center right'   => esc_html__('Center Right', 'brighthub'),
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-right' => 'background-position: {{VALUE}}',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'right',
                        ],
                    ]
                );
                
                $element->add_responsive_control(
                    'pxl_container_overlay_tw',
                    [
                        'label' => esc_html__('Container Overlay Top Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'control_type' => 'responsive',
                        'size_units' => [ 'px', '%' ],
                        'separator' => 'before',
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                            '%' => [
                                'min' => 0,
                                'max' => 100,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-top' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'top',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_timg',
                    [
                        'label' => esc_html__('Container Overlay Top Image', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::MEDIA,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-top' => 'background: url({{pxl_container_overlay_timg.url}}) no-repeat center;',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'top',
                            'pxl_container_overlay_type' => 'upload',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_bgpt',
                    [
                        'label' => esc_html__('Container Overlay Top Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'top left'    => esc_html__('Top Left', 'brighthub'),
                            'top right'    => esc_html__('Top Right', 'brighthub'),
                            'bottom right'   => esc_html__('Bottom Right', 'brighthub'),
                            'bottom left'   => esc_html__('Bottom Left', 'brighthub'),
                            'center'   => esc_html__('Center', 'brighthub'),
                            'center top'   => esc_html__('Center Top', 'brighthub'),
                            'center bottom'   => esc_html__('Center Bottom', 'brighthub'),
                            'center left'   => esc_html__('Center Left', 'brighthub'),
                            'center right'   => esc_html__('Center Right', 'brighthub'),
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-top' => 'background-position: {{VALUE}}',
                        ],
                       'condition' => [
                            'pxl_container_overlay_sides' => 'top',
                        ],
                    ]
                );
                
                $element->add_responsive_control(
                    'pxl_container_overlay_bw',
                    [
                        'label' => esc_html__('Container Overlay Bottom Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%' ],
                        'control_type' => 'responsive',
                        'separator' => 'before',
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                            '%' => [
                                'min' => 0,
                                'max' => 100,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-bottom' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'bottom',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_bimg',
                    [
                        'label' => esc_html__('Container Overlay Bottom Image', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::MEDIA,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-bottom' => 'background: url({{pxl_container_overlay_bimg.url}}) no-repeat center;',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'bottom',
                            'pxl_container_overlay_type' => 'upload',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_overlay_bgbp',
                    [
                        'label' => esc_html__('Container Overlay Bottom Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'top left'    => esc_html__('Top Left', 'brighthub'),
                            'top right'    => esc_html__('Top Right', 'brighthub'),
                            'bottom right'   => esc_html__('Bottom Right', 'brighthub'),
                            'bottom left'   => esc_html__('Bottom Left', 'brighthub'),
                            'center'   => esc_html__('Center', 'brighthub'),
                            'center top'   => esc_html__('Center Top', 'brighthub'),
                            'center bottom'   => esc_html__('Center Bottom', 'brighthub'),
                            'center left'   => esc_html__('Center Left', 'brighthub'),
                            'center right'   => esc_html__('Center Right', 'brighthub'),
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-bottom' => 'background-position: {{VALUE}}',
                        ],
                        'condition' => [
                            'pxl_container_overlay_sides' => 'bottom',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_overlay_bgs',
                    [
                        'label' => esc_html__('Container Overlay Size', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'auto'    => esc_html__('Auto', 'brighthub'),
                            'cover'    => esc_html__('Cover', 'brighthub'),
                            'contain'   => esc_html__('Contain', 'brighthub'),
                            'percent'   => esc_html__('Percent', 'brighthub'),
                            'pixel'   => esc_html__('Pixel', 'brighthub'),
                        ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item' => 'background-size: {{VALUE}}',
                        ],
                        'condition' => [
                            'pxl_container_overlay_type' => 'upload',
                        ],
                    ]
                );
                
                $element->add_control(
                    'pxl_container_overlay_bgsvalue',
                    [
                        'label' => esc_html__('Container Overlay Background Size', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::DIMENSIONS,
                        'size_units' => [ 'px', '%' ],
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item' => 'background-size: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}};',
                        ],
                        'condition' => [
                            'pxl_container_overlay_bgs' => [
                                'percent',
                                'pixel',
                            ],
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_bgsize',
                    [
                        'label' => esc_html__('Container Overlay Size', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::DIMENSIONS,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item' => 'background-size: {{VALUE}}',
                        ],
                        'condition' => [
                            'pxl_container_overlay_bgs' => ['percent', 'pixel'],
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_overlay_color',
                    [
                        'label' => esc_html__('Container Overlay Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} > .pxl-container-overlay__item-left' => 'background: linear-gradient(90deg, {{VALUE}} 0%, rgba(0, 0, 0, 0.00) 100%);',
                            '{{WRAPPER}} > .pxl-container-overlay__item-right' => 'background: linear-gradient(270deg, {{VALUE}} 0%, rgba(0, 0, 0, 0.00) 100%);',
                            '{{WRAPPER}} > .pxl-container-overlay__item-top' => 'background: linear-gradient(180deg, {{VALUE}} 0%, rgba(0, 0, 0, 0.00) 100%);',
                            '{{WRAPPER}} > .pxl-container-overlay__item-bottom' => 'background: linear-gradient(0deg, {{VALUE}} 0%, rgba(0, 0, 0, 0.00) 100%);',
                        ],
                        'condition' => [
                            'pxl_container_overlay_type' => 'default',
                        ],
                    ]
                );
    
                $element->end_controls_section();
            }
        }, 10, 2);
    
        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_container_overlay_sides']) && is_array($settings['pxl_container_overlay_sides'])) {
                $sides = $settings['pxl_container_overlay_sides'];
                $type = $settings['pxl_container_overlay_type'];
                foreach ($sides as $side) {
                    $html .= '<span class="pxl-container-overlay__item pxl-container-overlay__item-' . esc_attr($side) . ' pxl-container-overlay__item-' . esc_attr($type) . '"></span>';
                }
            }
    
            return $html;
        }, 10, 2);

        // Dot
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_dot',
                    [
                        'label' => __('Dot Container', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );

                $element->add_control(
                    'pxl_dot_container_pos',
                    [
                        'label' => esc_html__('Dot Container Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT2,
                        'multiple' => true,
                        'options' => [
                            'top'    => esc_html__('Top Left', 'brighthub'),
                            'left'   => esc_html__('Top Right', 'brighthub'),
                            'right'  => esc_html__('Bottom Right', 'brighthub'),
                            'bottom' => esc_html__('Bottom Left', 'brighthub'),
                        ],
                        'default' => [],
                    ]
                );
                $element->add_control(
                    'pxl_dot_container_type',
                    [
                        'label' => esc_html__('Dot Container Type', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'default' => esc_html__('Default', 'brighthub'),
                            'cut-corner' => esc_html__('Cut Corner', 'brighthub'),
                        ],
                        'default' => 'default',
                    ]
                );

                $element->add_control(
                    'pxl_dot_container_w',
                    [
                        'label' => esc_html__('Dot Container Width', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px'],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-dot' => 'width: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_dot_container_h',
                    [
                        'label' => esc_html__('Dot Container Height', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px'],
                        'range' => [
                            'px' => [
                                'min' => 0,
                                'max' => 300,
                            ],
                        ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-dot' => 'height: {{SIZE}}{{UNIT}};',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_dot_container_r',
                    [
                        'label' => esc_html__('Dot Border Radius', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::DIMENSIONS,
                        'size_units' => [ 'px', '%' ],
                        'selectors' => [
                            '{{WRAPPER}} .pxl-dot' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                        ],
                    ]
                );
    
                $element->add_control(
                    'pxl_dot_container_clr',
                    [
                        'label' => esc_html__('Dot Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-dot.pxl-dot__default' => 'background-color: {{VALUE}};',
                            '{{WRAPPER}} .pxl-dot.pxl-dot__cut-corner' => 'border-color: {{VALUE}};',
                        ],
                    ]
                );
    
                $element->end_controls_section();
            }
        }, 10, 2);

    
        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_dot_container_pos']) && is_array($settings['pxl_dot_container_pos'])) {
                $items = $settings['pxl_dot_container_pos'];
    
                foreach ($items as $item) {
                    $html .= '<span class="pxl-dot pxl-dot__' . esc_attr($item) . ' pxl-dot__' . esc_attr($settings['pxl_dot_container_type']) . '"></span>';
                }
            }
    
            return $html;
        }, 10, 2);

        // Background Reveal Dot
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_background_reveal_dot',
                    [
                        'label' => __('Background Reveal Dot', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                        'description' => esc_html__('Background Dark is Recommended', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_background_reveal_dot_pos',
                    [
                        'label' => esc_html__('Background Reveal Dot Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'none'    => esc_html__('None', 'brighthub'),
                            'top-left'    => esc_html__('Top Left', 'brighthub'),
                            'top-right'   => esc_html__('Top Right', 'brighthub'),
                            'bottom-left' => esc_html__('Bottom Left', 'brighthub'),
                            'bottom-right'  => esc_html__('Bottom Right', 'brighthub'),
                            'center-top' => esc_html__('Center Top', 'brighthub'),
                            'center-bottom' => esc_html__('Center Bottom', 'brighthub'),
                            'center-left' => esc_html__('Center Left', 'brighthub'),
                            'center-right' => esc_html__('Center Right', 'brighthub'),
                            'center-center' => esc_html__('Center Center', 'brighthub'),
                            'auto' => esc_html__('Auto run', 'brighthub'),
                        ],
                        'default' => '',
                    ]
                );

                $element->add_control(
                    'pxl_background_reveal_extra_light_pos',
                    [
                        'label' => esc_html__('Background Reveal Extra Light Position', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'none'    => esc_html__('None', 'brighthub'),
                            'top-left'    => esc_html__('Top Left', 'brighthub'),
                            'top-right'   => esc_html__('Top Right', 'brighthub'),
                            'bottom-left' => esc_html__('Bottom Left', 'brighthub'),
                            'bottom-right'  => esc_html__('Bottom Right', 'brighthub'),
                            'center-top' => esc_html__('Center Top', 'brighthub'),
                            'center-bottom' => esc_html__('Center Bottom', 'brighthub'),
                            'center-left' => esc_html__('Center Left', 'brighthub'),
                            'center-right' => esc_html__('Center Right', 'brighthub'),
                            'center-center' => esc_html__('Center Center', 'brighthub'),
                        ],
                        'default' => 'none',
                    ]
                );

                $element->add_control(
                    'pxl_background_reveal_extra_light_color',
                    [
                        'label' => esc_html__('Background Reveal Extra Light Color', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-reveal-extra-light' => '--color-extra-light: {{VALUE}};',
                        ],
                    ]
                );
    
                $element->end_controls_section();
            }
        }, 10, 2);
    
        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_background_reveal_dot_pos'] ) && $settings['pxl_background_reveal_dot_pos'] !== 'none') {
                $pos = $settings['pxl_background_reveal_dot_pos'];
                $uid = uniqid('pxl-reveal-');

                $html .= '<div class="pxl-background-reveal-dot-wrap pxl-background-reveal-dot__' . esc_attr($pos) . '" data-reveal-pos="' . esc_attr($pos) . '">';
                $html .= '<svg class="pxl-background-reveal-dot-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">';
                $html .= '<defs>
                    <pattern id="'.$uid.'-dots" x="0" y="0" width="35" height="35" patternUnits="userSpaceOnUse">
                        <circle cx="0" cy="0" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="17.5" cy="0" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="35" cy="0" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="8.75" cy="17.5" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="26.25" cy="17.5" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="43.75" cy="17.5" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="0" cy="35" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="17.5" cy="35" r="1.5" fill="white" opacity="0.3" />
                        <circle cx="35" cy="35" r="1.5" fill="white" opacity="0.3" />
                    </pattern>
                    <radialGradient id="'.$uid.'-light-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stop-color="white" stop-opacity="1" />
                        <stop offset="25%" stop-color="white" stop-opacity="0.9" />
                        <stop offset="50%" stop-color="white" stop-opacity="0.7" />
                        <stop offset="70%" stop-color="white" stop-opacity="0.4" />
                        <stop offset="85%" stop-color="white" stop-opacity="0.15" />
                        <stop offset="100%" stop-color="white" stop-opacity="0" />
                    </radialGradient>
                    <mask id="'.$uid.'-light-mask">
                        <rect width="100%" height="100%" fill="black" />
                        <ellipse id="'.$uid.'-light" cx="50%" cy="50%" rx="40%" ry="25%" fill="url(#'.$uid.'-light-grad)" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="url(#'.$uid.'-dots)" mask="url(#'.$uid.'-light-mask)" />
                </svg>';

                $html .= '<span class="pxl-background-reveal-dot pxl-background-reveal-dot__' . esc_attr($pos) . '"></span>';
                $html .= '</div>';
            }

            // Extra Light Background
            if (!empty($settings['pxl_background_reveal_extra_light_pos']) && $settings['pxl_background_reveal_extra_light_pos'] !== 'none') {
                $extra_light_pos = $settings['pxl_background_reveal_extra_light_pos'];
                $html .= '<div class="pxl-background-reveal-extra-light pxl-background-reveal-extra-light__' . esc_attr($extra_light_pos) . '"></div>';
            }

            return $html;
        }, 10, 2);

        // Background Gradient glow
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_background_gradient_glow',
                    [
                        'label' => __('Background Gradient Glow', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                        'description' => esc_html__('Background Dark is Recommended', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_background_gradient_glow_pos',
                    [
                        'label' => esc_html__('Background Gradient Glow Positions', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::SELECT2,
                        'multiple' => true,
                        'options' => [
                            'top-left'    => esc_html__('Top Left', 'brighthub'),
                            'top-right'   => esc_html__('Top Right', 'brighthub'),
                            'bottom-left' => esc_html__('Bottom Left', 'brighthub'),
                            'bottom-right'  => esc_html__('Bottom Right', 'brighthub'),
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_background_gradient_glow_color1',
                    [
                        'label' => esc_html__('Background Gradient Glow Color 1', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-gradient-glow' => '--color-gradient-glow-1: {{VALUE}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_background_gradient_glow_color2',
                    [
                        'label' => esc_html__('Background Gradient Glow Color 2', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-gradient-glow' => '--color-gradient-glow-2: {{VALUE}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_background_gradient_glow_ray_color1',
                    [
                        'label' => esc_html__('Left Light Ray Color 1', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'default' => '#FBE414',
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-gradient-glow' => '--ray-color-1: {{VALUE}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_background_gradient_glow_ray_color2',
                    [
                        'label' => esc_html__('Left Light Ray Color 2', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'default' => '#FB6514',
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-gradient-glow' => '--ray-color-2: {{VALUE}};',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_background_gradient_glow_ray_color3',
                    [
                        'label' => esc_html__('Left Light Ray Color 3', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::COLOR,
                        'default' => '#FBE414',
                        'selectors' => [
                            '{{WRAPPER}} .pxl-background-gradient-glow' => '--ray-color-3: {{VALUE}};',
                        ],
                    ]
                );

                $element->end_controls_section();
            }
        }, 10, 2);
    
        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_background_gradient_glow_pos'] ) && is_array($settings['pxl_background_gradient_glow_pos'])) {
                $pos = $settings['pxl_background_gradient_glow_pos'];
                
                // Get custom gradient colors or use defaults
                $gradient_color1 = !empty($settings['pxl_background_gradient_glow_color1']) ? $settings['pxl_background_gradient_glow_color1'] : '#FBE414';
                $gradient_color2 = !empty($settings['pxl_background_gradient_glow_color2']) ? $settings['pxl_background_gradient_glow_color2'] : '#FB6514';
                
                // Get custom ray colors or use defaults
                $ray_color1 = !empty($settings['pxl_background_gradient_glow_ray_color1']) ? $settings['pxl_background_gradient_glow_ray_color1'] : '#FBE414';
                $ray_color2 = !empty($settings['pxl_background_gradient_glow_ray_color2']) ? $settings['pxl_background_gradient_glow_ray_color2'] : '#FB6514';
                $ray_color3 = !empty($settings['pxl_background_gradient_glow_ray_color3']) ? $settings['pxl_background_gradient_glow_ray_color3'] : '#FBE414';
                
                $svg_content = '<svg width="1049" height="947" viewBox="0 0 1049 947" fill="none" xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink">
                                <g opacity="0.91">
                                    <mask id="mask0_4824_7798" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-136" y="-120" width="1067"
                                    height="1067">
                                    <g opacity="0.12">
                                        <rect width="828.987" height="679.669"
                                        transform="matrix(-0.707107 -0.707107 -0.707107 0.707107 930.785 466.183)"
                                        fill="url(#pattern0_4824_7798)" />
                                    </g>
                                    </mask>
                                    <g mask="url(#mask0_4824_7798)">
                                    <g style="mix-blend-mode:plus-darker" filter="url(#filter0_f_4824_7798)">
                                        <ellipse cx="187.507" cy="203.843" rx="187.507" ry="203.843"
                                        transform="matrix(-0.707107 0.707107 0.707107 0.707107 65.4043 -198.66)" fill="' . esc_attr($gradient_color1) . '" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-2" opacity="0.3" filter="url(#filter1_f_4824_7798)">
                                        <rect width="81.2867" height="575.792"
                                        transform="matrix(-0.724596 0.689174 0.691922 0.721972 184.064 52.9512)"
                                        fill="url(#paint0_linear_4824_7798)" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-3" opacity="0.8" filter="url(#filter2_f_4824_7798)">
                                        <rect width="81.2844" height="575.805"
                                        transform="matrix(-0.695489 0.718537 0.716815 0.697263 138.777 95.7988)"
                                        fill="url(#paint1_linear_4824_7798)" />
                                    </g>
                                    </g>
                                </g>
                                <g opacity="0.72">
                                    <g style="mix-blend-mode:plus-darker" filter="url(#filter3_f_4824_7798)">
                                    <ellipse cx="187.507" cy="203.843" rx="187.507" ry="203.843"
                                        transform="matrix(-0.707107 0.707107 0.707107 0.707107 65.1855 -198.986)" fill="' . esc_attr($gradient_color2) . '" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-5" opacity="0.3" filter="url(#filter4_f_4824_7798)">
                                    <rect width="81.2867" height="575.792"
                                        transform="matrix(-0.724596 0.689174 0.691922 0.721972 183.846 52.6255)"
                                        fill="url(#paint2_linear_4824_7798)" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-6" opacity="0.8" filter="url(#filter5_f_4824_7798)">
                                    <rect width="81.2844" height="575.805"
                                        transform="matrix(-0.695489 0.718537 0.716815 0.697263 138.559 95.4731)"
                                        fill="url(#paint3_linear_4824_7798)" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-7" opacity="0.8" filter="url(#filter6_f_4824_7798)">
                                    <path d="M93.7031 153.839L367.956 428.092" stroke="url(#paint4_linear_4824_7798)" stroke-width="2.43429" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-8" opacity="0.8" filter="url(#filter7_f_4824_7798)">
                                    <path d="M186.844 87.9175L461.097 362.171" stroke="url(#paint5_linear_4824_7798)" stroke-width="2.43429" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-9" opacity="0.8" filter="url(#filter8_f_4824_7798)">
                                    <path d="M191.887 173.587L397.204 378.904" stroke="url(#paint6_linear_4824_7798)" stroke-width="0.608573" />
                                    </g>
                                </g>
                                <g opacity="0.3" filter="url(#filter9_f_4824_7798)">
                                    <g style="mix-blend-mode:plus-darker" filter="url(#filter10_f_4824_7798)">
                                    <ellipse cx="187.507" cy="217.922" rx="187.507" ry="217.922"
                                        transform="matrix(-0.707107 0.707107 0.707107 0.707107 272.098 -264)" fill="' . esc_attr($gradient_color1) . '" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-11" opacity="0.3" filter="url(#filter11_f_4824_7798)">
                                    <path d="M403.543 0.397949L344.544 56.3192L771.06 500.138L830.059 444.217L403.543 0.397949Z"
                                        fill="url(#paint7_linear_4824_7798)" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-12" opacity="0.8" filter="url(#filter12_f_4824_7798)">
                                    <rect width="81.286" height="615.566" transform="matrix(-0.69468 0.719319 0.716192 0.697903 358.174 43.1611)"
                                        fill="url(#paint8_linear_4824_7798)" />
                                    </g>
                                </g>
                                <g opacity="0.3" filter="url(#filter13_f_4824_7798)">
                                    <g style="mix-blend-mode:plus-darker" filter="url(#filter14_f_4824_7798)">
                                    <ellipse cx="187.507" cy="179.945" rx="187.507" ry="179.945"
                                        transform="matrix(-0.707107 0.707107 0.707107 0.707107 525.789 -253.622)" fill="' . esc_attr($gradient_color2) . '" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-14" opacity="0.8" filter="url(#filter15_f_4824_7798)">
                                    <rect width="81.281" height="508.319" transform="matrix(-0.72257 0.691298 0.689882 0.723922 622.742 -23.7158)"
                                        fill="url(#paint9_linear_4824_7798)" />
                                    </g>
                                    <g class="pxl-light-ray pxl-light-ray-15" opacity="0.8" filter="url(#filter16_f_4824_7798)">
                                    <rect width="81.2821" height="508.312" transform="matrix(-0.69686 0.717207 0.718094 0.695946 577.6 19.2744)"
                                        fill="url(#paint10_linear_4824_7798)" />
                                    </g>
                                </g>
                                <g opacity="0.4" filter="url(#filter17_f_4824_7798)">
                                    <ellipse cx="28.0618" cy="284.79" rx="28.0618" ry="284.79"
                                    transform="matrix(-0.707107 0.707107 0.707107 0.707107 450.471 16.4922)"
                                    fill="url(#paint11_linear_4824_7798)" />
                                </g>
                                <g opacity="0.4" filter="url(#filter18_f_4824_7798)">
                                    <ellipse cx="28.0618" cy="284.79" rx="28.0618" ry="284.79"
                                    transform="matrix(-0.707107 0.707107 0.707107 0.707107 231.676 -23.1934)"
                                    fill="url(#paint12_linear_4824_7798)" />
                                </g>
                                <defs>
                                    <pattern id="pattern0_4824_7798" patternContentUnits="objectBoundingBox" width="0.277039" height="0.405483">
                                    <use xlink:href="#image0_4824_7798" transform="scale(0.000277039 0.000337903)" />
                                    </pattern>
                                    <filter id="filter0_f_4824_7798" x="-240.605" y="-239.495" width="635.122" height="635.122"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="60.8573" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter1_f_4824_7798" x="111.106" y="38.8931" width="485.419" height="499.843"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="7.02902" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter2_f_4824_7798" x="57.4144" y="70.9691" width="518.939" height="509.553"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="12.4149" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter3_f_4824_7798" x="-240.824" y="-239.82" width="635.122" height="635.122"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="60.8573" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter4_f_4824_7798" x="110.887" y="38.5675" width="485.419" height="499.843"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="7.02902" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter5_f_4824_7798" x="57.1956" y="70.6434" width="518.939" height="509.553"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="12.4149" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter6_f_4824_7798" x="80.9912" y="141.128" width="299.676" height="299.676"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="5.92528" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter7_f_4824_7798" x="174.132" y="75.2061" width="299.676" height="299.676"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="5.92528" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter8_f_4824_7798" x="179.821" y="161.521" width="229.449" height="229.449"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="5.92528" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter9_f_4824_7798" x="75.664" y="-195.258" width="769.047" height="741.148"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="7.32622" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter10_f_4824_7798" x="-31.3981" y="-302.32" width="650.003" height="650.004"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="60.8573" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter11_f_4824_7798" x="330.763" y="-13.3818" width="513.075" height="527.3"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="6.88986" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter12_f_4824_7798" x="275.985" y="17.439" width="548.774" height="539.52"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="12.8611" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter13_f_4824_7798" x="322.023" y="-192.212" width="666.051" height="638.193"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="7.32622" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter14_f_4824_7798" x="216.333" y="-297.903" width="608.217" height="608.216"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="60.1715" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter15_f_4824_7798" x="527.266" y="-60.4618" width="482.902" height="497.664"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="18.373" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter16_f_4824_7798" x="484.211" y="-17.4715" width="495.15" height="485.546"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="18.373" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter17_f_4824_7798" x="383.706" y="-10.5877" width="496.597" height="496.598"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="22.9662" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter18_f_4824_7798" x="189.715" y="-25.4697" width="446.99" height="446.991"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="10.5645" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter20_f_4824_7798" x="-20" y="100" width="200" height="400"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="7.02902" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter22_f_4824_7798" x="-20" y="170" width="200" height="450"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="12.4149" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <filter id="filter24_f_4824_7798" x="5" y="285" width="160" height="180"
                                    filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation="5.92528" result="effect1_foregroundBlur_4824_7798" />
                                    </filter>
                                    <linearGradient id="paint0_linear_4824_7798" x1="52.6623" y1="0" x2="52.6623" y2="575.792"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.8" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint1_linear_4824_7798" x1="40.6422" y1="0" x2="40.6422" y2="575.805"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.88" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint2_linear_4824_7798" x1="52.6623" y1="0" x2="52.6623" y2="575.792"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.8" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint3_linear_4824_7798" x1="40.6422" y1="0" x2="40.6422" y2="575.805"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.88" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint4_linear_4824_7798" x1="93.3496" y1="154.193" x2="367.603" y2="428.446"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.796199" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint5_linear_4824_7798" x1="186.49" y1="88.271" x2="460.743" y2="362.524"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.796199" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint6_linear_4824_7798" x1="191.533" y1="173.94" x2="396.85" y2="379.258"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.796199" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint7_linear_4824_7798" x1="374.043" y1="28.3586" x2="797.477" y2="475.1"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.88" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint8_linear_4824_7798" x1="40.643" y1="0" x2="40.643" y2="615.566"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.88" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint9_linear_4824_7798" x1="51.2676" y1="-197.614" x2="47.4468" y2="508.356"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.802306" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint10_linear_4824_7798" x1="51.2683" y1="-197.611" x2="47.4476" y2="508.349"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color1) . '" />
                                    <stop offset="0.802306" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint11_linear_4824_7798" x1="35.3997" y1="-221.429" x2="28.4523" y2="569.582"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.802306" stop-color="' . esc_attr($gradient_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint12_linear_4824_7798" x1="35.3997" y1="-221.429" x2="28.4523" y2="569.582"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($gradient_color2) . '" />
                                    <stop offset="0.802306" stop-color="' . esc_attr($gradient_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint13_linear_4824_7798" x1="40.6433" y1="0" x2="40.6433" y2="450.792"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($ray_color1) . '" />
                                    <stop offset="0.8" stop-color="' . esc_attr($ray_color1) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint14_linear_4824_7798" x1="40.6422" y1="0" x2="40.6422" y2="480.805"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($ray_color2) . '" />
                                    <stop offset="0.88" stop-color="' . esc_attr($ray_color2) . '" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="paint15_linear_4824_7798" x1="20.3496" y1="301.193" x2="150.603" y2="450.446"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="' . esc_attr($ray_color3) . '" />
                                    <stop offset="0.796199" stop-color="' . esc_attr($ray_color3) . '" stop-opacity="0" />
                                    </linearGradient>
                                </defs>
                        </svg>';
                
                foreach ($pos as $item) {
                    $html .= '<div class="pxl-background-gradient-glow-wrap pxl-background-gradient-glow pxl-background-gradient-glow__' . esc_attr($item) . '" data-gradient-glow-pos="' . esc_attr($item) . '">' . $svg_content . '</div>';
                }
            }
            return $html;
        }, 10, 2);

        add_action('wp_footer', function() {
            ?>
            <script>
                (function() {
                    var dots = document.querySelectorAll('.pxl-background-reveal-dot');
                    dots.forEach(function(dot) {
                        var parent = dot.parentElement;
                        if (!parent) return;
                        var style = window.getComputedStyle(parent);
                        if (style.position === 'static') {
                            parent.style.position = 'relative';
                        }
                    });

                    var svgContainers = document.querySelectorAll('.pxl-background-reveal-dot-svg');
                    svgContainers.forEach(function(svg) {
                        var container = svg.closest('.pxl-background-reveal-dot-wrap');
                        if (!container) return;

                        var lightCircle = svg.querySelector('circle[id$="-light"]') || svg.querySelector('ellipse[id$="-light"]');
                        if (!lightCircle) {
                            var lightMask = svg.querySelector('mask[id$="-light-mask"]');
                            if (lightMask) {
                                lightCircle = lightMask.querySelector('circle') || lightMask.querySelector('ellipse');
                            }
                        }
                        if (!lightCircle) return;

                        var dotSpan = container.querySelector('.pxl-background-reveal-dot');
                        if (!dotSpan) return;

                        dotSpan.style.position = 'absolute';

                        var posClass = container.getAttribute('data-reveal-pos') || '';
                        if (!posClass) {
                            for (var i = 0; i < container.classList.length; i++) {
                                var cls = container.classList[i];
                                if (cls.indexOf('pxl-background-reveal-dot__') === 0) {
                                    posClass = cls.replace('pxl-background-reveal-dot__', '');
                                    break;
                                }
                            }
                        }

                        function updateLightPosition(x, y) {
                            var rect = container.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) return;
                            
                            var percentX = (x / rect.width) * 100;
                            var percentY = (y / rect.height) * 100;
                            
                            var isEllipse = lightCircle.tagName.toLowerCase() === 'ellipse';
                            lightCircle.setAttribute('cx', percentX + '%');
                            lightCircle.setAttribute('cy', percentY + '%');
                            if (!isEllipse) {
                                var rPercent = calculateLightRadius();
                                lightCircle.setAttribute('r', rPercent + '%');
                            }
                            
                            dotSpan.style.background = 'radial-gradient(41.11% 49.57% at ' + percentX + '% ' + percentY + '%, rgba(204, 243, 255, 0.32) 0%, rgba(0, 0, 0, 0.00) 100%)';
                        }

                        function calculateLightRadius() {
                            var rect = container.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) return 30;
                            
                            var diagonal = Math.sqrt(rect.width * rect.width + rect.height * rect.height);
                            var maxSide = Math.max(rect.width, rect.height);
                            var rPercent = (diagonal * 0.3 / maxSide) * 100;
                            rPercent = Math.max(25, Math.min(60, rPercent));
                            return rPercent;
                        }
                        
                        function setFixedPosition() {
                            var rect = container.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) return;
                            
                            var rPercent = calculateLightRadius();
                            var isEllipse = lightCircle.tagName.toLowerCase() === 'ellipse';
                            if (isEllipse) {
                                lightCircle.setAttribute('rx', '40%');
                                lightCircle.setAttribute('ry', '25%');
                            } else {
                                lightCircle.setAttribute('r', rPercent + '%');
                            }
                            
                            var percentX = 50;
                            var percentY = 50;
                            var gradientX = 50;
                            var gradientY = 50;

                            if (posClass.indexOf('top-left') >= 0 || posClass === 'top-left') {
                                percentX = 5;
                                percentY = 5;
                                gradientX = 0;
                                gradientY = 0;
                            } else if (posClass.indexOf('top-right') >= 0 || posClass === 'top-right') {
                                percentX = 95;
                                percentY = 5;
                                gradientX = 100;
                                gradientY = 0;
                            } else if (posClass.indexOf('bottom-left') >= 0 || posClass === 'bottom-left') {
                                percentX = 5;
                                percentY = 95;
                                gradientX = 0;
                                gradientY = 100;
                            } else if (posClass.indexOf('bottom-right') >= 0 || posClass === 'bottom-right') {
                                percentX = 95;
                                percentY = 95;
                                gradientX = 100;
                                gradientY = 100;
                            } else if (posClass.indexOf('center-top') >= 0 || posClass === 'center-top') {
                                percentX = 50;
                                percentY = 0;
                                gradientX = 50;
                                gradientY = 0;
                            } else if (posClass.indexOf('center-bottom') >= 0 || posClass === 'center-bottom') {
                                percentX = 50;
                                percentY = 100;
                                gradientX = 50;
                                gradientY = 100;
                            } else if (posClass.indexOf('center-left') >= 0 || posClass === 'center-left') {
                                percentX = 0;
                                percentY = 50;
                                gradientX = 0;
                                gradientY = 50;
                            } else if (posClass.indexOf('center-right') >= 0 || posClass === 'center-right') {
                                percentX = 100;
                                percentY = 50;
                                gradientX = 100;
                                gradientY = 50;
                            } else if (posClass.indexOf('center-center') >= 0 || posClass === 'center-center') {
                                percentX = 50;
                                percentY = 50;
                                gradientX = 50;
                                gradientY = 50;
                            }

                            lightCircle.setAttribute('cx', percentX + '%');
                            lightCircle.setAttribute('cy', percentY + '%');
                            
                            dotSpan.style.background = 'radial-gradient(41.11% 49.57% at ' + gradientX + '% ' + gradientY + '%, rgba(204, 243, 255, 0.32) 0%, rgba(0, 0, 0, 0.00) 100%)';
                        }

                        function initLightSize() {
                            var rPercent = calculateLightRadius();
                            var isEllipse = lightCircle.tagName.toLowerCase() === 'ellipse';
                            if (isEllipse) {
                                lightCircle.setAttribute('rx', '40%');
                                lightCircle.setAttribute('ry', '25%');
                            } else {
                                if (rPercent === 30) {
                                    requestAnimationFrame(initLightSize);
                                    return;
                                }
                                lightCircle.setAttribute('r', rPercent + '%');
                            }
                        }
                        initLightSize();
                        
                        if (posClass === 'auto' || !posClass) {
                            container.addEventListener('mousemove', function(e) {
                                var rect = container.getBoundingClientRect();
                                var x = e.clientX - rect.left;
                                var y = e.clientY - rect.top;
                                updateLightPosition(x, y);
                            });
                        } else {
                            requestAnimationFrame(function() {
                                setFixedPosition();
                                requestAnimationFrame(setFixedPosition);
                            });
                            
                            var resizeObserver = new ResizeObserver(function() {
                                setFixedPosition();
                            });
                            if (ResizeObserver) {
                                resizeObserver.observe(container);
                            }
                            
                            window.addEventListener('resize', function() {
                                setFixedPosition();
                            });
                        }
                    });

                    // Extra Light Background
                    var extraLights = document.querySelectorAll('.pxl-background-reveal-extra-light');
                    extraLights.forEach(function(extraLight) {
                        var parent = extraLight.parentElement;
                        if (!parent) return;
                        var style = window.getComputedStyle(parent);
                        if (style.position === 'static') {
                            parent.style.position = 'relative';
                        }

                        var posClass = '';
                        for (var i = 0; i < extraLight.classList.length; i++) {
                            var cls = extraLight.classList[i];
                            if (cls.indexOf('pxl-background-reveal-extra-light__') === 0) {
                                posClass = cls.replace('pxl-background-reveal-extra-light__', '');
                                break;
                            }
                        }

                        function setExtraLightPosition() {
                            var rect = parent.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) return;

                            var gradientX = 50;
                            var gradientY = 0;
                            var colorExtraLight = getComputedStyle(extraLight).getPropertyValue('--color-extra-light');
                            
                            // Nếu không có màu từ CSS variable, sử dụng màu mặc định
                            if (!colorExtraLight || colorExtraLight.trim() === '') {
                                colorExtraLight = 'rgba(204, 243, 255, 0.56)';
                            } else {
                                colorExtraLight = colorExtraLight.trim();
                            }

                            // Xử lý pos để set gradient position
                            if (posClass) {
                                if (posClass === 'top-left' || posClass.indexOf('top-left') >= 0) {
                                    gradientX = 0;
                                    gradientY = 0;
                                } else if (posClass === 'top-right' || posClass.indexOf('top-right') >= 0) {
                                    gradientX = 100;
                                    gradientY = 0;
                                } else if (posClass === 'bottom-left' || posClass.indexOf('bottom-left') >= 0) {
                                    gradientX = 0;
                                    gradientY = 100;
                                } else if (posClass === 'bottom-right' || posClass.indexOf('bottom-right') >= 0) {
                                    gradientX = 100;
                                    gradientY = 100;
                                } else if (posClass === 'center-top' || posClass.indexOf('center-top') >= 0) {
                                    gradientX = 50;
                                    gradientY = 0;
                                } else if (posClass === 'center-bottom' || posClass.indexOf('center-bottom') >= 0) {
                                    gradientX = 50;
                                    gradientY = 100;
                                } else if (posClass === 'center-left' || posClass.indexOf('center-left') >= 0) {
                                    gradientX = 0;
                                    gradientY = 50;
                                } else if (posClass === 'center-right' || posClass.indexOf('center-right') >= 0) {
                                    gradientX = 100;
                                    gradientY = 50;
                                } else if (posClass === 'center-center' || posClass.indexOf('center-center') >= 0) {
                                    gradientX = 50;
                                    gradientY = 50;
                                }
                            }

                            // Áp dụng background với màu và pos tương ứng
                            extraLight.style.background = 'radial-gradient(27.52% 29.03% at ' + gradientX + '% ' + gradientY + '%, ' + colorExtraLight + ' 0%, rgba(0, 0, 0, 0.00) 100%)';
                        }

                        requestAnimationFrame(function() {
                            setExtraLightPosition();
                            requestAnimationFrame(setExtraLightPosition);
                        });

                        var resizeObserverExtra = new ResizeObserver(function() {
                            setExtraLightPosition();
                        });
                        if (ResizeObserver) {
                            resizeObserverExtra.observe(parent);
                        }

                        window.addEventListener('resize', function() {
                            setExtraLightPosition();
                        });
                    });
                })();
            </script>
            <?php
        });

        // Container Link
        add_action('elementor/element/after_section_end', function($element, $section_id) {
            if ($element->get_name() === 'container' && 'section_layout_additional_options' === $section_id) {
                $element->start_controls_section(
                    'pxl_container_url',
                    [
                        'label' => __('Container Link', 'brighthub'),
                        'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
    
                $element->add_control(
                    'pxl_container_link',
                    [
                        'label' => esc_html__('Link', 'brighthub'),
                        'type' => \Elementor\Controls_Manager::URL,
                    ]
                );
    
                $element->end_controls_section();
            }
        }, 10, 2);

        add_filter('pxl_element_container/before-render', function($html, $settings) {
            if (!empty($settings['pxl_container_link']['url']) && is_array($settings['pxl_container_link'])) {
                
                $link_attributes = [];
                
                if (!empty($settings['pxl_container_link']['url'])) {
                    $link_attributes['href'] = esc_url($settings['pxl_container_link']['url']);
                }
                
                if (!empty($settings['pxl_container_link']['is_external'])) {
                    $link_attributes['target'] = '_blank';
                }
                
                if (!empty($settings['pxl_container_link']['nofollow'])) {
                    $link_attributes['rel'] = 'nofollow';
                }
                
                $attributes_string = '';
                foreach ($link_attributes as $key => $value) {
                    $attributes_string .= ' ' . esc_attr($key) . '="' . esc_attr($value) . '"';
                }
                
                $html .= '<a' . $attributes_string . ' class="pxl-container pxl-container__link"></a>';
            }
        
            return $html;
        }, 10, 2);

        // Container star
        add_action( 'elementor/element/after_section_end', function ( $element, $section_id ) {

            if ( $element->get_name() === 'container' && $section_id === 'section_layout_additional_options' ) {

                $element->start_controls_section(
                    'pxl_container_star',
                    [
                        'label' => __( 'Star & Light', 'brighthub' ),
                        'tab'   => \Elementor\Controls_Manager::TAB_LAYOUT,
                    ]
                );
                $element->add_control(
                    'pxl_container_star_color_option',
                    [
                        'label' => __( 'Star Option', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SWITCHER,
                        'default' => 'no',
                        'options' => [
                            'yes' => __( 'Yes', 'brighthub' ),
                            'no' => __( 'No', 'brighthub' ),
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_star_color',
                    [
                        'label' => __( 'Star Color', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::COLOR,
                        'condition' => [
                            'pxl_container_star_color_option' => 'yes',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_star_number',
                    [
                        'label' => __( 'Star Number', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::NUMBER,
                        'condition' => [
                            'pxl_container_star_color_option' => 'yes',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_star_width',
                    [
                        'label' => __( 'Box Width', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%', 'vw' ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 2000 ],
                            '%'  => [ 'min' => 0,  'max' => 100 ],
                            'vw' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_container_star_color_option' => 'yes',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_star_height',
                    [
                        'label' => __( 'Box Height', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%', 'vh' ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 5000 ],
                            '%'  => [ 'min' => 0,  'max' => 100 ],
                            'vh' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_container_star_color_option' => 'yes',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_light_color_option',
                    [
                        'label' => __( 'Light Option', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SWITCHER,
                        'default' => 'no',
                        'separator' => 'before',
                        'options' => [
                            'yes' => __( 'Yes', 'brighthub' ),
                            'no' => __( 'No', 'brighthub' ),
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_container_light_color',
                    [
                        'label' => __( 'Light Color', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::COLOR,
                        'condition' => [
                            'pxl_container_light_color_option' => 'yes',
                        ],
                    ]
                );
                $element->add_control(
                    'pxl_container_light_width',
                    [
                        'label' => __( 'Light Width', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%', 'vw' ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 2000 ],
                            '%'  => [ 'min' => 0,  'max' => 100 ],
                            'vw' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_container_light_color_option' => 'yes',
                        ],
                    ]
                );
                
                $element->add_control(
                    'pxl_container_light_height',
                    [
                        'label' => __( 'Light Height', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%', 'vh' ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 5000 ],
                            '%'  => [ 'min' => 0,  'max' => 100 ],
                            'vh' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_container_light_color_option' => 'yes',
                        ],
                    ]
                );
                
                $element->add_control(
                    'pxl_container_light_blur',
                    [
                        'label' => __( 'Blur Option', 'brighthub' ),
                        'type'  => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px'  => [ 'min' => 0,  'max' => 1000 ],
                        ],
                    ]
                );
                
                $element->end_controls_section();
            }
        }, 10, 2 );

        add_filter( 'pxl_element_container/before-render', function ( $html, $settings ) {
            $star_w      = $settings['pxl_container_star_width']['size']  ?? null;
            $star_w_unit = $settings['pxl_container_star_width']['unit']  ?? 'px';
            $star_h      = $settings['pxl_container_star_height']['size'] ?? null;
            $star_h_unit = $settings['pxl_container_star_height']['unit'] ?? 'px';
            $star_number = $settings['pxl_container_star_number']         ?? null;
        
            $star_style  = '';
            if ( is_numeric( $star_w ) ) $star_style .= "width:{$star_w}{$star_w_unit};";
            if ( is_numeric( $star_h ) ) $star_style .= "height:{$star_h}{$star_h_unit};";
        
            if (
                ! empty( $settings['pxl_container_star_color'] ) &&
                ( $settings['pxl_container_star_color_option'] ?? 'no' ) === 'yes'
            ) {
                $html .= sprintf(
                    '<canvas class="pxl-star" data-color="%s" data-star="%s" style="%s"%s></canvas>',
                    esc_attr( $settings['pxl_container_star_color'] ),
                    esc_attr( $settings['pxl_container_star_number'] ), 
                    esc_attr( $star_style ),
                    is_numeric( $star_number ) ? ' data-star="' . intval( $star_number ) . '"' : ''
                );
            }
        
            if (
                ! empty( $settings['pxl_container_light_color'] ) &&
                ( $settings['pxl_container_light_color_option'] ?? 'no' ) === 'yes'
            ) {
                $light_w      = $settings['pxl_container_light_width']['size']  ?? $star_w;
                $light_w_unit = $settings['pxl_container_light_width']['unit']  ?? $star_w_unit;
                $light_h      = $settings['pxl_container_light_height']['size'] ?? $star_h;
                $light_h_unit = $settings['pxl_container_light_height']['unit'] ?? $star_h_unit;
        
                $light_style  = '';
                if ( is_numeric( $light_w ) ) $light_style .= "width:{$light_w}{$light_w_unit};";
                if ( is_numeric( $light_h ) ) $light_style .= "height:{$light_h}{$light_h_unit};";
        
                $blur_raw     = $settings['pxl_container_light_blur']['size'] ?? 0;
                $blur         = is_numeric( $blur_raw ) ? intval( $blur_raw ) : 0;
        
                $light_style .= "background:{$settings['pxl_container_light_color']};";
                if ( $blur > 0 ) $light_style .= "filter:blur({$blur}px);";
        
                $html .= sprintf(
                    '<div class="pxl-light" style="%s"></div>',
                    esc_attr( $light_style )
                );
            }
        
            return $html;
        }, 10, 2 );
        

        // Custom css
        add_action( 'elementor/element/parse_css', function( $post_css, $element ) {
            if ( $post_css instanceof \Elementor\Core\DynamicTags\Dynamic_CSS ) {
                return;
            }
            
            $element_settings = $element->get_settings();
            
            if ( empty( $element_settings['pxl_custom_css'] ) ) {
                return;
            }
            
            $css = trim( $element_settings['pxl_custom_css'] );
            
            if ( empty( $css ) ) {
                return;
            }
            
            $css = str_replace( 'selector', $post_css->get_element_unique_selector( $element ), $css );
            
            $post_css->get_stylesheet()->add_raw_css( $css );
            
        }, 10, 2 );

        add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {
            if (
                $section_id === 'section_layout'  ||
                $section_id === 'section_advanced' ||
                $section_id === '_section_style'
            ) {
                
                if ( $element->get_controls( 'pxl_custom_css_section' ) ) {
                    return;
                }
                
                $element->start_controls_section(
                    'pxl_custom_css_section',
                    [
                        'label' => __( 'BrightHub Custom CSS 🖊 and Effect Scroll', 'brighthub' ),
                        'tab' => \Elementor\Controls_Manager::TAB_ADVANCED,
                    ]
                );
                
                $element->add_control(
                    'pxl_custom_css',
                    [
                        'type' => \Elementor\Controls_Manager::CODE,
                        'language' => 'css',
                        'render_type' => 'template',
                        'raw' => true,
                        'show_label' => false,
                        'separator' => 'none',
                        'description' => __('Add your custom CSS here. Use "selector" to target this element.', 'brighthub'),
                    ]
                );

                $element->add_control(
                    'pxl_scroll_effect',
                    [
                        'label' => __( 'BrightHub Scroll Effect Type', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'none' => __( 'None', 'brighthub' ),
                            'scroll-item-run' => __( 'Scroll Item Run', 'brighthub' ),
                            'scroll-item-zoom' => __( 'Scroll Item Zoom', 'brighthub' ),
                        ],
                        'default' => 'none',
                    ]
                );

                $element->add_control(
                    'pxl_scroll_top_zoom',
                    [
                        'label' => __( 'Scroll Effect Item Trigger Top (px)', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'description' => __( 'Trigger top when zoom effect starts (px)', 'brighthub' ),
                        'size_units' => [ 'px' ],
                        'range' => [
                            'px' => [ 'min' => -2000,  'max' => 2000 ],
                        ],
                        'default' => [
                            'size' => -504,
                            'unit' => 'px',
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-zoom',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_scroll_zoom_start',
                    [
                        'label' => __( 'Scroll Effect Item Trigger Top Start %', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'description' => __( 'Trigger top when zoom effect starts from % value to 100%', 'brighthub' ),
                        'size_units' => [ '%' ],
                        'default' => [
                            'size' => 15,
                            'unit' => '%',
                        ],
                        'range' => [
                            '%' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-zoom',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_scroll_zoom_start_screen',
                    [
                        'label' => __( 'Scroll Effect Item Trigger Top Start Screen %', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'description' => __( 'Trigger top when scroll to start screen', 'brighthub' ),
                        'size_units' => [ '%' ],
                        'default' => [
                            'size' => 80,
                            'unit' => '%',
                        ],
                        'range' => [
                            '%' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-zoom',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_scroll_zoom_end_screen',
                    [
                        'label' => __( 'Scroll Effect Item Trigger Top End Screen %', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'description' => __( 'Trigger top when scroll end screen', 'brighthub' ),
                        'size_units' => [ '%' ],
                        'default' => [
                            'size' => 0,
                            'unit' => '%',
                        ],
                        'range' => [
                            '%' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-zoom',
                        ],
                    ]
                );
                
                $element->add_control(
                    'pxl_scroll_zoom_max_screen',
                    [
                        'label' => __( 'Scroll Effect Max Screen (px)', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'description' => __( 'When scroll to max screen, the effect will be disabled', 'brighthub' ),
                        'size_units' => [ 'px' ],
                        'default' => [
                            'size' => 1199,
                            'unit' => 'px',
                        ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 1920 ],
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-zoom',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_scroll_effect_item',
                    [
                        'label' => __( 'Scroll Effect Item', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => [
                            'scroll-item-run-left-to-right' => __( 'Scroll Item Run Left To Right', 'brighthub' ),
                            'scroll-item-run-right-to-left' => __( 'Scroll Item Run Right To Left', 'brighthub' ),
                        ],
                        'default' => 'scroll-item-run-left-to-right',
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-run',
                        ],
                    ]
                );

                $element->add_control(
                    'pxl_scroll_effect_item_trigger_top',
                    [
                        'label' => __( 'Scroll Effect Item Trigger Top', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SLIDER,
                        'size_units' => [ 'px', '%', 'vh' ],
                        'range' => [
                            'px' => [ 'min' => 0,  'max' => 5000 ],
                            '%'  => [ 'min' => 0,  'max' => 100 ],
                            'vh' => [ 'min' => 0,  'max' => 100 ],
                        ],
                        'default' => [
                            'size' => 0,
                            'unit' => 'px',
                        ],
                        'condition' => [
                            'pxl_scroll_effect' => 'scroll-item-run',
                        ],
                    ]
                );
                
                $element->end_controls_section();
            }
        }, 10, 3 );

        function brighthub_add_scroll_attributes( $element ) {
            $settings = $element->get_settings_for_display();
        
            if ( empty( $settings['pxl_scroll_effect'] ) || $settings['pxl_scroll_effect'] === 'none' ) {
                return;
            }
        
            $effect = $settings['pxl_scroll_effect'];
        
            $element->add_render_attribute( '_wrapper', 'class', sanitize_html_class( $effect ) );
        
            // ——— RUN (left/right) ————————————————————————————
            if ( $effect === 'scroll-item-run' ) {
                if ( ! empty( $settings['pxl_scroll_effect_item'] ) ) {
                    $element->add_render_attribute(
                        '_wrapper',
                        'class',
                        sanitize_html_class( $settings['pxl_scroll_effect_item'] )
                    );
                }
        
                if ( ! empty( $settings['pxl_scroll_effect_item_trigger_top']['size'] ) ) {
                    $size = floatval( $settings['pxl_scroll_effect_item_trigger_top']['size'] );
                    $unit = ! empty( $settings['pxl_scroll_effect_item_trigger_top']['unit'] ) ? $settings['pxl_scroll_effect_item_trigger_top']['unit'] : 'px';
        
                    $element->add_render_attribute( '_wrapper', 'data-trigger-top', $size . $unit );
                }
            }
        
            // ——— ZOOM ——————————————————————————————
            if ( $effect === 'scroll-item-zoom' ) {
                if ( isset( $settings['pxl_scroll_top_zoom']['size'] ) ) {
                    $size = floatval( $settings['pxl_scroll_top_zoom']['size'] );
                    $unit = ! empty( $settings['pxl_scroll_top_zoom']['unit'] ) ? $settings['pxl_scroll_top_zoom']['unit'] : 'px';
                    $element->add_render_attribute( '_wrapper', 'data-zoom-top', $size . $unit );
                }
        
                if ( isset( $settings['pxl_scroll_zoom_start']['size'] ) ) {
                    $element->add_render_attribute( '_wrapper', 'data-zoom-start', floatval( $settings['pxl_scroll_zoom_start']['size'] ) );
                }
        
                if ( isset( $settings['pxl_scroll_zoom_start_screen']['size'] ) ) {
                    $element->add_render_attribute( '_wrapper', 'data-zoom-start-screen', floatval( $settings['pxl_scroll_zoom_start_screen']['size'] ) );
                }
        
                if ( isset( $settings['pxl_scroll_zoom_end_screen']['size'] ) ) {
                    $element->add_render_attribute( '_wrapper', 'data-zoom-end-screen', floatval( $settings['pxl_scroll_zoom_end_screen']['size'] ) );
                }

                if ( isset( $settings['pxl_scroll_zoom_max_screen']['size'] ) ) {
                    $element->add_render_attribute( '_wrapper', 'data-zoom-max', floatval( $settings['pxl_scroll_zoom_max_screen']['size'] ) );
                }
            }
        
            $element->add_render_attribute( '_wrapper', 'data-scroll-effect', esc_attr( $effect ) );
            $element->add_render_attribute( '_wrapper', 'data-element-type', esc_attr( $element->get_type() ) );
        }
        
        add_action( 'elementor/frontend/section/before_render', 'brighthub_add_scroll_attributes' );
        add_action( 'elementor/frontend/container/before_render', 'brighthub_add_scroll_attributes' );
        add_action( 'elementor/frontend/widget/before_render', 'brighthub_add_scroll_attributes' );
        add_action( 'elementor/frontend/column/before_render', 'brighthub_add_scroll_attributes' );


        add_action( 'elementor/widget/render_content', 'pxl_render_element_custom_css', 10, 2 );
        add_action( 'elementor/section/render_content', 'pxl_render_element_custom_css', 10, 2 );
        add_action( 'elementor/container/render_content', 'pxl_render_element_custom_css', 10, 2 );

        function pxl_render_element_custom_css( $content, $element ) {
            $settings = $element->get_settings();
            
            if ( empty( $settings['pxl_custom_css'] ) ) {
                return $content;
            }
            
            $css = trim( $settings['pxl_custom_css'] );
            
            if ( empty( $css ) ) {
                return $content;
            }
            
            $element_id = $element->get_id();
            $css = str_replace( 'selector', '.elementor-element-' . $element_id, $css );
            
            $style_tag = '<style id="pxl-custom-css-' . $element_id . '">' . $css . '</style>';
            
            return $style_tag . $content;
        }

        add_action( 'elementor/frontend/before_render', function( $element ) {
            $settings = $element->get_settings();
            
            if ( ! empty( $settings['pxl_custom_css'] ) ) {
                $css = trim( $settings['pxl_custom_css'] );
                
                if ( ! empty( $css ) ) {
                    $element_id = $element->get_id();
                    $css = str_replace( 'selector', '.elementor-element-' . $element_id, $css );
                    
                    add_action( 'wp_head', function() use ( $element_id, $css ) {
                        echo '<style id="pxl-custom-css-' . $element_id . '">' . $css . '</style>';
                    }, 999 );
                    
                    if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
                        ?>
                        <style id="pxl-editor-css-<?php echo esc_attr($element_id); ?>">
                            <?php echo esc_html($css); ?>
                        </style>
                        <?php
                    }
                }
            }
        });
    }
}

PXL_Elementor_Custom_Controls::init();