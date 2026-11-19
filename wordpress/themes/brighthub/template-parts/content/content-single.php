<?php
/**
 * Template part for displaying posts in loop
 *
 * @package Case-Themes
 */
$post_tag = brighthub()->get_theme_opt( 'post_tag', true );
$post_navigation = brighthub()->get_theme_opt( 'post_navigation', false );
$post_social_share = brighthub()->get_theme_opt( 'post_social_share', false );
$tags_list = get_the_tag_list();
$sg_post_title = brighthub()->get_theme_opt('sg_post_title', 'default');
$title_custom = brighthub()->get_page_opt( 'title_custom', '' ); 
$titles = brighthub()->page->get_title();
?>
<article id="pxl-post-<?php the_ID(); ?>" <?php post_class('pxl-post'); ?>>
    
    <?php if ( get_option( 'page_for_posts' ) ) : 
        $post_id = get_option( 'page_for_posts' ); ?>
        <div class="pxl-blog-overview">
            <a  href="<?php echo esc_url(get_permalink( $post_id )); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6.37891 12.0469L2.33224 8.00021L6.37891 3.95354" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.668 8L2.44797 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <?php echo esc_html__('Back to Blog Overview','brighthub'); ?>
            </a>
        </div>
    <?php endif; ?>

    <?php if(sidebar_active('blog')) : ?>
        <h1 class="pxl-ptit__text"><?php echo brighthub_html(!empty($title_custom) ? $title_custom : $titles['title']); ?></h1>
    <?php endif; ?>
    <?php if(sidebar_active('blog')){
        $sg_featured_img_size = brighthub()->get_theme_opt('sg_featured_img_size', '1280x717');
        brighthub()->blog->pxl_get_post_meta();
        if (has_post_thumbnail()) {
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => get_post_thumbnail_id(get_the_ID()),
                'thumb_size' => $sg_featured_img_size,
            ) );
            $thumbnail    = $img['thumbnail']; ?>
            <div class="pxl-post__image">
                <?php echo wp_kses_post($thumbnail); ?>
            </div>
        <?php } 
    } ?>
    <div class="pxl-post__content">
        <?php
            the_content();
            wp_link_pages( array(
                'before'      => '<div class="page-links">',
                'after'       => '</div>',
                'link_before' => '<span>',
                'link_after'  => '</span>',
            ) );
        ?>
    </div>
    <?php if($post_tag && $tags_list ) : 
        brighthub()->blog->get_tagged_in();
    endif; ?>   
    <?php if($post_navigation || $post_social_share) :  ?>
        <div class="pxl-post__footer">
            <?php 
                brighthub()->blog->get_post_nav(); 
                brighthub()->blog->get_socials_share();
            ?>
        </div>
    <?php endif; ?>
</article>