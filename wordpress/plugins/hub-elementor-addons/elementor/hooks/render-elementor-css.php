<?php

use Elementor\Core\Base\Module;
use Elementor\Controls_Manager;
use Elementor\Controls_Stack;
use Elementor\Element_Base;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Typography;
use Elementor\Group_Control_Background;
use Elementor\Core\Settings\Manager;
use Elementor\Plugin;

defined( 'ABSPATH' ) || exit;

class LD_Render_Elementor_CSS {

	private $page_id = 0;
	const OPTION_NAME = 'liquid_templates_callback_css';

	public function __construct() {
		add_action( 'wp_enqueue_scripts', [ $this, 'add_css' ], 20 );
	}

	function get_page_option( $option, $post_id = '' ){
		if ( defined( 'ELEMENTOR_VERSION' ) && is_callable( 'Elementor\Plugin::instance' ) ) {
			$post_id = !empty( $post_id ) ? $post_id : get_the_ID();
			if ( $this->page_id > 0 ) {
				$post_id = $this->page_id;
			}
 			$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
			$page_settings_model = $page_settings_manager->get_model( $post_id );
			return $page_settings_model->get_settings( $option );
		}
	}

	function add_css() {
		if ( get_option( self::OPTION_NAME, '' ) ) {
			wp_add_inline_style( 'elementor-frontend', get_option( self::OPTION_NAME, '' ) );
			return '';
		}
		$css = '';
		$options = [
			'header_sticky_bg' => [
				'type' => 'bg_image',
				'page_id' => liquid_get_custom_header_id(),
				'selector' => '.main-header.is-stuck > .elementor '. $this->get_the_selectors(),
			],
			'footer_background' => [
				'type' => 'bg_image',
				'page_id' => liquid_get_custom_footer_id(),
				'selector' => '.main-footer',
			],
		];

		$devices = Plugin::$instance->breakpoints->get_active_devices_list( [
			'reverse' => true,
			'desktop_first' => true,
		] );

		$breakpoints = [
			'viewport_mobile' => 767,
			'viewport_mobile_extra' => 880,
			'viewport_tablet' => 1024,
			'viewport_tablet_extra' => 1200,
			'viewport_laptop' => 1366,
			'viewport_widescreen' => 2400,
		];

		$a = \Elementor\Plugin::$instance->kits_manager->get_active_kit_for_frontend()->get_settings_for_display( 'viewport_tablet' );

		foreach( $devices as $device ){
			$value = \Elementor\Plugin::$instance->kits_manager->get_active_kit_for_frontend()->get_settings_for_display( 'viewport_' . $device );
			if ( empty( $value) ){ // if return empty, get data from $defaults array.
				$viewport_key = 'viewport_' . $device;
				$viewport = isset($breakpoints[$viewport_key]) ? $breakpoints[$viewport_key] : null;
			} else {
				$viewport = $value;
			}

			if ( ! in_array( $device, [ 'desktop' ] ) ) {
				$css .= "@media (max-width: {$viewport}px){";
			}
			foreach( $options as $option_key => $option ) {
				$this->page_id = $option['page_id'];
				$_option_key = str_replace( '_desktop', '', $option_key . '_' . $device );
				if ( $this->get_css_option( $option_key, $option['type']) ) {
					$css .= $option['selector'] . "{" . $this->get_css_option($_option_key, $option['type']) . "}";
				}
			}
			if ( ! in_array( $device, [ 'desktop' ] ) ) {
				$css .= "}";
			}
		}

		wp_add_inline_style( 'elementor-frontend', $css );
		update_option( self::OPTION_NAME, $css );
	}

	function get_css_option( $option, $type ) {
		if ( $type === 'padding' ){
			if ( $values = $this->get_page_option( $option ) ) {
				$values = "padding: $values[top]$values[unit] $values[right]$values[unit] $values[bottom]$values[unit] $values[left]$values[unit]";
				return $values;
			}
		}

		if ( $type === 'font' ) {
			if ( $values = $this->get_page_option( $option ) ) {
				$values = "font-size: $values[size]$values[unit]";
				return $values;
			}
		}

		if ( $type === 'bg_image' ) {
			$bg = '';
			$o_bg = $this->get_bg_option_key( $option, 'image' );
			$o_size = $this->get_bg_option_key( $option, 'size' );
			$o_position = $this->get_bg_option_key( $option, 'position' );
			$o_position_x = $this->get_bg_option_key( $option, 'xpos' );
			$o_position_y = $this->get_bg_option_key( $option, 'ypos' );
			$o_attachment = $this->get_bg_option_key( $option, 'attachment' );
			$o_color = $this->get_bg_option_key( $option, 'color' );

			if ( $values = $this->get_page_option( $o_bg ) ) {
				if ( $url = $values['url'] ){
					$bg .= sprintf( 'background-image: url("%s");', $url );
				}
				if ( $size = $this->get_page_option( $o_size ) ){
					$bg .= sprintf( 'background-size: %s;', $size );
				}
				if ( $position = $this->get_page_option( $o_position ) ){
					if ( $position === 'initial' ) {
						$o_position_x = $this->get_page_option( $o_position_x );
						$o_position_y = $this->get_page_option( $o_position_y );

						if ( $o_position_x && $o_position_y ){
							$bg .= sprintf( 'background-position: %s %s;', $o_position_x['size'].$o_position_x['unit'], $o_position_y['size'].$o_position_y['unit'] );
						}

					} else {
						$bg .= sprintf( 'background-position: %s;', $position );
					}
				}
				if ( $attachment = $this->get_page_option( $o_attachment ) ){
					$bg .= sprintf( 'background-repeat: %s;', $attachment );
				}

			}

			if ( $this->get_page_option( $o_color ) ) {
				$bg .= sprintf( 'background-color: %s;', $this->get_page_option( $o_color ) );
			}

			return $bg;
		}
	}

	function get_bg_option_key( $option, $suffix ) {
		$keys = [
			'footer_background',
			'header_sticky_bg',
		];

		$replaces = [
			"footer_background_{$suffix}",
			"header_sticky_bg_{$suffix}",
		];
		return str_replace( $keys, $replaces, $option );
	}

	public function get_the_selectors(){
		$editor_mode = \Elementor\Plugin::$instance->editor->is_edit_mode();
		$section_wrap = version_compare( ELEMENTOR_VERSION, '3.6', '<' ) || $editor_mode ? '> .elementor-section-wrap ' : '';

		$selector = $section_wrap . '> :is(.elementor-section, .e-con)';

		return $selector;
	}
}

new LD_Render_Elementor_CSS();
