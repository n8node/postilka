<?php
/**
 * @package Case-Themes
 */

if(is_active_sidebar('sidebar-career')){
    $sidebar_career = true;
}else{
    $sidebar_career = false;
}
get_header(); ?>
<div class="container">
    <div class="row">
        <div id="pxl-content-area" class="<?php if($sidebar_career){ echo esc_attr('col-xl-8 col-lg-8 col-md-12 col-sm-12 col-12'); } else { echo 'col-xl-12 col-lg-12 col-md-12 col-sm-12 col-12'; } ?>">
            <main id="pxl-content-main">
                <?php while ( have_posts() ) {
                    the_post(); ?>
                    <article id="pxl-post-<?php the_ID(); ?>" <?php post_class(); ?>>
                        <?php the_content();
                        wp_link_pages( array(
                            'before'      => '<div class="page-links">',
                            'after'       => '</div>',
                            'link_before' => '<span>',
                            'link_after'  => '</span>',
                        ) ); ?>
                    </article><!-- #post -->
                    <?php if ( comments_open() || get_comments_number() ) {
                        comments_template();
                    }
                } ?>
            </main>
        </div>
        <?php if($sidebar_career){ ?>
            <div id="pxl-sidebar-area" class="pxl-sidebar-area pxl-sidebar-career col-xl-4 col-lg-4 col-md-12 col-sm-12 col-12">
                <div class="pxl-sidebar-sticky">
                    <?php dynamic_sidebar( 'sidebar-career' ); ?>
                </div>
            </div>
        <?php } ?>
    </div>
</div>
<?php get_footer();
