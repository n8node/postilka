<?php
$icon_type  = $settings['icon_image_type'] ?? '';
$image      = (isset($settings['image']) && is_array($settings['image'])) ? $settings['image'] : [];
$pxl_icon   = (isset($settings['pxl_icon']) && is_array($settings['pxl_icon'])) ? $settings['pxl_icon'] : [];
$title      = $settings['title'] ?? '';
$show_title = ($settings['show_title'] ?? '') === 'yes';
$show_count = ($settings['show_cart_number'] ?? '') === 'yes';

$has_image_id  = !empty($image['id']);
$has_image_url = !empty($image['url']);

$cart_exists = function_exists('WC') && WC() && isset(WC()->cart) && WC()->cart;
$cart_count  = $cart_exists ? (int) WC()->cart->cart_contents_count : 0;
?>
<div class="pxl-icon-cart-popup pxl-icon-cart-popup--style-df pxl-anchor-button" data-target="#pxl-cart-sidebar">
    <div class="pxl-icon-cart-popup__icon">
        <?php if ($icon_type === 'img' && ($has_image_id || $has_image_url)) : ?>
            <?php
            if ($has_image_id) {
                if (function_exists('pxl_get_image_by_size')) {
                    $img_icon = pxl_get_image_by_size([
                        'attach_id'  => $image['id'],
                        'thumb_size' => 'full',
                    ]);
                    echo isset($img_icon['thumbnail']) ? pxl_print_html($img_icon['thumbnail']) : '';
                } else {
                    echo wp_get_attachment_image((int) $image['id'], 'full', false, ['alt' => '']);
                }
            } elseif ($has_image_url) {
                echo '<img src="' . esc_url($image['url']) . '" alt="" />';
            }
            ?>
        <?php elseif ($icon_type === 'ic' && !empty($pxl_icon['value'])) : ?>
            <?php
            if (class_exists('\Elementor\Icons_Manager')) {
                \Elementor\Icons_Manager::render_icon($pxl_icon, ['aria-hidden' => 'true'], 'i');
            }
            ?>
        <?php endif; ?>
    </div>

    <div class="pxl-icon-cart-popup__content">
        <?php if ($show_title) : ?>
            <div class="pxl-icon-cart-popup__title"><?php echo esc_html($title); ?></div>
        <?php endif; ?>
        <?php if ($show_count) : ?>
            <div class="pxl-icon-cart-popup__number">
                <span class="pxl-icon-cart-popup__number-separator">|</span>
                <span class="pxl-icon-cart-popup__number-text">
                    <?php
                    if ($cart_exists) {
                        $display_count = $cart_count < 10 ? '0' . $cart_count : $cart_count;
                        echo esc_html(sprintf(_n('%d', '%d', $display_count, 'brighthub'), $display_count));
                    } else {
                        // Show placeholder in Elementor editor
                        echo '00';
                    }
                    ?>
                </span>
            </div>
        <?php endif; ?>
    </div>
</div>

