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
use Elementor\Group_Control_Css_Filter;
use Elementor\Repeater;
use Elementor\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class LD_Curtain extends Widget_Base {

	public function get_name() {
		return 'ld_curtain';
	}

	public function get_title() {
		return __( 'Liquid Curtain', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-off-canvas lqd-element';
	}

	public function get_categories() {
		return [ 'hub-core' ];
	}

	public function get_keywords() {
		return [ 'curtain', 'tab', 'accordion' ];
	}

	public function get_script_depends() {

		if ( liquid_helper()->liquid_elementor_script_depends() ){
			return [ '' ];
		} else {
			return [''];
		}

	}

	protected function register_controls() {

		$this->start_controls_section(
			'general_section',
			[
				'label' => __( 'General', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

        $repeater = new Repeater();

        $repeater->add_control(
            'item_title',
            [
                'label' => __( 'Title', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-input' ),
                'type' => Controls_Manager::TEXT,
                'default' => __( 'Title', 'hub-elementor-addons' ),
                'label_block' => true,
            ]
        );

		$repeater->add_control(
			'item_icon',
			[
				'label' => esc_html__( 'Icon', 'hub-elementor-addons' ),
				'type' => Controls_Manager::ICONS,
				'label_block' => false,
				'skin' => 'inline',
			]
		);

		$repeater->add_control(
			'item_icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 200,
					],
					'em' => [
						'min' => 0.1,
						'max' => 10,
					],
					'rem' => [
						'min' => 0.1,
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item .lqd-curtain-item-icon' => 'font-size: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item .lqd-curtain-item-icon svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'item_icon[value]!' => '',
				],
			]
		);

		$repeater->add_control(
			'item_icon_position',
			[
				'label' => esc_html__( 'Icon Position', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'before' => [
						'title' => esc_html__( 'Before', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-left',
					],
					'after' => [
						'title' => esc_html__( 'After', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-right',
					],
				],
				'default' => 'before',
				'condition' => [
					'item_icon[value]!' => '',
				],
			]
		);

		$repeater->add_control(
			'item_content_type',
			[
				'label' => esc_html__( 'Content Type', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'label_block' => true,
				'default' => 'tinmce',
				'options' => [
					'tinmce' => esc_html__( 'Text Editor', 'hub-elementor-addons' ),
					'template' => esc_html__( 'Template', 'hub-elementor-addons' ),
				],
			]
		);

		$repeater->add_control(
			'item_content',
			[
				'label' => esc_html__( 'Content', 'hub-elementor-addons' )  . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-tinymce' ),
				'type' => Controls_Manager::WYSIWYG,
				'default' => esc_html__( 'Content', 'hub-elementor-addons' ),
				'condition' => [
					'item_content_type' => 'tinmce',
				],
			]
		);

		$repeater->add_control(
			'item_template',
			[
				'label' => esc_html__( 'Template', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'label_block' => true,
				'options' => liquid_helper()->get_elementor_templates(),
				'description' => liquid_helper()->get_elementor_templates_edit(),
				'default' => '0',
				'condition' => [
					'item_content_type' => 'template',
				],
			]
		);

		$repeater->add_control(
			'item_content_padding',
			[
				'label' => esc_html__( 'Content Padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item .lqd-curtain-item-content-inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'item_content_type' => 'tinmce',
				],
				'separator' => 'before',
			]
		);

		$repeater->start_controls_tabs(
		   'item_style_tabs'
		);

		$repeater->start_controls_tab(
			'item_style_tab_normal',
			[
				'label' => esc_html__( 'Normal', 'hub-elementor-addons' ),
			]
		);

		$repeater->add_control(
			'item_title_color',
			[
				'label' => esc_html__( 'Title Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item .lqd-curtain-item-title' => 'color: {{VALUE}};',
				],
			]
		);

		$repeater->add_control(
			'item_content_color',
			[
				'label' => esc_html__( 'Title Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item .lqd-curtain-item-content' => 'color: {{VALUE}};',
				],
			]
		);

		$repeater->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'item_background',
				'label' => esc_html__( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item',
			]
		);

		$repeater->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'item_border',
				'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item',
			]
		);

		$repeater->end_controls_tab();

		$repeater->start_controls_tab(
			'item_style_tab_active',
			[
				'label' => esc_html__( 'Active', 'hub-elementor-addons' ),
			]
		);

		$repeater->add_control(
			'item_title_color_active',
			[
				'label' => esc_html__( 'Title Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item-active .lqd-curtain-item-title' => 'color: {{VALUE}};',
				],
			]
		);

		$repeater->add_control(
			'item_content_color_active',
			[
				'label' => esc_html__( 'Content Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item-active .lqd-curtain-item-content' => 'color: {{VALUE}};',
				],
			]
		);

		$repeater->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'item_background_active',
				'label' => esc_html__( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item-active',
			]
		);

		$repeater->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'item_border_active',
				'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} {{CURRENT_ITEM}}.lqd-curtain-item-active',
			]
		);

		$repeater->end_controls_tab();

		$repeater->end_controls_tabs();

        $this->add_control(
			'items',
			[
				'label' => __( 'Items', 'hub-elementor-addons' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
				],
				'title_field' => '{{{ item_title }}}',
            ]
		);

		$this->add_control(
			'active_item',
			[
				'label' => esc_html__( 'Active Item', 'hub-elementor-addons' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 1,
				'min' => 1
			]
		);

		$this->add_control(
			'trigger_type',
			[
				'label' => __( 'Trigger Type', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'click' => [
						'title' => __( 'Click', 'hub-elementor-addons' ),
						'icon' => 'eicon-click'
					],
					'pointerenter' => [
						'title' => __( 'Hover', 'hub-elementor-addons' ),
						'icon' => 'eicon-drag-n-drop'
					],
				],
				'default' => 'click',
				'toggle' => false
			]
		);

		$this->add_control(
			'items_html_tag',
			[
				'label' => __( 'Items HTML Tag', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'div' => 'Div',
					'section' => 'Section',
					'article' => 'Article',
					'aside' => 'Aside',
				],
				'default' => 'div',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'title_html_tag',
			[
				'label' => __( 'Title HTML Tag', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'div' => 'div',
					'span' => 'span',
					'p' => 'p',
				],
				'default' => 'h4',
			]
		);

        $this->end_controls_section();

		$this->start_controls_section(
			'items_styles_section',
			[
				'label' => __( 'Items', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'curtain_item_min_height',
			[
				'label' => esc_html__( 'Items Min Height', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'vh', 'custom' ],
				'range' => [
					'px' => [
						'min' => 10,
						'max' => 1000,
					],
					'em' => [
						'min' => 0.1,
						'max' => 50,
					],
					'rem' => [
						'min' => 0.1,
						'max' => 50,
					],
					'vh' => [
						'min' => 1,
						'max' => 100,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain' => '--items-min-height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'curtain_gap',
			[
				'label' => esc_html__( 'Items Gap', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'vw', 'custom' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 200,
					],
					'em' => [
						'min' => 0.1,
						'max' => 10,
					],
					'rem' => [
						'min' => 0.1,
						'max' => 10,
					],
					'vw' => [
						'min' => 0.1,
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain' => '--items-gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'curtain_title_padding',
			[
				'label' => esc_html__( 'Items Padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-title' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'items_align_v',
			[
				'label' => esc_html__( 'Content Alignment', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'aihub-core' ),
						'icon' => 'eicon-flex eicon-align-start-v',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'aihub-core' ),
						'icon' => 'eicon-flex eicon-align-center-v',
					],
					'end' => [
						'title' => esc_html__( 'End', 'aihub-core' ),
						'icon' => 'eicon-flex eicon-align-end-v',
					],
					'stretch' => [
						'title' => esc_html__( 'Stretch', 'aihub-core' ),
						'icon' => 'eicon-flex eicon-align-stretch-v',
					],
				],
				'default' => 'end',
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-content' => 'align-items: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Css_Filter::get_type(),
			[
				'name' => 'curtain_items_backdrop',
				'selector' => '{{WRAPPER}} .lqd-curtain-item-item',
				'label' => esc_html__( 'Items Backdrop Filter', 'hub-elementor-addons' ),
				'fields_options' => [
					'css_filter' => [
						'separator' => 'before',
					],
					'blur' => [
						'selectors' => [
							'{{SELECTOR}}' => '-webkit-backdrop-filter: brightness( {{brightness.SIZE}}% ) contrast( {{contrast.SIZE}}% ) saturate( {{saturate.SIZE}}% ) blur( {{blur.SIZE}}px ) hue-rotate( {{hue.SIZE}}deg );backdrop-filter: brightness( {{brightness.SIZE}}% ) contrast( {{contrast.SIZE}}% ) saturate( {{saturate.SIZE}}% ) blur( {{blur.SIZE}}px ) hue-rotate( {{hue.SIZE}}deg )',
						],
					]
				],
			]
		);

		$this->start_controls_tabs(
		   'style_tabs',
		   [
				'separator' => 'before',
		   ]
		);

		$this->start_controls_tab(
			'style_tab_normal',
			[
				'label' => esc_html__( 'Normal', 'hub-elementor-addons' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'curtain_background',
				'label' => esc_html__( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} .lqd-curtain-item',
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'curtain_border',
				'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-curtain-item',
			]
		);

		$this->add_responsive_control(
			'curtain_border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'style_tab_active',
			[
				'label' => esc_html__( 'Active', 'hub-elementor-addons' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'curtain_background_active',
				'label' => esc_html__( 'Background', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} .lqd-curtain-item-active',
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'curtain_border_active',
				'label' => esc_html__( 'Border', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-curtain-item-active',
			]
		);

		$this->add_responsive_control(
			'curtain_border_radius_active',
			[
				'label' => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-active' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

		$this->start_controls_section(
			'titles_styles_section',
			[
				'label' => __( 'Titles', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'curtain_title_typography',
				'label' => esc_html__( 'Titles Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-curtain-item-title',
			]
		);

		$this->add_responsive_control(
			'curtain_title_align',
			[
				'label' => esc_html__( 'Titles Alignment', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'' => [
						'title' => esc_html__( 'Start', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-right',
					],
					'justify' => [
						'title' => esc_html__( 'Justified', 'hub-elementor-addons' ),
						'icon' => 'eicon-text-align-justify',
					],
				],
				'default' => '',
				'selectors_dictionary' => [
					'' => '',
					'center' => 'text-align: center; justify-content: center;',
					'end' => 'text-align: end; justify-content: end;',
					'justify' => 'text-align: start; justify-content: space-between;',
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-title-inner' => '{{VALUE}}',
				],
			]
		);

		$this->start_controls_tabs(
		   'titles_style_tabs',
		   [
				'separator' => 'before',
		   ]
		);

		$this->start_controls_tab(
			'titles_style_tab_normal',
			[
				'label' => esc_html__( 'Normal', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'curtain_title_color',
			[
				'label' => esc_html__( 'Titles Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-title' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'titles_style_tab_active',
			[
				'label' => esc_html__( 'Active', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'curtain_title_color_active',
			[
				'label' => esc_html__( 'Titles Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-active .lqd-curtain-item-title' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

		$this->start_controls_section(
			'contents_styles_section',
			[
				'label' => __( 'Contents', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'curtain_content_typography',
				'label' => esc_html__( 'Contents Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-curtain-item-content',
			]
		);

		$this->add_responsive_control(
			'curtain_content_padding',
			[
				'label' => esc_html__( 'Contents Padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-content-inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',
			]
		);

		$this->start_controls_tabs(
		   'contents_style_tabs',
		   [
				'separator' => 'before',
		   ]
		);

		$this->start_controls_tab(
			'contents_style_tab_normal',
			[
				'label' => esc_html__( 'Normal', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'curtain_content_color',
			[
				'label' => esc_html__( 'Contents Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-content' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'contents_style_tab_active',
			[
				'label' => esc_html__( 'Active', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'curtain_content_color_active',
			[
				'label' => esc_html__( 'Contents Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-curtain-item-active .lqd-curtain-item-content' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

	}

	protected function get_item_title( $item, $index ) {

		$settings = $this->get_settings_for_display();
		$title_tag = $settings['title_html_tag'];
		$title = $item['item_title'];
		$icon = $item['item_icon'];
		$icon_position = $item['item_icon_position'];
		$icon_html = '';
		$title_attrs_key = $this->get_repeater_setting_key('curtain_item_title', 'items', $index);

		$this->add_render_attribute( $title_attrs_key, [
			'class' => ['lqd-curtain-item-title', 'd-flex', 'm-0'],
		] );

		if ( empty($title) ) {
			$this->add_render_attribute( $title_attrs_key, 'class', 'lqd-curtain-item-title-empty' );
		}

		if ( $icon['value'] ) {
			$icon_attrs_key = $this->get_repeater_setting_key('curtain_item_title_icon', 'items', $index);

			$this->add_render_attribute( $icon_attrs_key, [
				'class' => ['lqd-curtain-item-title-icon'],
			] );

			$icon_html = '<span ' . $this->get_render_attribute_string($icon_attrs_key) . '>' . Icons_Manager::try_get_icon_html( $icon, [ 'aria-hidden' => 'true' ] ) . '</span>';
		};

		echo sprintf(
			'<%1$s %2$s><span class="lqd-curtain-item-title-inner d-flex align-items-center flex-grow-1 text-vertical">%4$s%3$s%5$s</span></%1$s>',
			Utils::validate_html_tag( $title_tag ),
			$this->get_render_attribute_string($title_attrs_key),
			$title,
			$icon['value'] && $icon_position === 'before' ? $icon_html : '',
			$icon['value'] && $icon_position === 'after' ? $icon_html : '',
		);
	}

	protected function get_item_content_tinymce( $item ) {

		echo $item['item_content'];

	}

	protected function get_item_content_template( $item ) {

		$template_id = $item['item_template'];

		if ( '0' !== $template_id ) {
			echo \Elementor\Plugin::instance()->frontend->get_builder_content( $template_id, true );
		}

	}

	protected function get_item_content( $item, $index ) {

		$settings = $this->get_settings_for_display();
		$content_type = $item['item_content_type'];

		?>
		<div class="lqd-curtain-item-content d-flex align-items-end">
			<div class="lqd-curtain-item-content-inner">
				<div class="lqd-curtain-item-content-width-outer">
					<div class="lqd-curtain-item-content-width-inner">
						<?php if ( 'tinmce' === $content_type ) {
							$this->get_item_content_tinymce( $item );
						} elseif ( 'template' === $content_type ) {
							$this->get_item_content_template( $item );
						} ?>
					</div>
				</div>
			</div>
		</div>
		<?php

	}

	protected function render() {

		$settings = $this->get_settings_for_display();
		$items = $settings['items'];
		$active_item = $settings['active_item'];
		$items_count = count($items);
		$active_item = max(1, min($active_item, $items_count));
		$items_html_tag = $settings['items_html_tag'];
		$trigger_type = $settings['trigger_type'];

		$this->add_render_attribute( 'curtain', [
			'class' => [
				'lqd-curtain',
				'd-flex',
				'justify-content-between',
			],
			'data-curtain-options' => json_encode([
				'eventTrigger' => $trigger_type,
			]),
			'data-lqd-curtain' => 'true',
			'style' => ['--items-count' => $items_count],
		] );

        ?>

		<div <?php $this->print_render_attribute_string('curtain') ?>>

			<?php
				foreach ( $items as $index => $item ) {
					$item_attrs_key = $this->get_repeater_setting_key('curtain_item', 'items', $index);

					$this->add_render_attribute( $item_attrs_key, [
						'class' => [
							'lqd-curtain-item',
							'd-flex',
							$index + 1 === $active_item ? 'lqd-curtain-item-active' : 'lqd-curtain-item-inactive',
							'elementor-repeater-item-' . $item['_id']
						],
					] );
			?>

				<<?php echo $items_html_tag ?> <?php $this->print_render_attribute_string($item_attrs_key); ?>>
					<?php
						$this->get_item_title( $item, $index );
						$this->get_item_content( $item, $index );
					?>
				</<?php echo $items_html_tag ?>>

			<?php } // endforeach; ?>

		</div>

        <?php

	}

}
\Elementor\Plugin::instance()->widgets_manager->register( new LD_Curtain() );