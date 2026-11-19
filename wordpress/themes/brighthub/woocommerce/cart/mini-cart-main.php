<?php if (!function_exists('brighthub_hook_anchor_cart')) {
    function brighthub_hook_anchor_cart() {
        global $woocommerce; ?>
        <div id="pxl-cart-sidebar" class="pxl-popup pxl-popup--cart">
            <div class="pxl-popup__overlay"></div>
            <div class="pxl-popup__content">
                <div id="pxl-popup__loading" class="pxl-popup__loading" style="display: none;">
                    <div class="pxl-popup__loading-spinner"></div>
                </div>
                <div class="pxl-popup__header">
                    <div class="pxl-popup__close">
                        <svg class="pxl-iconsvg-close" role="presentation" viewBox="0 0 16 14" width="16" height="16">
                            <path d="M15 0L1 14m14 0L1 0" stroke="currentColor" fill="none" fill-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="pxl-popup__header-title">
                        <?php echo esc_html__('Cart', 'brighthub'); ?> 
                        <span class="widget_cart_counter">
                            (<?php echo sprintf(_n('%d item', '%d items', WC()->cart->cart_contents_count, 'brighthub'), WC()->cart->cart_contents_count); ?>)
                        </span>
                    </div>
                </div>
                
                <div class="pxl-popup__content-inner">
                    <ul class="pxl-popup__list">
                        <?php if (!WC()->cart->is_empty()) :
                            foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
                                wc_get_template(
                                    '/cart/mini-cart-item.php',        
                                    array(
                                        'cart_item'     => $cart_item,
                                        'cart_item_key' => $cart_item_key,
                                        '_product'      => $cart_item['data'],
                                        'product_id'    => $cart_item['product_id'],
                                    ),
                                    '',                                             
                                    get_stylesheet_directory() . '/woocommerce'           
                                );
                            }
                        else : ?>
                            <li class="pxl-popup__empty">
                                <i class="caseicon-shopping-cart-alt"></i>
                                <span><?php esc_html_e('Your cart is empty', 'brighthub'); ?></span>
                                <a class="btn btn-primary btn-glossy" href="<?php echo get_permalink(wc_get_page_id('shop')); ?>">
                                    <?php echo esc_html__('Browse Shop', 'brighthub'); ?>
                                </a>
                            </li>
                        <?php endif; ?>
                    </ul>
                </div>

                <div class="pxl-popup__footer" style="<?php echo WC()->cart->is_empty() ? 'display: none;' : ''; ?>">
                    <p class="pxl-popup__footer-total">
                        <strong><?php esc_html_e('Subtotal', 'brighthub'); ?>:</strong> 
                        <span class="cart-subtotal"><?php echo WC()->cart->get_cart_subtotal(); ?></span>
                    </p>

                    <?php do_action('woocommerce_widget_shopping_cart_before_buttons'); ?>

                    <p class="pxl-popup__footer-buttons">
                        <a href="<?php echo esc_url(wc_get_cart_url()); ?>" class="btn btn-primary btn-glossy wc-forward">
                            <?php esc_html_e('View Cart', 'brighthub'); ?>
                        </a>
                        <a href="<?php echo esc_url(wc_get_checkout_url()); ?>" class="btn btn-primary btn-glossy checkout wc-forward">
                            <?php esc_html_e('Checkout', 'brighthub'); ?>
                        </a>
                    </p>
                </div>
            </div>
        </div>

        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var ajaxurl = '<?php echo admin_url('admin-ajax.php'); ?>';
            var cart_nonce = '<?php echo wp_create_nonce('cart_nonce'); ?>';

            function updateQuantity(cart_item_key, quantity, action) {
                showLoading();
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'update_cart_quantity',
                        cart_item_key: cart_item_key,
                        quantity: quantity,
                        update_type: action,
                        security: cart_nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            updateCartDisplay(response.data);
                        } else {
                            console.log(response.data.message || 'Error');
                        }
                        hideLoading();
                    },
                    error: function() {
                        console.log('Error');
                        hideLoading();
                    }
                });
            }

            function removeItem(cart_item_key) {
                showLoading();
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'remove_cart_item',
                        cart_item_key: cart_item_key,
                        security: cart_nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            updateCartDisplay(response.data);
                        } else {
                            console.log(response.data.message || 'Error');
                        }
                        hideLoading();
                    },
                    error: function() {
                        hideLoading();
                    }
                });
            }

            function updateCartDisplay(data) {
                $('.widget_cart_counter').html('(' + data.cart_count_text + ')');
                $('.cart-subtotal').html(data.cart_subtotal);
                
                if (data.cart_item_key) {
                    var $item = $('.pxl-popup__item[data-cart-item-key="' + data.cart_item_key + '"]');
                    if (data.quantity > 0) {
                        $item.find('.qty-display').text(data.quantity);
                        $item.find('.total-price').html(data.item_total);
                    } else {
                        $item.fadeOut(300, function() {
                            $(this).remove();
                        });
                    }
                }
                
                if (data.cart_count === 0) {
                    $('.pxl-popup__list').html(data.empty_cart_html);
                    $('.pxl-popup__footer').hide();    
                }
                else {
                    $('.pxl-popup__footer').show(); 
                }

                $(document.body).trigger('wc_fragment_refresh');
            }

            function showLoading() {
                $('#pxl-popup__loading').fadeIn(200);
                $('.pxl-popup__content .pxl-popup__content-inner').css('opacity', '0.6');
            }

            function hideLoading() {
                $('#pxl-popup__loading').fadeOut(200);
                $('.pxl-popup__content .pxl-popup__content-inner').css('opacity', '1');
            }

            $(document).on('click', '.qty-plus', function() {
                var $btn = $(this);
                var cart_item_key = $btn.data('cart-item-key');
                var current_qty = parseInt($btn.siblings('.qty-display').text());
                
                $btn.prop('disabled', true);
                updateQuantity(cart_item_key, current_qty + 1, 'increase');
                
                setTimeout(function() {
                    $btn.prop('disabled', false);
                }, 1000);
            });

            $(document).on('click', '.qty-minus', function() {
                var $btn = $(this);
                var cart_item_key = $btn.data('cart-item-key');
                var current_qty = parseInt($btn.siblings('.qty-display').text());
                
                if (current_qty > 1) {
                    $btn.prop('disabled', true);
                    updateQuantity(cart_item_key, current_qty - 1, 'decrease');
                    
                    setTimeout(function() {
                        $btn.prop('disabled', false);
                    }, 1000);
                }
            });

            $(document).on('click', '.pxl-popup__item-remove', function() {
                var cart_item_key = $(this).data('cart-item-key');
                removeItem(cart_item_key);
            });
        });
        </script>
        <?php
    }
}

