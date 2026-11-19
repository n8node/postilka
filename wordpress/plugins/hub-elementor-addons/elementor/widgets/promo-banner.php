<?php

namespace LiquidElementor\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Group_Control_Border;
use Elementor\Plugin;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;

class LD_Promo_Banner extends Widget_Base {
	public function get_name() {
		return 'ld_promo_banner';
	}

	public function get_title() {
		return __( 'Promo Banner', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-banner lqd-element';
	}

	public function get_categories() {
		return [ 'hub' ];
	}

	public function get_keywords() {
		return [ 'banner', 'promo' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'content_section',
			[
				'label' => __( 'Content', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'template',
			[
				'label'       => __( 'Template', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::SELECT,
				'label_block' => true,
				'options'     => liquid_helper()->get_elementor_templates(),
				'description' => liquid_helper()->get_elementor_templates_edit(),
				'default'     => '0',
			]
		);

		$this->add_control(
			'h_position',
			[
				'label'     => esc_html__( 'Horizontal Position', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::CHOOSE,
				'default'   => 'center',
				'options'   => [
					'flex-start' => [
						'title' => esc_html__( 'Left', 'hub-elementor-addons' ),
						'icon'  => 'eicon-long-arrow-left',
					],
					'center'     => [
						'title' => esc_html__( 'Center', 'hub-elementor-addons' ),
						'icon'  => 'eicon-dot-circle-o',
					],
					'flex-end'   => [
						'title' => esc_html__( 'Right', 'hub-elementor-addons' ),
						'icon'  => 'eicon-long-arrow-right',
					],
				],
				'selectors' => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}})' => 'justify-content: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'v_position',
			[
				'label'     => esc_html__( 'Vertical Position', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::CHOOSE,
				'default'   => 'center',
				'options'   => [
					'flex-start' => [
						'title' => esc_html__( 'Top', 'hub-elementor-addons' ),
						'icon'  => 'eicon-sort-up',
					],
					'center'     => [
						'title' => esc_html__( 'Center', 'hub-elementor-addons' ),
						'icon'  => 'eicon-dot-circle-o',
					],
					'flex-end'   => [
						'title' => esc_html__( 'Bottom', 'hub-elementor-addons' ),
						'icon'  => 'eicon-sort-down',
					],
				],
				'selectors' => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}})' => 'align-items: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'close_button_position',
			[
				'label'   => esc_html__( 'Close Position', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::CHOOSE,
				'options' => [
					'left'   => [
						'title' => esc_html__( 'Left', 'hub-elementor-addons' ),
						'icon'  => 'eicon-long-arrow-left',
					],
					'inside' => [
						'title' => esc_html__( 'Inside', 'hub-elementor-addons' ),
						'icon'  => 'eicon-dot-circle-o',
					],
					'right'  => [
						'title' => esc_html__( 'Right', 'hub-elementor-addons' ),
						'icon'  => 'eicon-long-arrow-right',
					],
				],
				'default' => 'right',
				'toggle'  => false,
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'cookie_section',
			[
				'label' => __( 'Cookie Settings', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'enable_cookies',
			[
				'label'        => esc_html__( 'Enable Cookies', 'hub-elementor-addons' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'hub-elementor-addons' ),
				'label_off'    => esc_html__( 'No', 'hub-elementor-addons' ),
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'expire',
			[
				'label'      => esc_html__( 'Expiration (Day)', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'day' ],
				'range'      => [
					'day' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'    => [
					'unit' => 'day',
					'size' => 7,
				],
				'condition'  => [
					'enable_cookies' => 'yes',
				],
			]
		);

		$this->add_control(
			'cookie_version',
			[
				'label'       => esc_html__( 'Cookie Version', 'hub-elementor-addons' ),
				'description' => esc_html__( 'Increase version to force display promo again.', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::NUMBER,
				'min'         => 1,
				'default'     => 1,
				'condition'   => [
					'enable_cookies' => 'yes',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_general_section',
			[
				'label' => esc_html__( 'General', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'width',
			[
				'label'      => esc_html__( 'Width', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 2000,
						'step' => 1,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 450,
				],
				'selectors'  => [
					'.lqd-promo-banner__content:has(.lqd-promo-banner-{{ID}})' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'spacing',
			[
				'label'      => esc_html__( 'Spacing', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 20,
				],
				'selectors'  => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}})' => 'margin: {{SIZE}}{{UNIT}}; min-height: calc(100% - {{SIZE}}{{UNIT}} * 2);',
				],
			]
		);

		$this->add_control(
			'border_radius',
			[
				'label'      => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 0,
					'right'    => 0,
					'bottom'   => 0,
					'left'     => 0,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'.lqd-promo-banner__content:has(.lqd-promo-banner-{{ID}})' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_close_button',
			[
				'label' => esc_html__( 'Close Button', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'close_background_color',
			[
				'label'     => esc_html__( 'Background Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}}) .lqd-promo-banner__close' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'close_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}}) .lqd-promo-banner__close' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'close_border_radius',
			[
				'label'      => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 50,
					'right'    => 50,
					'bottom'   => 50,
					'left'     => 50,
					'unit'     => '%',
					'isLinked' => true,
				],
				'selectors'  => [
					'.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}}) .lqd-promo-banner__close' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'close_border',
				'selector' => '.lqd-promo-banner__dialog:has(.lqd-promo-banner-{{ID}}) .lqd-promo-banner__close',
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$template = $settings['template'];

		if ( empty( $template ) ) {
			return;
		}

		$args = [
			'id'                    => $this->get_id(),
			'close_button_position' => $settings['close_button_position'],
			'enable_cookies'        => 'yes' === $settings['enable_cookies'],
			'expire'                => $settings['expire']['size'] ?? 7,
			'cookie_version'        => $settings['cookie_version'] ?? 1,
		];
		?>
		<?php if ( Plugin::$instance->editor->is_edit_mode() ) : ?>
			<button
				type="button"
				class="btn btn-solid"
				data-lqd-pb-open="<?php echo esc_attr( $this->get_id() ); ?>"
			><?php esc_html_e( 'Preview', 'hub-elementor-addons' ); ?></button>
		<?php endif; ?>
		<div
			class="lqd-pb-<?php echo esc_attr( $this->get_id() ); ?>"
			data-lqd-pb="<?php echo esc_attr( $this->get_id() ); ?>"
			data-lqd-pb-args="<?php echo esc_attr( wp_json_encode( $args ) ); ?>"
			style="display: none;"
		>
			<?php echo Plugin::instance()->frontend->get_builder_content( $template, true ); ?>
		</div>
		<?php
	}
}

Plugin::instance()->widgets_manager->register( new LD_Promo_Banner() );
