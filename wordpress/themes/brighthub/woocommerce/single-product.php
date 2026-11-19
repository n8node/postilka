<?php
/**
 * The Template for displaying all single products
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/single-product.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see         https://woocommerce.com/document/template-structure/
 * @package     WooCommerce\Templates
 * @version     20.0.0
 */
get_header();

if(is_singular('product')){
    $brighthub_sidebar = brighthub()->get_sidebar_args(['type' => 'product', 'content_col'=> '12']);
}else{
    $brighthub_sidebar = brighthub()->get_sidebar_args(['type' => 'shop', 'content_col'=> '9']);
} ?>
<div class="container">
    <div class="row <?php echo esc_attr($brighthub_sidebar['wrap_class']) ?>">
        <div id="pxl-content-area" class="<?php echo esc_attr($brighthub_sidebar['content_class']) ?>">
            <?php woocommerce_content(); ?>
        </div>

        <?php if ($brighthub_sidebar['sidebar_class'] && !is_singular('product')) : ?>
            <aside id="pxl-sidebar-area"class="<?php echo esc_attr($brighthub_sidebar['sidebar_class']) ?>">
                <div class="pxl-sidebar-sticky">
                    <?php get_sidebar(); ?>
                </div>
            </aside>
        <?php endif; ?>
    </div>
</div>
<?php get_footer();