add_action('wp_ajax_update_cart_quantity', 'handle_update_cart_quantity');
add_action('wp_ajax_nopriv_update_cart_quantity', 'handle_update_cart_quantity');

function handle_update_cart_quantity() {
    if (!wp_verify_nonce($_POST['security'], 'cart_nonce')) {
        wp_die('Security check failed');
    }

    $cart_item_key = sanitize_text_field($_POST['cart_item_key']);
    $quantity = intval($_POST['quantity']);
    $update_type = sanitize_text_field($_POST['update_type']);

    if ($quantity <= 0) {
        WC()->cart->remove_cart_item($cart_item_key);
    } else {
        WC()->cart->set_quantity($cart_item_key, $quantity);
    }

    $cart_item = WC()->cart->get_cart_item($cart_item_key);
    $item_total = '';
    
    if ($cart_item && $quantity > 0) {
        $product = $cart_item['data'];
        $item_total = WC()->cart->get_product_subtotal($product, $quantity);
    }

    $response_data = array(
        'cart_count' => WC()->cart->get_cart_contents_count(),
        'cart_count_text' => sprintf(_n('%d item', '%d items', WC()->cart->get_cart_contents_count(), 'brighthub'), WC()->cart->get_cart_contents_count()),
        'cart_subtotal' => WC()->cart->get_cart_subtotal(),
        'cart_item_key' => $cart_item_key,
        'quantity' => $quantity,
        'item_total' => $item_total,
        'empty_cart_html' => $quantity <= 0 && WC()->cart->is_empty() ? get_empty_cart_html() : ''
    );

    wp_send_json_success($response_data);
}

add_action('wp_ajax_remove_cart_item', 'handle_remove_cart_item');
add_action('wp_ajax_nopriv_remove_cart_item', 'handle_remove_cart_item');

function handle_remove_cart_item() {
    if (!wp_verify_nonce($_POST['security'], 'cart_nonce')) {
        wp_die('Security check failed');
    }

    $cart_item_key = sanitize_text_field($_POST['cart_item_key']);
    $removed = WC()->cart->remove_cart_item($cart_item_key);

    if ($removed) {
        $response_data = array(
            'cart_count' => WC()->cart->get_cart_contents_count(),
            'cart_count_text' => sprintf(_n('%d item', '%d items', WC()->cart->get_cart_contents_count(), 'brighthub'), WC()->cart->get_cart_contents_count()),
            'cart_subtotal' => WC()->cart->get_cart_subtotal(),
            'cart_item_key' => $cart_item_key,
            'quantity' => 0,
            'empty_cart_html' => WC()->cart->is_empty() ? get_empty_cart_html() : ''
        );

        wp_send_json_success($response_data);
    } else {
        wp_send_json_error(array('message' => 'Cannot remove item, please try again later.'));
    }
}

