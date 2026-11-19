<?php
/**
 * @package Case-Themes
 */
$archive_readmore_text = brighthub()->get_theme_opt('archive_readmore_text', esc_html__('Read More', 'brighthub'));
$featured_img_size = brighthub()->get_theme_opt('featured_img_size', '960x460');
?>
<article id="post-<?php the_ID(); ?>" <?php post_class('pxl---post pxl-item--archive pxl-item--standard'); ?>>
    <?php if (has_post_thumbnail()) {
        $img  = pxl_get_image_by_size( array(
            'attach_id'  => get_post_thumbnail_id($post->ID),
            'thumb_size' => $featured_img_size,
        ) );
        $thumbnail    = $img['thumbnail'];
        echo '<div class="pxl-image__item">'; ?>
            <a href="<?php echo esc_url( get_permalink()); ?>"><?php echo pxl_print_html($thumbnail); ?></a>
        <?php echo '</div>';
    } ?>
    <div class="pxl-item--holder">
        <h2 class="pxl-item--title">
            <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                <?php if(is_sticky()) { ?>
                    <i class="caseicon-check-mark"></i>
                <?php } ?>
                <?php the_title(); ?>
            </a>
        </h2>
        <?php brighthub()->blog->get_archive_meta(); ?>
        <div class="pxl-item--excerpt">
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
        <div class="pxl-item--readmore">
            <a class="btn btn-text-parallax btn-icon-box" href="<?php echo esc_url( get_permalink()); ?>">
                <span class="pxl--btn-text"><?php echo brighthub_html($archive_readmore_text); ?></span>
                <span class="pxl--btn-icon"><i class="flaticon-up-right-arrow"></i></span>
            </a>
        </div>
    </div>
</article>