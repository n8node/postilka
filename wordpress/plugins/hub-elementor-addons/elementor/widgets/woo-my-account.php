<?php

namespace LiquidElementor\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit();
}

use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Typography;
use Elementor\Plugin;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class LD_Woo_My_Account extends Widget_Base {
	public function get_name() {
		return 'ld_woo_my_account';
	}

	public function get_title() {
		return __( 'Liquid My Account', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-lock-user lqd-element';
	}

	public function get_categories() {
		return [ 'hub-woo' ];
	}

	public function get_keywords() {
		return [ 'woocommerce', 'account', 'profile' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'navigation_section_section',
			[
				'label' => __( 'Navigation Section', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'layout',
			[
				'label'   => esc_html__( 'Layout', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					''           => esc_html__( 'Default', 'hub-elementor-addons' ),
					'horizontal' => esc_html__( 'Horizontal', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'icons',
			[
				'label'        => esc_html__( 'Icons', 'hub-elementor-addons' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Show', 'hub-elementor-addons' ),
				'label_off'    => esc_html__( 'Hide', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default'      => 'no',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'navigation_section_style',
			[
				'label' => __( 'Navigation', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'nav_spacing',
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
				],
				'default'    => [
					'unit' => 'px',
					'size' => 20,
				],
				'selectors'  => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'layout' => 'horizontal',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'nav_section_border',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation',
			]
		);

		$this->add_control(
			'nav_section_border_radius',
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
					'{{WRAPPER}} .woocommerce-MyAccount-navigation' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'nav_section_padding',
			[
				'label'      => esc_html__( 'Padding', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 10,
					'right'    => 10,
					'bottom'   => 10,
					'left'     => 10,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'box_shadow',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'navigation_links_section',
			[
				'label' => __( 'Navigation Links', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->start_controls_tabs( 'tabs_section' );

		$this->start_controls_tab(
			'nav_tabs_normal',
			[
				'label' => esc_html__( 'Normal', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'nav_link_text_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_text_logout_color',
			[
				'label'     => esc_html__( 'Logout Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link--customer-logout a' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_background_color',
			[
				'label'     => esc_html__( 'Background Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_border_color',
			[
				'label'     => esc_html__( 'Border Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'nav_link_box_shadow',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation li a',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'nav_tabs_hover',
			[
				'label' => esc_html__( 'Hover', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'nav_link_text_color_hover',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_text_logout_color_hover',
			[
				'label'     => esc_html__( 'Logout Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link--customer-logout a:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_background_color_hover',
			[
				'label'     => esc_html__( 'Background Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a:hover' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_border_color_hover',
			[
				'label'     => esc_html__( 'Border Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a:hover' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'nav_link_box_shadow_hover',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation li a:hover',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'nav_tabs_active',
			[
				'label' => esc_html__( 'Active', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'nav_link_text_color_active',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li.is-active a' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_background_color_active',
			[
				'label'     => esc_html__( 'Background Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li.is-active a' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'nav_link_border_color_active',
			[
				'label'     => esc_html__( 'Border Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li.is-active a' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'nav_link_box_shadow_active',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation li.is-active a',
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->add_control(
			'nav_link_spacing',
			[
				'label'      => esc_html__( 'Spacing', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 20,
						'step' => 1,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 10,
				],
				'selectors'  => [
					'{{WRAPPER}} .woocommerce-MyAccount-navigation ul'                  => 'gap: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li:not(:last-child)' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'nav_link_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation li a',
			]
		);

		$this->add_control(
			'nav_link_padding',
			[
				'label'      => esc_html__( 'Padding', 'hub-elementor-addons' ),
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
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'nav_link_border',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-navigation li a',
			]
		);

		$this->add_control(
			'nav_link_border_radius',
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
					'{{WRAPPER}} .woocommerce-MyAccount-navigation li a' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'content_section',
			[
				'label' => __( 'Content Section', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Heading Typography', 'hub-elementor-addons' ),
				'name'     => 'content_section_heading_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content h2',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Text Typography', 'hub-elementor-addons' ),
				'name'     => 'content_section_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content p, {{WRAPPER}} .woocommerce-MyAccount-content address',
			]
		);

		$this->add_control(
			'content_section_border_heading_color',
			[
				'label'     => esc_html__( 'Heading Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-content h2' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'content_section_border_text_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-content p, {{WRAPPER}} .woocommerce-MyAccount-content address' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'content_section_border_link_color',
			[
				'label'     => esc_html__( 'Link Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-content p a' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'content_section_border_background_color',
			[
				'label'     => esc_html__( 'Background Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .woocommerce-MyAccount-content' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'content_section_border',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content',
			]
		);

		$this->add_control(
			'content_section_border_radius',
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
					'{{WRAPPER}} .woocommerce-MyAccount-content' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'content_section_padding',
			[
				'label'      => esc_html__( 'Padding', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 10,
					'right'    => 10,
					'bottom'   => 10,
					'left'     => 10,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'{{WRAPPER}} .woocommerce-MyAccount-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'content_box_shadow',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'input_section',
			[
				'label' => __( 'Input Fields', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Label Typography', 'hub-elementor-addons' ),
				'name'     => 'input_label_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content .form-row label',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Title Typography', 'hub-elementor-addons' ),
				'name'     => 'title_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content form.woocommerce-EditAccountForm legend',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Input Typography', 'hub-elementor-addons' ),
				'name'     => 'input_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content .form-row .input-text',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'label'    => esc_html__( 'Description Typography', 'hub-elementor-addons' ),
				'name'     => 'description_typography',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content .form-row em',
			]
		);

		$this->add_control(
			'label_margin',
			[
				'label'      => esc_html__( 'Label Margin', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 0,
					'right'    => 0,
					'bottom'   => 15,
					'left'     => 0,
					'unit'     => 'px',
					'isLinked' => false,
				],
				'selectors'  => [
					'{{WRAPPER}} .woocommerce-MyAccount-content .form-row label' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'input_padding',
			[
				'label'      => esc_html__( 'Padding', 'hub-elementor-addons' ),
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
					'{{WRAPPER}} .woocommerce-MyAccount-content .form-row .input-text' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'input_border',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content .form-row .input-text',
			]
		);

		$this->add_control(
			'input_border_radius',
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
					'{{WRAPPER}} .woocommerce-MyAccount-content .form-row .input-text' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'input_box_shadow',
				'selector' => '{{WRAPPER}} .woocommerce-MyAccount-content .form-row .input-text',
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		if ( ! liquid_helper()->is_woocommerce_active() ) {
			return;
		}

		$settings = $this->get_settings_for_display();

		$classes = [ 'lqd-woo-my-account', 'woocommerce-account' ];

		if ( 'yes' === $settings['icons'] ) {
			$classes[] = 'lqd-woo-my-account--has-icons';
		}

		if ( 'horizontal' === $settings['layout'] ) {
			$classes[] = 'lqd-woo-my-account--horizontal';
		}
		?>
		<div class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>">
			<div class="woocommerce">
				<?php echo do_shortcode( '[woocommerce_my_account]' ); ?>
			</div>
		</div>
		<?php
	}
}

Plugin::instance()->widgets_manager->register( new LD_Woo_My_Account() );