function get_empty_cart_html() {
    ob_start();
    ?>
    <li class="pxl-popup__empty">
        <i class="caseicon-shopping-cart-alt"></i>
        <span><?php esc_html_e('Your cart is empty', 'brighthub'); ?></span>
        <a class="btn btn-primary btn-glossy" href="<?php echo get_permalink(wc_get_page_id('shop')); ?>">
            <?php echo esc_html__('Browse Shop', 'brighthub'); ?>
        </a>
    </li>
    <?php
    return ob_get_clean();
}

if (class_exists('WooCommerce')) {
    add_action('wp_ajax_nopriv_item_added', 'brighthub_addedtocart_sweet_message');
    add_action('wp_ajax_item_added', 'brighthub_addedtocart_sweet_message');
    function brighthub_addedtocart_sweet_message() {
        echo isset($_POST['id']) && $_POST['id'] > 0 ? (int) esc_attr($_POST['id']) : false;
        wp_die();
    }
}

add_action('wp_footer', 'brighthub_cart_hidden_sidebar');
function brighthub_cart_hidden_sidebar() {
    if (is_checkout()) return;
    
    $cart_url = esc_url(wc_get_cart_url());
    $checkout_url = esc_url(wc_get_checkout_url());
    $subtotal_text = esc_html__('Subtotal', 'brighthub');
    $view_cart_text = esc_html__('View Cart', 'brighthub');
    $checkout_text = esc_html__('Checkout', 'brighthub');
    ?>
    <script type="text/javascript">
        jQuery(function($){
            if ( typeof wc_add_to_cart_params === 'undefined' ) return;

            var cartUrl = '<?php echo $cart_url; ?>';
            var checkoutUrl = '<?php echo $checkout_url; ?>';
            var subtotalText = '<?php echo $subtotal_text; ?>';
            var viewCartText = '<?php echo $view_cart_text; ?>';
            var checkoutText = '<?php echo $checkout_text; ?>';

            function refreshSidebar( callback ){
                $.post( wc_add_to_cart_params.ajax_url, { action: 'get_cart_sidebar' }, function( res ){
                    if( res.success ){
                        $('.pxl-popup__list').html( res.data.html );
                        $('.cart-subtotal').html( res.data.cart_subtotal );
                        $('.widget_cart_counter').html(
                            '(' + res.data.cart_count + ' ' + (res.data.cart_count == 1 ? 'item' : 'items') + ')'
                        );
                        if (res.data.cart_count === 0) {
                            $('.pxl-popup__list').html(res.data.empty_cart_html);
                            $('.pxl-popup__footer').hide();
                        } else {
                            $('.pxl-popup__list').html(res.data.html);
                            // Ensure footer exists and is visible
                            var $footer = $('.pxl-popup__footer');
                            if ($footer.length === 0) {
                                // If footer doesn't exist, create it
                                var footerHtml = '<div class="pxl-popup__footer">' +
                                    '<p class="pxl-popup__footer-total">' +
                                    '<strong>' + subtotalText + ':</strong> ' +
                                    '<span class="cart-subtotal">' + res.data.cart_subtotal + '</span>' +
                                    '</p>' +
                                    '<p class="pxl-popup__footer-buttons">' +
                                    '<a href="' + cartUrl + '" class="btn btn-primary btn-glossy wc-forward">' + viewCartText + '</a> ' +
                                    '<a href="' + checkoutUrl + '" class="btn btn-primary btn-glossy checkout wc-forward">' + checkoutText + '</a>' +
                                    '</p>' +
                                    '</div>';
                                $('.pxl-popup__content-inner').after(footerHtml);
                            } else {
                                $footer.show();
                            }
                        }
                    }
                    if ( typeof callback === 'function' ) callback();
                });
            }

            $(document.body).on('added_to_cart', function(){
                refreshSidebar(function(){
                    $('#pxl-cart-sidebar').addClass('active');
                });
            });

            $(document).on('click','.pxl-popup__close, .pxl-popup__overlay', function(e){
                e.preventDefault();
                e.stopPropagation();
                $('#pxl-cart-sidebar').removeClass('active');
                $('body').removeClass('body-overflow');
            });

            $(document).on('wc_fragment_refresh', function(){
                refreshSidebar();
            });
        });
    </script>
    <?php
}

add_action( 'wp_ajax_get_cart_sidebar',        'brighthub_get_cart_sidebar' );
add_action( 'wp_ajax_nopriv_get_cart_sidebar', 'brighthub_get_cart_sidebar' );
function brighthub_get_cart_sidebar() {
    ob_start();
    woocommerce_mini_cart();
    $mini = ob_get_clean();

    preg_match( '~<ul[^>]*>(.*)</ul>~is', $mini, $m );
    $ul_html = isset( $m[0] ) ? $m[0] : '';

    $empty_html = WC()->cart->is_empty() ? get_empty_cart_html() : '';

    wp_send_json_success( array(
        'html'          => $ul_html ?: $empty_html,
        'cart_count'    => WC()->cart->get_cart_contents_count(),
        'cart_subtotal' => WC()->cart->get_cart_subtotal(),
    ) );
}
