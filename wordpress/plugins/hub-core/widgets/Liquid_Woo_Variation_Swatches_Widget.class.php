<?php
/**
 * List products. One widget to rule them all.
 *
 * @package WooCommerce/Widgets
 * @version 3.3.0
 */


defined( 'ABSPATH' ) || exit;

/**
 * Widget products.
 */
class Liquid_Woo_Variation_Swatches_Widget extends WC_Widget {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->widget_cssclass    = 'liquid_woo_variation_swatches_widget';
		$this->widget_description = __( "A list of your store's variation swatches.", 'landinghub-core' );
		$this->widget_id          = 'liquid_woocommerce_variation_swatches';
		$this->widget_name        = __( 'Liquid Woo Variation Swatches (AJAX)', 'landinghub-core' );
		$this->settings           = array();

		parent::__construct();
	}

	/**
	 * Get variation filters.
	 *
	 * @return array
	 */
	public function get_variation_filters() {
		$filters = [];

		foreach ( wc_get_attribute_taxonomies() as $attribute ) {
			if ( ! in_array( $attribute->attribute_type, [ 'color', 'image', 'button' ] ) ) {
				continue;
			}

			$taxonomy = wc_attribute_taxonomy_name( $attribute->attribute_name );

			$terms = get_terms([
				'taxonomy'   => $taxonomy,
				'hide_empty' => true,
			]);

			if ( empty( $terms ) || is_wp_error( $terms ) ) {
				continue;
			}

			$filters[ $taxonomy ] = [
				'label' => $attribute->attribute_label,
				'type' => $attribute->attribute_type,
				'terms' => $terms,
			];
		}

		return $filters;
	}

	/**
	 * Output widget.
	 *
	 * @param array $args     Arguments.
	 * @param array $instance Widget instance.
	 *
	 * @see WP_Widget
	 */
	public function widget( $args, $instance ) {

		if ( $this->get_cached_widget( $args ) ) {
			return;
		}

		ob_start();

		$variations = $this->get_variation_filters();
		if ( $variations ) {
			$this->widget_start( $args, $instance );

			foreach ( $variations as $taxonomy => $data ) {
				?>
				<div class="liquid-woo-variation-swatches-widget">
					<h3 class="widget-title liquid-woo-variation-swatches-widget__title"><?php echo esc_html( $data['label'] ); ?></h3>
					<div class="liquid-woo-variation-swatches-widget__swatches">
						<?php
							foreach ( $data['terms'] as $term ) {
								$swatch_style = '';
								$swatch_content = '';

								switch( $data['type'] ) {
									case 'color':
										$swatch_style = "--lqd-wc-swatch-color:" . get_term_meta( $term->term_id, 'hub_color', true );
										break;
									case 'image':
										$image_id = get_term_meta( $term->term_id, 'hub_image', true );
										$swatch_content = $image_id ? wp_get_attachment_image( $image_id, 'thumbnail' ) : '';
										break;
									case 'button':
										$swatch_content = $term->name;
										break;
								}
							?>
								<span
									class="lqd-wc-swatch lqd-wc-swatch-<?php echo esc_attr( $data['type'] ); ?>"
									<?php if ( $swatch_style ) { ?>style="<?php echo esc_attr( $swatch_style ); ?>"<?php } ?>
								><?php if ( ! empty( $swatch_content ) ) echo wp_kses_post( $swatch_content ); ?>
								<input type="hidden" data-taxonomy="<?php echo esc_attr( $taxonomy ); ?>" data-term-id="<?php echo esc_attr( $term->term_id ); ?>" /></span>
								<?php
							}
						?>
					</div>
				</div>
				<?php
			}

			$this->widget_end( $args );
		}

		wp_reset_postdata();

		echo $this->cache_widget( $args, ob_get_clean() ); // WPCS: XSS ok.
	}
}