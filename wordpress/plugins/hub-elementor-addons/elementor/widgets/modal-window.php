<?php
namespace LiquidElementor\Widgets;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Image_Size;
use Elementor\Group_Control_Typography;
use Elementor\Scheme_Color;
use Elementor\Scheme_Typography;
use Elementor\Utils;
use Elementor\Control_Media;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Elementor heading widget.
 *
 * Elementor widget that displays an eye-catching headlines.
 *
 * @since 1.0.0
 */
class LD_Modal_Window extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * Retrieve heading widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'ld_modal_window';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve heading widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return __( 'Liquid Modal Box', 'hub-elementor-addons' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve heading widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'eicon-header lqd-element';
	}

	/**
	 * Get widget categories.
	 *
	 * Retrieve the list of categories the heading widget belongs to.
	 *
	 * Used to determine where to display the widget in the editor.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return array Widget categories.
	 */
	public function get_categories() {
		return [ 'hub-core' ];
	}

	/**
	 * Get widget keywords.
	 *
	 * Retrieve the list of keywords the widget belongs to.
	 *
	 * @since 2.1.0
	 * @access public
	 *
	 * @return array Widget keywords.
	 */
	public function get_keywords() {
		return [ 'gdpr', 'alert', 'cookie'  ];
	}

	/**
	 * Retrieve the list of scripts the counter widget depended on.
	 *
	 * Used to set scripts dependencies required to run the widget.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Widget scripts dependencies.
	 */
	public function get_script_depends() {

		if ( liquid_helper()->liquid_elementor_script_depends() ){
			return [ 'lity' ];
		} else {
			return [''];
		}

	}

	/**
	 * Register heading widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function register_controls() {

		$this->start_controls_section(
			'general_section',
			[
				'label' => __( 'General', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'title',
			[
				'label' => __( 'Title', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-input' ),
				'type' => Controls_Manager::TEXT,
				'default' => __( 'Title', 'hub-elementor-addons' ),
				'placeholder' => __( 'Type your title here', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'modal_type',
			[
				'label' => __( 'Modal Type', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'default',
				'options' => [
					'default' => __( 'Default', 'hub-elementor-addons' ),
					'fullscreen' => __( 'Fullscreen', 'hub-elementor-addons' ),
					'box' => __( 'Box', 'hub-elementor-addons' ),
					'in-container' => __( 'In Container', 'hub-elementor-addons' ),
				],
			]
		);

		$css_selectors = [
            '{{WRAPPER}}, {{WRAPPER}} .lqd-lity-container' => 'position: absolute; width: 100%; height: 100%; top: 0; inset-inline-start: 0; z-index: 10;',
            '{{WRAPPER}} .lqd-modal' => 'height: 100%',
            '{{WRAPPER}}' => 'pointer-events: none; overflow-x: hidden; overflow-y: auto',
            '{{WRAPPER}}' => 'pointer-events: none;',
            '{{WRAPPER}} > .elementor-widget-container' => 'opacity: 0; visibility: hidden; transition-property: all',
            '{{WRAPPER}} > .elementor-widget-container > .lqd-lity-container' => 'overflow-x: hidden; overflow-y: auto',
            '{{WRAPPER}}.lqd-is-active, {{WRAPPER}}.lqd-is-active .elementor-widget-container' => 'pointer-events: auto; opacity: 1; visibility: visible;',
        ];

        if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
            $css_selectors['{{WRAPPER}}:not(.lqd-is-active)'] = 'position:relative;width:auto;height:auto;pointer-events:auto;';
        }

        $this->add_control(
            'in_container_wrapper_css',
            [
                'type' => Controls_Manager::HIDDEN,
                'default' => 'yes',
                'condition' => [
                    'modal_type' => 'in-container',
                ],
                'selectors' => $css_selectors
            ]
        );

		$this->add_control(
			'modal_hide_close_btn',
			[
				'label' => esc_html__( 'Hide Close Button', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'condition' => [
					'modal_type' => 'in-container',
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-lity-close-btn-wrap' => 'display: none;',
				],
			]
		);

		$this->add_control(
			'content_type',
			[
				'label' => __( 'Content type', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'el_template',
				'options' => [
					'el_template' => [
						'title' => __( 'Elementor Template', 'hub-elementor-addons' ),
						'icon' => 'eicon-site-identity'
					],
					'tinymce' => [
						'title' => __( 'TinyMCE', 'hub-elementor-addons' ),
						'icon' => 'eicon-text-align-left'
					],
				],
                'frontend_available' => true,
				'toggle' => false,
			]
		);

        $this->add_control(
			'content_tinymce', [
				'label' => __( 'Content', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-tinymce' ),
				'type' => Controls_Manager::WYSIWYG,
				'default' => __( '<p>Item content. Click the edit button to change this text.</p>' , 'hub-elementor-addons' ),
				'show_label' => false,
				'condition'=> [
					'content_type' => 'tinymce'
				],
			]
		);

		$this->add_control(
			'modal',
			[
				'label' => __( 'Select Modal', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '0',
				'options' => liquid_helper()->get_elementor_templates(),
				'description' => liquid_helper()->get_elementor_templates_edit(),
				'condition' => [
                    'content_type' => 'el_template',
                ],
			]
		);

		$this->add_control(
			'modal_id',
			[
				'label' => esc_html__( 'Modal ID:', 'hub-elementor-addons' ),
				'type' => Controls_Manager::RAW_HTML,
				'raw' => __( '<span class="lqd-modal-id-wrap">#modal-<span class="lqd-modal-id">{ID}</span></span>', 'hub-elementor-addons' ),
				'content_classes' => 'lqd-modal-id elementor-panel-alert elementor-panel-alert-info',
			]
		);

        $this->add_control(
			'modal_id_warn',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'By changing Modal Type or Modal Template, The ID will change, so you\'ll need to update IDs where you used them before.', 'hub-elementor-addons' ),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-warn',
			]
		);

		$this->add_responsive_control(
			'box_width',
			[
				'label' => esc_html__( 'Width', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px', 'vw' ],
				'range' => [
					'%' => [
						'min' => 1,
						'max' => 100,
					],
					'px' => [
						'min' => 1,
						'max' => 1000,
					],
					'vw' => [
						'min' => 1,
						'max' => 100,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 350,
				],
				'selectors' => [
					'{{WRAPPER}}.lqd-lity[data-modal-type=box]' => 'width: {{SIZE}}{{UNIT}};',
				],
				'separator' => 'before',
				'condition' => [
					'modal_type' => 'box',
				],
			]
		);

		$this->add_responsive_control(
			'box_height',
			[
				'label' => esc_html__( 'Height', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px', 'vh' ],
				'range' => [
					'%' => [
						'min' => 1,
						'max' => 100,
					],
					'px' => [
						'min' => 1,
						'max' => 1000,
					],
					'vh' => [
						'min' => 1,
						'max' => 100,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 500,
				],
				'selectors' => [
					'{{WRAPPER}}.lqd-lity[data-modal-type=box]' => 'height: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'modal_type' => 'box',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			[
				'label' => __( 'Modal', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'modal_padding',
			[
				'label' => __( 'Modal padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-modal' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'modal_bg',
				'label' => __( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
                'fields_options' => [
                    'background' => [
                        'label' => __( 'Modal background color', 'hub-elementor-addons' ),
                    ],
                ],
				'selector' => '{{WRAPPER}} .lqd-lity-container',
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'backdropl_bg',
				'label' => __( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} .lqd-lity-backdrop',
                'fields_options' => [
                    'background' => [
                        'label' => __( 'Backdrop background color', 'hub-elementor-addons' ),
                    ],
                ],
                'condition' => [
                    'modal_type!' => 'in-container',
                ]
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'close_button_style_section',
			[
				'label' => __( 'Close Button', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

        $this->start_controls_tabs(
            'close_button_tabs',
        );

        $this->start_controls_tab(
            'close_button_tab_normal',
            [
                'label'   => esc_html__( 'Normal', 'hub-elementor-addons' ),
            ]
        );

		$this->add_control(
            'close_btn_color',
			[
				'label' => __( 'Icon Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close' => 'color:{{VALUE}}',
				],
            ]
		);

        $this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'close_btn_bg_color',
				'label' => __( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '.elementor-element.elementor-element-{{ID}} .lqd-lity-close',
			]
		);

        $this->add_group_control(
            Group_Control_Border::get_type(),
            [
                'name' => 'close_btn_border',
                'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
                'selector' => '.elementor-element.elementor-element-{{ID}} .lqd-lity-close',
            ]
        );

        $this->end_controls_tab();

        $this->start_controls_tab(
            'close_button_tab_hover',
            [
                'label'   => esc_html__( 'Hover', 'hub-elementor-addons' ),
            ]
        );

		$this->add_control(
            'close_btn_h_color',
			[
				'label' => __( 'Icon Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close:hover' => 'color:{{VALUE}}',
				],
            ]
		);

        $this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'close_btn_bg_h_color',
				'label' => __( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '.elementor-element.elementor-element-{{ID}} .lqd-lity-close:hover',
			]
		);

        $this->add_group_control(
            Group_Control_Border::get_type(),
            [
                'name' => 'close_btn_h_border',
                'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
                'selector' => '.elementor-element.elementor-element-{{ID}} .lqd-lity-close:hover',
            ]
        );

        $this->end_controls_tab();

        $this->end_controls_tabs();

        $this->add_responsive_control(
            'close_btn_border_radius',
            [
                'label' => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%' ],
                'separator' => 'before',
                'selectors' => [
                    '.elementor-element.elementor-element-{{ID}} .lqd-lity-close' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_responsive_control(
			'modal_close_btn_icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
				],
                'separator' => 'before',
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close' => 'font-size: {{SIZE}}{{UNIT}}',
				],
			]
		);

        $this->add_responsive_control(
			'modal_close_btn_width',
			[
				'label' => esc_html__( 'Width', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'vw', 'custom' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
					'em' => [
						'min' => 0,
						'max' => 100,
						'step' => 0.1
					],
					'vw' => [
						'min' => 0,
						'max' => 100,
						'step' => 1
					],
				],
                'separator' => 'before',
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close' => 'width: {{SIZE}}{{UNIT}}',
				],
			]
		);

        $this->add_responsive_control(
			'modal_close_btn_height',
			[
				'label' => esc_html__( 'Height', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'vw', 'custom' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
					'em' => [
						'min' => 0,
						'max' => 100,
						'step' => 0.1
					],
					'vw' => [
						'min' => 0,
						'max' => 100,
						'step' => 1
					],
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close' => 'height: {{SIZE}}{{UNIT}}',
				],
			]
		);

        $this->add_control(
			'modal_positioning_close_btn_heading',
			[
				'label' => esc_html__( 'Position', 'hub-elementor-addons' ),
				'type' => Controls_Manager::HEADING,
                'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_orientation_h',
			[
				'label' => esc_html__( 'Horizontal orientation', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-left',
					],
					'end' => [
						'title' => esc_html__( 'End', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-right',
					],
				],
				'toggle' => false,
				'render_type' => 'ui',
				'default' => 'end',
				'selectors_dictionary' => [
					'start' => 'inset-inline-end: auto',
					'end' => 'inset-inline-start: auto',
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => '{{VALUE}}',
				],
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_offset_x',
			[
				'label' => esc_html__( 'Horizontal offset', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw', 'custom' ],
				'default' => [
					'unit' => 'px',
					'size' => '30'
				],
				'range' => [
					'px' => [
						'min' => -500,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
					'vw' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => 'position: absolute; inset-inline-start: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'modal_close_btn_orientation_h' => 'start'
				]
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_offset_x_end',
			[
				'label' => esc_html__( 'Horizontal offset', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw', 'custom' ],
				'default' => [
					'unit' => 'px',
					'size' => '30'
				],
				'range' => [
					'px' => [
						'min' => -500,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
					'vw' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => 'position: absolute; inset-inline-end: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'modal_close_btn_orientation_h' => 'end'
				]
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_orientation_v',
			[
				'label' => esc_html__( 'Vertical orientation', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'top' => [
						'title' => esc_html__( 'Top', 'hub-elementor-addons' ),
						'icon' => 'eicon-v-align-top',
					],
					'bottom' => [
						'title' => esc_html__( 'Bottom', 'hub-elementor-addons' ),
						'icon' => 'eicon-v-align-bottom',
					],
				],
				'toggle' => false,
				'render_type' => 'ui',
				'default' => 'top',
				'selectors_dictionary' => [
					'top' => 'bottom: auto',
					'bottom' => 'top: auto',
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => '{{VALUE}}',
				],
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_offset_y',
			[
				'label' => esc_html__( 'Vertical offset', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vh', 'custom' ],
				'default' => [
					'unit' => 'px',
					'size' => '30'
				],
				'range' => [
					'px' => [
						'min' => -500,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
					'vh' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => 'position: absolute; top: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'modal_close_btn_orientation_v' => 'top',
				]
			]
		);

		$this->add_responsive_control(
			'modal_close_btn_offset_y_bottom',
			[
				'label' => esc_html__( 'Vertical offset', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vh', 'custom' ],
				'default' => [
					'unit' => 'px',
					'size' => '30'
				],
				'range' => [
					'px' => [
						'min' => -500,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
					'vh' => [
						'min' => -100,
						'max' => 100,
						'step' => 1
					],
				],
				'selectors' => [
					'.elementor-element.elementor-element-{{ID}} .lqd-lity-close-btn-wrap' => 'position: absolute; bottom: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'modal_close_btn_orientation_v' => 'bottom',
				]
			]
		);

		$this->end_controls_section();

	}

	protected function get_content_type_el_template() {
		$settings = $this->get_settings_for_display();

		echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $settings['modal'], false );
	}

	protected function get_content_type_tinymce() {
		$settings = $this->get_settings_for_display();

		echo $settings['content_tinymce'];
	}

	protected function get_content() {
		$content_type = $this->get_settings_for_display( 'content_type' );
		$this->{'get_content_type_' . $content_type}();
	}

	protected function render() {

		$settings = $this->get_settings_for_display();
		$modal_type = $settings['modal_type'];
		$content_type = $settings['content_type'];
		$modal_id = $content_type === 'el_template' && $settings['modal'] != 0 ? $settings['modal']  : $this->get_id();
		$title = $settings['title'];

		$this->add_render_attribute(
			'wrapper',
			[
				'id' => 'modal-' . $modal_id,
				'class' => [ 'lqd-modal' ],
				'data-modal-type' => $modal_type,
			]
		);

		if ( $modal_type !== 'in-container' ) {
			$this->add_render_attribute( 'wrapper', 'class', 'lqd-lity-hide' );
        }

		?>

		<?php if ($settings['modal'] !== 0 && \Elementor\Plugin::$instance->editor->is_edit_mode()){ ?>
			<span class="lqd-modal-id-wrap">
				<?php echo __( 'Available Modal ID: <span class="lqd-modal-id">#modal-' . $modal_id . '</span>' ); ?>
			</span>
		<?php } ?>

		<?php if ( $modal_type === 'in-container' ) : ?>
        <div class="lqd-lity-container">
        <?php endif; ?>

			<div <?php $this->print_render_attribute_string( 'wrapper' ); ?>>

				<?php if ( $modal_type === 'in-container' ) : ?>
					<div class="lqd-lity-close-btn-wrap">
						<svg class="lqd-lity-close-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32"><path fill="currentColor" d="M26.688 14.664H10.456l7.481-7.481L16 5.313 5.312 16 16 26.688l1.87-1.87-7.414-7.482h16.232v-2.672z"></path></svg>
						<button class="lqd-lity-close" type="button" aria-label="Close (Press escape to close)" data-lqd-lity-close>
							<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
								<path d="M18 6l-12 12" />
								<path d="M6 6l12 12" />
							</svg>
						</button>
						<span class="lqd-lity-trigger-txt"></span>
					</div>
				<?php endif; ?>

				<div class="lqd-modal-inner">

					<?php if ( !empty($title) ) : ?>
						<div class="lqd-modal-head">
							<h2><?php echo esc_html( $title );?></h2>
						</div>
					<?php endif; ?>
					<div class="lqd-modal-content">
						<?php $this->get_content(); ?>
					</div>

					<div class="lqd-modal-foot"></div>

				</div>
			</div>

		<?php if ( $modal_type === 'in-container' ) : ?>
        </div>
        <?php endif; ?>

		<?php

	}

}
\Elementor\Plugin::instance()->widgets_manager->register( new LD_Modal_Window() );