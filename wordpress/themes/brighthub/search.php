<?php
/**
 *
 * @package Case-Themes
 */
get_header();
$brighthub_sidebar_pos = brighthub()->get_theme_opt( 'blog_sidebar_pos', 'right' );
$type_from_url = '';
foreach (['blog', 'standard', 'page', 'shop', 'post'] as $t) {
    if (isset($_GET["sidebar-$t"])) {
        $type_from_url = $t;
        break;
    }
}
$sidebar_type = $type_from_url ?: 'blog';

$brighthub_sidebar = brighthub()->get_sidebar_args([
    'type' => $sidebar_type,
    'content_col'=> ''
]);

$archive_style = brighthub()->get_theme_opt('archive_style', 'listing');
?>
<div class="container">
    <div class="row <?php echo esc_attr($brighthub_sidebar['wrap_class']) ?> pxl-post-listing">
        <section id="pxl-content-area" class="pxl-content-area">
            <main id="pxl-content-main" class="pxl-posts <?php echo esc_attr($brighthub_sidebar['content_class']) ?> pxl-posts--<?php echo esc_attr($archive_style); ?>">
                <?php if ( have_posts() ) {
                    while ( have_posts() ) {
                        the_post();
                        get_template_part( 'template-parts/content/archive/standard' );
                    }
                    brighthub()->page->get_pagination();
                } else {
                    get_template_part( 'template-parts/content/content', 'none' );
                } ?>
            </main>
        </section>
        <?php if ($brighthub_sidebar['sidebar_class']) : ?>
            <div id="pxl-sidebar-area" class="<?php echo esc_attr($brighthub_sidebar['sidebar_class']) ?>">
                <div class="pxl-sidebar-sticky">
                    <?php get_sidebar(); ?>
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php get_footer();
