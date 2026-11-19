<?php
/**
 * @package Case-Themes
 */

get_header();

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

$pagi_type = brighthub()->get_theme_opt('pagi_type', 'default');
$archive_title = brighthub()->get_theme_opt('archive_title', '');
$archive_style = brighthub()->get_theme_opt('archive_style', 'listing');
$show_latest_post = brighthub()->get_theme_opt('show_latest_post');
?>
<div class="container">
    <div class="<?php echo esc_attr($brighthub_sidebar['wrap_class']) ?>" >
        <div id="pxl-content-area" class="<?php echo esc_attr($brighthub_sidebar['content_class']) ?>">
            <?php if(is_home() && $show_latest_post){ 
                brighthub()->blog->get_lastest_post();
            } ?>    
            <main id="pxl-content-main" class="pxl-posts <?php echo esc_attr($wp_query->found_posts < 2 ? 'no-posts' : ''); ?> <?php echo esc_attr($brighthub_sidebar['sidebar_class'] ? 'pxl-posts__has-sidebar' : 'pxl-posts__no-sidebar'); ?> pxl-posts--<?php echo esc_attr($archive_style); ?>">
                <?php if(is_home()){ ?>
                    <?php if(!empty($archive_title)){ ?>
                        <div class="pxl-posts__title">
                            <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/img/fire.png'); ?>" loading="lazy" alt="<?php echo esc_attr($archive_title); ?>">
                            <?php echo esc_html($archive_title); ?>
                        </div>
                    <?php } ?>
                <?php } ?>  
                <?php if ( have_posts() ) : ?>
                    <?php
                    $count = 0;

                    while ( have_posts() ) :
                        the_post();
                        $count++;

                        if ( is_home() && $show_latest_post && $count === 1 ) {
                            continue;
                        }

                        if ( $show_latest_post && $count > 10 ) {
                            break;
                        }

                        get_template_part( 'template-parts/content/archive/standard' );
                    endwhile;
                    ?>

                    <?php
                    if ( 'default' === $pagi_type ) {
                        brighthub()->page->get_pagination();
                    } else {
                        brighthub()->page->get_loadmore();
                    }
                    ?>
                <?php else : ?>
                    <?php get_template_part( 'template-parts/content/content', 'none' ); ?>
                <?php endif; ?>

            </main>
        </div>

        <?php if ($brighthub_sidebar['sidebar_class']) : ?>
            <div id="pxl-sidebar-area" class="<?php echo esc_attr($brighthub_sidebar['sidebar_class']) ?>">
                <div class="pxl-sidebar-sticky">
                    <?php get_sidebar($sidebar_type); ?>
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php get_footer(); ?>
