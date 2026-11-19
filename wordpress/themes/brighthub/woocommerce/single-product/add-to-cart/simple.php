<?php
/**
 * Simple product add to cart
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/single-product/add-to-cart/simple.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 20.0.1
 */

defined( 'ABSPATH' ) || exit;

global $product;

if ( ! $product->is_purchasable() ) {
	return;
}

echo wc_get_stock_html( $product ); // WPCS: XSS ok.

if ( $product->is_in_stock() ) : ?>

	<?php do_action( 'woocommerce_before_add_to_cart_form' ); ?>

	<form class="cart simple-cart" action="<?php echo esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ); ?>" method="post" enctype='multipart/form-data'>
		<?php do_action( 'woocommerce_before_add_to_cart_button' ); ?>

		<?php
		do_action( 'woocommerce_before_add_to_cart_quantity' );
		?>
		<div class="quantity-form">
			<span class="quantity-label">Quantity:</span>
			<div class="quantity-wrap">
				<div class="quantity-action quantity-action--down"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.4688 7C12.4688 7.17405 12.3996 7.34097 12.2765 7.46404C12.1535 7.58711 11.9865 7.65625 11.8125 7.65625H2.1875C2.01345 7.65625 1.84653 7.58711 1.72346 7.46404C1.60039 7.34097 1.53125 7.17405 1.53125 7C1.53125 6.82595 1.60039 6.65903 1.72346 6.53596C1.84653 6.41289 2.01345 6.34375 2.1875 6.34375H11.8125C11.9865 6.34375 12.1535 6.41289 12.2765 6.53596C12.3996 6.65903 12.4688 6.82595 12.4688 7Z" fill="black"/></svg></div>
				<?php
					woocommerce_quantity_input(
						array(
							'min_value'   => apply_filters( 'woocommerce_quantity_input_min', $product->get_min_purchase_quantity(), $product ),
						'max_value'   => apply_filters( 'woocommerce_quantity_input_max', $product->get_max_purchase_quantity(), $product ),
						'input_value' => isset( $_POST['quantity'] ) ? wc_stock_amount( wp_unslash( $_POST['quantity'] ) ) : $product->get_min_purchase_quantity(), // WPCS: CSRF ok, input var ok.
						)
					);
				?>
				<div class="quantity-action quantity-action--up"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.4688 7C12.4688 7.17405 12.3996 7.34097 12.2765 7.46404C12.1535 7.58711 11.9865 7.65625 11.8125 7.65625H7.65625V11.8125C7.65625 11.9865 7.58711 12.1535 7.46404 12.2765C7.34097 12.3996 7.17405 12.4688 7 12.4688C6.82595 12.4688 6.65903 12.3996 6.53596 12.2765C6.41289 12.1535 6.34375 11.9865 6.34375 11.8125V7.65625H2.1875C2.01345 7.65625 1.84653 7.58711 1.72346 7.46404C1.60039 7.34097 1.53125 7.17405 1.53125 7C1.53125 6.82595 1.60039 6.65903 1.72346 6.53596C1.84653 6.41289 2.01345 6.34375 2.1875 6.34375H6.34375V2.1875C6.34375 2.01345 6.41289 1.84653 6.53596 1.72346C6.65903 1.60039 6.82595 1.53125 7 1.53125C7.17405 1.53125 7.34097 1.60039 7.46404 1.72346C7.58711 1.84653 7.65625 2.01345 7.65625 2.1875V6.34375H11.8125C11.9865 6.34375 12.1535 6.41289 12.2765 6.53596C12.3996 6.65903 12.4688 6.82595 12.4688 7Z" fill="black"/></svg></div>
			</div>
		</div>
		<?php do_action( 'woocommerce_after_add_to_cart_quantity' );
		?>

		<button type="submit" name="add-to-cart" value="<?php echo esc_attr( $product->get_id() ); ?>" class="single_add_to_cart_button button btn btn-glossy alt<?php echo esc_attr( wc_wp_theme_get_element_class_name( 'button' ) ? ' ' . wc_wp_theme_get_element_class_name( 'button' ) : '' ); ?>">
			<?php echo esc_html( $product->single_add_to_cart_text() ); ?> 
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M15.0969 4.04625C15.0269 3.95421 14.9367 3.87959 14.8331 3.8282C14.7296 3.77681 14.6156 3.75005 14.5 3.75H3.76437L3.2225 1.79938C3.17865 1.64143 3.08427 1.5022 2.95379 1.40299C2.82331 1.30377 2.66392 1.25004 2.5 1.25H1.25C1.05109 1.25 0.860322 1.32902 0.71967 1.46967C0.579018 1.61032 0.5 1.80109 0.5 2C0.5 2.19891 0.579018 2.38968 0.71967 2.53033C0.860322 2.67098 1.05109 2.75 1.25 2.75H1.93L4.07375 10.4681C4.17697 10.8365 4.39767 11.161 4.70228 11.3924C5.00688 11.6238 5.37873 11.7493 5.76125 11.75H11.9375C12.32 11.7493 12.6919 11.6238 12.9965 11.3924C13.3011 11.161 13.5218 10.8365 13.625 10.4681L15.2269 4.70062C15.2572 4.58892 15.2612 4.47171 15.2386 4.35819C15.2161 4.24466 15.1676 4.1379 15.0969 4.04625ZM12.175 10.0669C12.1605 10.119 12.1296 10.165 12.0868 10.198C12.0439 10.231 11.9916 10.2493 11.9375 10.25H5.76C5.7054 10.2499 5.65231 10.232 5.60886 10.1989C5.56541 10.1659 5.53398 10.1195 5.51937 10.0669L4.18125 5.25H13.5131L12.175 10.0669ZM6.75 13.75C6.75 13.9972 6.67669 14.2389 6.53934 14.4445C6.40199 14.65 6.20676 14.8102 5.97835 14.9048C5.74995 14.9995 5.49861 15.0242 5.25614 14.976C5.01366 14.9278 4.79093 14.8087 4.61612 14.6339C4.4413 14.4591 4.32225 14.2363 4.27402 13.9939C4.22579 13.7514 4.25054 13.5001 4.34515 13.2716C4.43976 13.0432 4.59998 12.848 4.80554 12.7107C5.0111 12.5733 5.25277 12.5 5.5 12.5C5.83152 12.5 6.14946 12.6317 6.38388 12.8661C6.6183 13.1005 6.75 13.4185 6.75 13.75ZM13.25 13.75C13.25 13.9972 13.1767 14.2389 13.0393 14.4445C12.902 14.65 12.7068 14.8102 12.4784 14.9048C12.2499 14.9995 11.9986 15.0242 11.7561 14.976C11.5137 14.9278 11.2909 14.8087 11.1161 14.6339C10.9413 14.4591 10.8222 14.2363 10.774 13.9939C10.7258 13.7514 10.7505 13.5001 10.8452 13.2716C10.9398 13.0432 11.1 12.848 11.3055 12.7107C11.5111 12.5733 11.7528 12.5 12 12.5C12.3315 12.5 12.6495 12.6317 12.8839 12.8661C13.1183 13.1005 13.25 13.4185 13.25 13.75Z" fill="white"/>
			</svg>
		</button>
		<?php if (class_exists('WPCleverWoosc')) { ?>
			<?php echo do_shortcode('[woosc id="'.$product->get_id().'"]'); ?>
		<?php } ?>
		<?php if (class_exists('WPCleverWoosw')) { ?>
				<?php echo do_shortcode('[woosw id="'.$product->get_id().'"]'); ?>
		<?php } ?>

		<?php do_action( 'woocommerce_after_add_to_cart_button' ); ?>
	</form>

	<?php do_action( 'woocommerce_after_add_to_cart_form' ); ?>

<?php endif; ?>
