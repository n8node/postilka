<?php
namespace Elementor\Includes\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class PXL_Container extends Container {

	/**
	 * Render the element JS template.
	 *
	 * @return void
	 */
	protected function content_template() {
		?>
		<#
			let before_render = elementor.hooks.applyFilters('pxl_element_container/before-render', '', settings);
			let after_render = elementor.hooks.applyFilters('pxl_element_container/after-render', '', settings);

		#>
		{{{ before_render }}}
		<# if ( 'boxed' === settings.content_width ) { #>
			<div class="e-con-inner">
		<#
		}
		if ( settings.background_video_link ) {
			let videoAttributes = 'autoplay muted playsinline';

			if ( ! settings.background_play_once ) {
				videoAttributes += ' loop';
			}

			view.addRenderAttribute( 'background-video-container', 'class', 'elementor-background-video-container' );

			if ( ! settings.background_play_on_mobile ) {
				view.addRenderAttribute( 'background-video-container', 'class', 'elementor-hidden-phone' );
			}
			#>
			<div {{{ view.getRenderAttributeString( 'background-video-container' ) }}}>
				<div class="elementor-background-video-embed"></div>
				<video class="elementor-background-video-hosted elementor-html5-video" {{ videoAttributes }}></video>
			</div>
		<# } #>
		<div class="elementor-shape elementor-shape-top"></div>
		<div class="elementor-shape elementor-shape-bottom"></div>
		<# if ( 'boxed' === settings.content_width ) { #>
			</div>
		<# } #>

		{{{after_render}}}
		<?php
	}
	
	/**
	 * Before rendering the container content. (Print the opening tag, etc.)
	 *
	 * @return void
	 */
	public function before_render() {
		$settings = $this->get_settings_for_display();
		$link = $settings['link'];
		
		if ( ! empty( $link['url'] ) ) {
			$this->add_link_attributes( '_wrapper', $link );
		}
		
		$custom_class = apply_filters( 'pxl_custom_class', '', $settings );

		$this->add_render_attribute( '_wrapper', 'class', $custom_class);
		
		?><<?php $this->print_html_tag(); ?> <?php $this->print_render_attribute_string( '_wrapper' ); ?>><?php
		
		echo apply_filters( 'pxl_element_container/before-render', '', $settings );
		if ( $this->is_boxed_container( $settings ) ) { ?>
			<div class="e-con-inner">
		<?php }
		
		$this->render_video_background();
		
		if ( ! empty( $settings['shape_divider_top'] ) ) {
			$this->render_shape_divider( 'top' );
		}
		
		if ( ! empty( $settings['shape_divider_bottom'] ) ) {
			$this->render_shape_divider( 'bottom' );
		}
	}
	/**
	 * After rendering the Container content. (Print the closing tag, etc.)
	 *
	 * @return void
	 */
	public function after_render() {
		$settings = $this->get_settings_for_display();
		if ( $this->is_boxed_container( $settings ) ) { ?>
			</div>
		<?php } ?>
		</<?php $this->print_html_tag(); ?>>
		<?php
		echo apply_filters( 'pxl_element_container/after-render', '', $settings );
	}

}
