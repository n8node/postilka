<?php
/**
 * The template for displaying product content within loops
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/content-product.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see     https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 9.4.0
 */

defined( 'ABSPATH' ) || exit;

global $product;

// Check if the product is a valid WooCommerce product and ensure its visibility before proceeding.
if ( ! is_a( $product, WC_Product::class ) || ! $product->is_visible() ) {
	return;
}
?>
<li <?php wc_product_class( '', $product ); ?>>
	<div class="product-top">
		<a href="<?php the_permalink(); ?>" class="product-image">
			<?php 
			$img_attrs = array(
				'loading' => brighthub_get_lazy_loading_attr()
			);
			echo wp_get_attachment_image($product->get_image_id(), 'product_image_loop_size', false, $img_attrs); 
			?>
		</a>
		<div class="product-actions">
			<?php if ( function_exists( 'wpc_ajax_add_to_cart' ) ) {
				echo wpc_ajax_add_to_cart();
			} else {
				woocommerce_template_loop_add_to_cart();
			}
			if (class_exists('WPCleverWoosc')) { 
				echo do_shortcode('[woosc id="'.$product->get_id().'"]');
			} 
			if (class_exists('WPCleverWoosw')) { 
				echo do_shortcode('[woosw id="'.$product->get_id().'"]');
			} ?>
		</div>
	</div>
	<div class="product-content">
		<?php if( $product->get_average_rating() > 0 ) { ?>
			<span class="product-rating">
				<?php echo wc_get_rating_html( $product->get_average_rating() ); ?>
			</span>
		<?php } ?>
		<h2 class="product-title"><?php echo esc_html($product->get_name()); ?></h2>
		<?php if( $product->get_price() > 0 ) { ?>
			<span class="product-price"><?php echo wp_kses_post($product->get_price_html()); ?></span>
		<?php } ?>
	</div>
</li>
