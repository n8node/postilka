<?php
/**
 * The Template for displaying product archives, including the main shop page which is a post type archive
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/archive-product.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 20.0.0
 */
get_header(); 

if (is_singular('product')) {
    $sidebar_args = brighthub()->get_sidebar_args([
        'type'        => 'product',
        'content_col' => '12',
    ]);
} else {
    $sidebar_args = brighthub()->get_sidebar_args([
        'type'        => 'shop',
        'content_col' => '9',
    ]);
}
?>
<div class="container">
    <div class="row <?php echo esc_attr($sidebar_args['wrap_class']); ?>">
        <div id="pxl-content-area" class="<?php echo esc_attr($sidebar_args['content_class']); ?>">
            <main id="pxl-content-main">
                
                <?php if (!is_singular('product')) : ?>
                    <?php get_template_part('woocommerce/layouts/filter'); ?>
                    
                    <div class="pxl-shop-header">
                        <?php do_action('woocommerce_before_shop_loop'); ?>
                    </div>
                <?php endif; ?>

                <div class="pxl-products-container">
                    <?php
                    if (woocommerce_product_loop()) {
                        if (is_singular('product')) {
                            do_action('woocommerce_before_shop_loop');
                        }

                        woocommerce_product_loop_start();

                        while (have_posts()) {
                            the_post();
                            do_action('woocommerce_shop_loop');
                            wc_get_template_part('content', 'product');
                        }

                        woocommerce_product_loop_end();

                        do_action('woocommerce_after_shop_loop');
                        
                    } else {
                        do_action('woocommerce_no_products_found');
                    }
                    ?>
                </div>

            </main>
        </div>

        <?php if ($sidebar_args['sidebar_class'] && !is_singular('product')) : ?>
            <aside id="pxl-sidebar-area" class="<?php echo esc_attr($sidebar_args['sidebar_class']); ?>">
                <div class="pxl-sidebar-sticky">
                    <?php get_sidebar(); ?>
                </div>
            </aside>
        <?php endif; ?>

    </div>
</div>

<?php get_footer(); ?>