<?php
/**
 * @package Case-Themes
 */
$archive_readmore_text = brighthub()->get_theme_opt('archive_readmore_text', esc_html__('Read the Article', 'brighthub'));
$featured_img_size = brighthub()->get_theme_opt('featured_img_size', '575x322');
$brighthub_sidebar = brighthub()->get_sidebar_args(['type' => 'blog', 'content_col'=> '8']);
$archive_style = brighthub()->get_theme_opt('archive_style', 'listing');
?>
<article id="post-<?php the_ID(); ?>" <?php post_class('pxl-posts__item ' . ($archive_style === 'grid' ? 'pxl-posts__style-1' : 'pxl-posts__style-4')); ?>>
    <?php if (has_post_thumbnail()) {
        $img  = pxl_get_image_by_size( array(
            'attach_id'  => get_post_thumbnail_id($post->ID),
            'thumb_size' => $featured_img_size,
        ) );
        $thumbnail    = $img['thumbnail'];
        echo '<div class="pxl-posts__item-img">'; ?>
            <a href="<?php echo esc_url( get_permalink()); ?>"><?php echo pxl_print_html($thumbnail); ?></a>
        <?php echo '</div>';
    } ?>
    <div class="pxl-posts__item-cnt">
        <?php brighthub()->blog->get_archive_meta(); ?>
        <h3 class="pxl-posts__item-tit">
            <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                <?php if(is_sticky()) { ?>
                    <i class="caseicon-check-mark"></i>
                <?php } ?>
                <?php the_title(); ?>
            </a>
        </h3>
        <div class="pxl-posts__item-exc">
            <?php
                brighthub()->blog->get_excerpt();
                wp_link_pages( array(
                    'before'      => '<div class="page-links">',
                    'after'       => '</div>',
                    'link_before' => '<span>',
                    'link_after'  => '</span>',
                ) );
            ?>
        </div>
        <a class="pxl-post__item-gts" href="<?php echo esc_url( get_permalink()); ?>">
            <?php echo brighthub_html($archive_readmore_text); ?>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>
    </div>
</article>