<?php
/**
 *
 * @var array       $cart_item
 * @var string      $cart_item_key
 * @var WC_Product  $_product
 * @var int         $product_id
 */

if ( empty( $_product ) || ! $_product->exists() || $cart_item['quantity'] <= 0 ) {
    return;
}

$qty           = $cart_item['quantity'];
$product_link  = $_product->get_permalink( $cart_item );
$product_name  = $_product->get_title();
$thumbnail     = $_product->get_image();
$product_price = WC()->cart->get_product_price( $_product );
?>
<li class="pxl-popup__item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
    <button type="button" class="pxl-popup__item-remove"
            data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>"
            data-product-id="<?php echo esc_attr( $product_id ); ?>"
            title="<?php esc_attr_e( 'Remove this item', 'brighthub' ); ?>">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M13 1L1 13m12 0L1 1" stroke="currentColor" fill="none"/></svg>
    </button>

    <?php if ( $thumbnail ) : ?>
        <div class="pxl-popup__item-image">
            <a href="<?php echo esc_url( $product_link ); ?>">
                <?php echo str_replace( array( 'http:', 'https:' ), '', $thumbnail ); ?>
            </a>
        </div>
    <?php endif; ?>

    <div class="pxl-popup__item-meta">
        <div class="product-info">
            <a href="<?php echo esc_url( $product_link ); ?>" class="product-name">
                <?php echo esc_html( $product_name ); ?>
            </a>

            <?php
            $vars = $_product->is_type( 'variation' )
                ? $_product->get_variation_attributes()
                : ( $cart_item['variation'] ?? array() );

            if ( ! empty( $vars ) ) {
                echo '<div class="product-variations">';
                foreach ( $vars as $att_name => $att_val ) {
                    if ( $att_val ) {
                        $label = wc_attribute_label( str_replace( 'attribute_', '', $att_name ) );
                        echo '<span class="variation-item">' . esc_html( $label ) . ': <strong>' . esc_html( $att_val ) . '</strong></span>';
                    }
                }
                echo '</div>';
            }
            ?>
        </div>

        <div class="quantity-controls">
            <button type="button" class="qty-btn qty-minus"
                    data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>"
                    data-product-id="<?php echo esc_attr( $product_id ); ?>">-</button>

            <span class="qty-display"><?php echo esc_html( $qty ); ?></span>

            <button type="button" class="qty-btn qty-plus"
                    data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>"
                    data-product-id="<?php echo esc_attr( $product_id ); ?>">+</button>

            <span class="unit-price">x <?php echo wp_kses_post($product_price); ?></span>
        </div>

        <span class="total-price">
            Total: <strong><?php echo WC()->cart->get_product_subtotal( $_product, $qty ); ?></strong>
        </span>
    </div>
</li>
