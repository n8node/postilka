<?php

namespace LiquidElementor\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Group_Control_Border;
use Elementor\Plugin;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;
use Elementor\Icons_Manager;
use LQD_Elementor_Render_Button;

class LD_Store_Locations extends Widget_Base {
	public function get_name() {
		return 'ld_store_locations';
	}

	public function get_title() {
		return __( 'Liquid Store Locations', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-google-maps lqd-element';
	}

	public function get_categories() {
		return [ 'hub-core' ];
	}

	public function get_keywords() {
		return [ 'map', 'google', 'store', 'location' ];
	}

	public function get_script_depends() {
		if ( liquid_helper()->liquid_elementor_script_depends() ) {
			return [ 'google-maps-api', 'gsap' ];
		} else {
			return [ 'google-maps-api' ];
		}

	}

	protected function register_controls() {
		$this->start_controls_section(
			'heading_section',
			[
				'label' => __( 'Heading', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'title',
			[
				'label'       => esc_html__( 'Title', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-input' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => esc_html__( 'Select a Location', 'hub-elementor-addons' ),
				'placeholder' => esc_html__( 'Type your title here', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'title_html_tag',
			[
				'label'   => __( 'Title HTML Tag', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::SELECT,
				'options' => [
					'h1'   => 'H1',
					'h2'   => 'H2',
					'h3'   => 'H3',
					'h4'   => 'H4',
					'h5'   => 'H5',
					'h6'   => 'H6',
					'div'  => 'div',
					'span' => 'span',
					'p'    => 'p',
				],
				'default' => 'h4',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'map_section',
			[
				'label' => __( 'Google Map', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'show_search',
			[
				'label'        => __( 'Show Search', 'hub-elementor-addons' ),
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'style',
			[
				'label'   => __( 'Map Style', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'wy',
				'options' => [
					'assassinsCreedIV'  => __( 'Assassins Creed IV', 'hub-elementor-addons' ),
					'blueEssence'       => __( 'Blue Essence', 'hub-elementor-addons' ),
					'classic'           => __( 'Classic', 'hub-elementor-addons' ),
					'lightMonochrome'   => __( 'Light Monochrome', 'hub-elementor-addons' ),
					'unsaturatedBrowns' => __( 'Unsaturated Browns', 'hub-elementor-addons' ),
					'wy'                => __( 'WY', 'hub-elementor-addons' ),
					'evenLighter'       => __( 'Even Lighter', 'hub-elementor-addons' ),
					'shadesOfGray'      => __( 'Shades of Gray', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'distance_unit',
			[
				'label'   => __( 'Distance Unit', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'km',
				'options' => [
					'km'   => __( 'KM', 'hub-elementor-addons' ),
					'mile' => __( 'Mile', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'address',
			[
				'label'   => __( 'Address', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::TEXTAREA,
				'rows'    => 4,
				'default' => '7420 Shore Rd, Brooklyn, NY 11209, USA',
			]
		);

		$this->add_responsive_control(
			'map_height',
			[
				'label'     => __( 'Height', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => '550px',
				'selectors' => [
					'{{WRAPPER}} .ld-gmap-container'             => 'height: {{VALUE}}',
					'{{WRAPPER}} .ld-store-locations__locations' => 'max-height: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'map_marker',
			[
				'label'     => __( 'Marker', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'default',
				'separator' => 'before',
				'options'   => [
					'default' => __( 'Default', 'hub-elementor-addons' ),
					'image'   => __( 'Image', 'hub-elementor-addons' ),
					'html'    => __( 'Animated Cricles', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'color_marker',
			[
				'label'     => __( 'Marker Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-custom-map-marker, .lqd-custom-map-marker div' => 'background-color: {{VALUE}}',
				],
				'condition' => [
					'map_marker' => 'html',
				],
			]
		);

		$this->add_control(
			'custom_marker',
			[
				'label'     => __( 'Custom Marker', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::MEDIA,
				'condition' => [
					'map_marker' => 'image',
				],
			]
		);

		$this->add_control(
			'map_type',
			[
				'label'     => __( 'Map Type', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::SELECT,
				'options'   => [
					'roadmap'   => esc_html__( 'Roadmap', 'hub-elementor-addons' ),
					'satellite' => esc_html__( 'Satellite', 'hub-elementor-addons' ),
					'hybrid'    => esc_html__( 'Hybrid', 'hub-elementor-addons' ),
					'terrain'   => esc_Html__( 'Terrain', 'hub-elementor-addons' ),
				],
				'default'   => 'roadmap',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'zoom',
			[
				'label'     => __( 'Zoom', 'elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'default'   => [
					'size' => 16,
				],
				'range'     => [
					'px' => [
						'min' => 1,
						'max' => 20,
					],
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'map_controls',
			[
				'label'       => __( 'Enable/Disable controls', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::SELECT2,
				'label_block' => true,
				'multiple'    => true,
				'options'     => [
					'fullscreenControl' => __( 'Fullscreen', 'hub-elementor-addons' ),
					'panControl'        => __( 'Pan', 'hub-elementor-addons' ),
					'rotateControl'     => __( 'Rotate', 'hub-elementor-addons' ),
					'scaleControl'      => __( 'Scale', 'hub-elementor-addons' ),
					'scrollwheel'       => __( 'Scrollwheel', 'hub-elementor-addons' ),
					'streetViewControl' => __( 'Street View', 'hub-elementor-addons' ),
					'zoomControl'       => __( 'Zoom', 'hub-elementor-addons' ),
				],
				'default'     => [
					'zoomControl',
				],
				'separator'   => 'before',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'map_locations_section',
			[
				'label' => __( 'Locations', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'locations_error_message',
			[
				'label'       => esc_html__( 'Error Message', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-input' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => esc_html__( 'Too far', 'hub-elementor-addons' ),
				'placeholder' => esc_html__( 'Type your error message here', 'hub-elementor-addons' ),
			]
		);

		$locations_repeater = new Repeater();

		$locations_repeater->add_control(
			'title', [
				'label'       => esc_html__( 'Title', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => esc_html__( 'List Title', 'hub-elementor-addons' ),
				'label_block' => true,
			]
		);

		$locations_repeater->add_control(
			'content',
			[
				'label' => esc_html__( 'Content', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-tinymce' ),
				'type'  => Controls_Manager::WYSIWYG,
			]
		);

		$locations_repeater->add_control(
			'tooltip_content',
			[
				'label' => esc_html__( 'Tooltip Content', 'hub-elementor-addons' ),
				'type'  => Controls_Manager::TEXTAREA,
			]
		);

		$locations_repeater->add_control(
			'distance',
			[
				'label' => esc_html__( 'Distance', 'hub-elementor-addons' ),
				'type'  => Controls_Manager::TEXT,
			]
		);

		$locations_repeater->add_control(
			'lat',
			[
				'label'       => __( 'Latitude', 'hub-elementor-addons' ),
				'description' => esc_html__( 'Marker Latitude', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::TEXT,
				'dynamic'     => [
					'active' => true,
				],
				'label_block' => true,
			]
		);

		$locations_repeater->add_control(
			'long',
			[
				'label'       => __( 'Longitude', 'hub-elementor-addons' ),
				'description' => esc_html__( 'Marker Longitude', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::TEXT,
				'dynamic'     => [
					'active' => true,
				],
				'label_block' => true,
			]
		);

		$this->add_control(
			'locations',
			[
				'label'       => __( 'Locations', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $locations_repeater->get_controls(),
				'default'     => [
					[
						'title'    => __( 'Title #1', 'hub-elementor-addons' ),
						'content'  => __( 'Content #1', 'hub-elementor-addons' ),
						'distance' => __( '1.88 miles', 'hub-elementor-addons' ),
					],
					[
						'title'    => __( 'Title #2', 'hub-elementor-addons' ),
						'content'  => __( 'Content #2', 'hub-elementor-addons' ),
						'distance' => __( '1.88 miles', 'hub-elementor-addons' ),
					],
				],
				'title_field' => '{{{ title }}}',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'map_style_section',
			[
				'label' => __( 'Map Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'map_border_radius',
			[
				'label'      => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 20,
					'right'    => 20,
					'bottom'   => 20,
					'left'     => 20,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'{{WRAPPER}} .ld-gmap' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'heading_style_section',
			[
				'label' => __( 'Heading Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'heading_typography',
				'selector' => '{{WRAPPER}} .ld-store-locations__title',
			]
		);

		$this->add_control(
			'heading_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ld-store-locations__title' => 'color: {{VALUE}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'distance_style_section',
			[
				'label' => __( 'Distance Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'distance_typography',
				'selector' => '{{WRAPPER}} .ld-store-location__distance',
			]
		);

		$this->add_control(
			'distance_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ld-store-location__distance' => 'color: {{VALUE}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'map_locations_style_section',
			[
				'label' => __( 'Locations Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'location_title_color',
			[
				'label'     => __( 'Title color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ld-store-location__head > h3' => 'color: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'title_margin',
			[
				'label'      => __( 'Title margin', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors'  => [
					'{{WRAPPER}} .ld-store-location__head > h3' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'title_typography',
				'selector' => '{{WRAPPER}} .ld-store-location__head > h3',
			]
		);

		$this->add_control(
			'content_color',
			[
				'label'     => __( 'Content color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ld-store-location__body' => 'color: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'content_typography',
				'selector' => '{{WRAPPER}} .ld-store-location__body',
			]
		);

		$this->add_control(
			'icon_color',
			[
				'label'     => __( 'Icon color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#000',
				'selectors' => [
					'{{WRAPPER}} .ld-store-location__head::before, .ld-store-location__head::after' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name'     => 'location_background',
				'types'    => [ 'classic', 'gradient', 'video' ],
				'selector' => '{{WRAPPER}} .ld-store-location',
			]
		);

		$this->add_control(
			'location_padding',
			[
				'label'      => esc_html__( 'Padding', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 20,
					'right'    => 0,
					'bottom'   => 20,
					'left'     => 0,
					'unit'     => 'px',
					'isLinked' => false,
				],
				'selectors'  => [
					'{{WRAPPER}} .ld-store-location'            => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
					'{{WRAPPER}} .ld-store-location__not-found' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'label'    => __( 'Border', 'hub-elementor-addons' ),
				'name'     => 'location_border',
				'selector' => '{{WRAPPER}} .ld-store-location',
			]
		);

		$this->add_control(
			'location_border_radius',
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
					'{{WRAPPER}} .ld-store-location' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'locations_gap',
			[
				'label'      => esc_html__( 'Gap', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 1,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 0,
				],
				'selectors'  => [
					'{{WRAPPER}} .ld-store-locations__locations' => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'map_search_input_style_section',
			[
				'label' => __( 'Search Input Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'search_input_typography',
				'selector' => '{{WRAPPER}} .ld-store-locations-search__input',
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name'     => 'search_input_background',
				'types'    => [ 'classic', 'gradient', 'video' ],
				'selector' => '{{WRAPPER}} .ld-store-locations-search__input',
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'label'    => __( 'Border', 'hub-elementor-addons' ),
				'name'     => 'search_input_border',
				'selector' => '{{WRAPPER}} .ld-store-locations-search__input',
			]
		);

		$this->add_control(
			'search_input_radius',
			[
				'label'      => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 9,
					'right'    => 9,
					'bottom'   => 9,
					'left'     => 9,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'{{WRAPPER}} .ld-store-locations-search__input' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		ld_el_btn( $this, 'ib_' ); // load button

	}

	protected function get_marker() {
		$map_marker = $this->get_settings_for_display( 'map_marker' );

		if ( empty( $map_marker ) || 'html' === $map_marker ) {
			return '';
		}

		if ( 'image' === $map_marker && isset( $this->get_settings_for_display( 'custom_marker' )['url'] ) ) {
			return $this->get_settings_for_display( 'custom_marker' )['url'];
		}


		return '';
	}

	protected function get_coordinates() {
		$locations = $this->get_settings_for_display( 'locations' );

		if ( empty( $locations ) ) {
			return '';
		}

		$data = array();

		foreach ( $locations as $location ) {
			$data[] = array( esc_attr( $location['lat'] ), esc_attr( $location['long'] ) );
		}

		return $data;

	}

	protected function render() {
		$settings  = $this->get_settings_for_display();
		$title_tag = esc_attr( $settings['title_html_tag'] );
		$title     = esc_html( $settings['title'] );
		$locations = $settings['locations'];

		extract( $settings );

		if ( 0 === absint( $settings['zoom']['size'] ) ) {
			$settings['zoom']['size'] = 14;
		}

		$options = array(
			'style'        => $settings['style'],
			'address'      => $settings['address'],
			'marker_style' => $settings['map_marker'],
			'markers'      => $this->get_coordinates(),
			'distanceUnit' => $settings['distance_unit'],
			'map'          => array(
				'zoom'      => $settings['zoom']['size'] ? intval( $settings['zoom']['size'] ) : 14,
				'mapTypeId' => $settings['map_type'],
			),
		);

		if ( ! empty( $this->get_marker() ) ) {
			$options['marker'] = $this->get_marker();
		}

		$map_controls = $settings['map_controls'];

		if ( $map_controls ) {
			foreach ( $map_controls as $control ) {
				$options['map'][ $control ] = true;
			}
		}

		$html_args = [
			'locations_error_message' => $settings['locations_error_message'],
		];

		$widget_title = '<' . $title_tag . ' class="ld-store-locations__title">' . $title . '</' . $title_tag . '>';
		?>
		<div class="ld-store-locations" data-args="<?php echo esc_attr( wp_json_encode( $html_args ) ); ?>">
			<div class="ld-store-locations__heading d-flex align-items-center justify-content-between">
				<?php echo $widget_title; ?>
				<div class="ld-store-locations__browser-location">
					<?php
					$button = new LQD_Elementor_Render_Button;
					$button->get_button( $this, 'ib_' );
					?>
				</div>
			</div>
			<div class="row d-flex flex-wrap justify-content-center">
				<div class="ld-store-locations__map col-xs-12 col-md-6 ld-gmap-container pos-rel">
					<div class="ld-gmap h-100" data-plugin-map="true" data-plugin-options='<?php echo wp_json_encode( $options ) ?>'></div>
				</div>
				<div class="ld-store-locations__locations d-flex flex-column col-xs-12 col-md-6">
					<?php if ( 'yes' === $settings['show_search'] ) : ?>
						<div class="ld-store-locations-search">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
								<g>
									<path
										d="M2.5 8.33333C2.5 9.09938 2.65088 9.85792 2.94404 10.5657C3.23719 11.2734 3.66687 11.9164 4.20854 12.4581C4.75022 12.9998 5.39328 13.4295 6.10101 13.7226C6.80875 14.0158 7.56729 14.1667 8.33333 14.1667C9.09938 14.1667 9.85792 14.0158 10.5657 13.7226C11.2734 13.4295 11.9164 12.9998 12.4581 12.4581C12.9998 11.9164 13.4295 11.2734 13.7226 10.5657C14.0158 9.85792 14.1667 9.09938 14.1667 8.33333C14.1667 7.56729 14.0158 6.80875 13.7226 6.10101C13.4295 5.39328 12.9998 4.75022 12.4581 4.20854C11.9164 3.66687 11.2734 3.23719 10.5657 2.94404C9.85792 2.65088 9.09938 2.5 8.33333 2.5C7.56729 2.5 6.80875 2.65088 6.10101 2.94404C5.39328 3.23719 4.75022 3.66687 4.20854 4.20854C3.66687 4.75022 3.23719 5.39328 2.94404 6.10101C2.65088 6.80875 2.5 7.56729 2.5 8.33333Z"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path d="M17.5 17.5L12.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
								</g>
								<defs>
									<rect width="20" height="20" fill="white" />
								</defs>
							</svg>
							<input class="ld-store-locations-search__input" type="text" placeholder="<?php esc_attr_e( 'Search a location', 'hub-elementor-addons' ); ?>">
						</div>
					<?php endif; ?>
					<?php
					if ( ! empty( $locations ) ) {
						foreach ( $locations as $location ) {
							$args = array(
								'title'          => esc_html( $location['title'] ),
								'tooltipContent' => wp_kses_post( $location['tooltip_content'] ),
								'coords'         => array(
									'lat' => (float) $location['lat'],
									'lng' => (float) $location['long'],
								),
							);
							?>
							<div class="ld-store-location" data-args="<?php echo esc_attr( wp_json_encode( $args ) ); ?>">
								<div class="ld-store-location__head">
									<h3><?php echo esc_html( $location['title'] ); ?></h3>
									<?php if ( ! empty( $location['distance'] ) ) : ?>
										<span class="ld-store-location__distance"><?php echo esc_html( $location['distance'] ); ?></span>
									<?php endif; ?>
								</div>
								<div class="ld-store-location__body"><?php echo wp_kses_post( $location['content'] ); ?></div>
							</div>
							<?php
						}
					}
					?>
					<div class="ld-store-location__not-found hidden"><?php esc_html_e( 'No location found!', 'hub-elementor-addons' ); ?></div>
				</div>
			</div>
		</div>

		<?php

	}

}

Plugin::instance()->widgets_manager->register( new LD_Store_Locations() );