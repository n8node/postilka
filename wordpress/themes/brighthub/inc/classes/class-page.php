<?php

if (!class_exists('BrightHub_Page')) {

    class BrightHub_Page
    {
        public function get_site_loader(){

            $site_loader = brighthub()->get_theme_opt( 'site_loader', 'off' );
            $site_loader_style = brighthub()->get_theme_opt( 'site_loader_style', 'style-1' );
            $site_loader_icon = brighthub()->get_theme_opt( 'site_loader_icon' );
            if($site_loader == 'on') { ?>
                <div id="pxl-loadding" class="pxl-loader <?php echo esc_attr($site_loader_style); ?>">
                    <?php switch ($site_loader_style) {
                        case 'style-3': ?>
                            <div id="preloader" class="preloader loader-style3">
                                <div class="line"></div>
                                <div class="split top"></div>
                                <div class="split bottom"></div>
                            </div>
                            <?php break;
                        case 'style-2': ?>
                            <div class="loader-circle">
                                <div class="loader-line-mask">
                                    <div class="loader-line"></div>
                                </div>
                                <?php if(!empty($site_loader_icon['url'])) : ?>
                                    <div class="loader-logo"><img src="<?php echo esc_url($site_loader_icon['url']); ?>" /></div>
                                <?php endif; ?>
                            </div>
                            <?php break;
                        default: ?>
                            <div class="pxl-loader-spinner">
                                <div class="pxl-loader-bounce1"></div>
                                <div class="pxl-loader-bounce2"></div>
                                <div class="pxl-loader-bounce3"></div>
                            </div>
                            <?php break;
                    } ?>
                </div>
            <?php }
        }

        public function get_link_pages() {
            wp_link_pages( array(
                'before'      => '<div class="page-links">',
                'after'       => '</div>',
                'link_before' => '<span>',
                'link_after'  => '</span>',
            ) ); 
        }

        public function get_page_title(){
            if(is_404()) return;
            $titles = $this->get_title();
            $pt_mode = brighthub()->get_opt('pt_mode');
            $pt_mode_product = brighthub()->get_opt('pt_mode_product');
            $ptitle_scroll_opacity = brighthub()->get_opt('ptitle_scroll_opacity');
            $ptitle_layout = (int)brighthub()->get_opt('ptitle_layout');
            $ptitle_layout_product = (int)brighthub()->get_opt('ptitle_layout_product');
            $thumbnail_url = get_the_post_thumbnail_url( get_the_ID(), 'full' );
            if ($pt_mode == 'bd' && $ptitle_layout > 0 && class_exists('Pxltheme_Core') && is_callable( 'Elementor\Plugin::instance' )) { ?>
                <div id="pxl-ptit__elementor" class="<?php if($ptitle_scroll_opacity == true) { echo 'pxl-scroll-opacity'; } ?>">
                    <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $ptitle_layout);?>
                </div>
                <?php 
            } elseif ($pt_mode_product == 'bd' && $ptitle_layout_product > 0 && class_exists('Pxltheme_Core') && is_callable( 'Elementor\Plugin::instance' ) ) { ?>
                <?php if(class_exists( 'WooCommerce' ) && is_shop() || class_exists( 'WooCommerce' ) && is_singular('product')) : ?>
                    <div id="pxl-ptit__elementor" class="pxl-ptit-shop <?php if($ptitle_scroll_opacity == true) { echo 'pxl-scroll-opacity'; } ?>">
                        <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $ptitle_layout_product);?>
                    </div>
                <?php endif; ?>
            <?php } elseif($pt_mode == 'df') {
                $ptitle_breadcrumb_on = brighthub()->get_opt( 'ptitle_breadcrumb_on', '1' ); 
                $slogan_before = brighthub()->get_page_opt( 'slogan_before', '' ); 
                $slogan_after = brighthub()->get_page_opt( 'slogan_after', '' ); 
                $title_custom = brighthub()->get_page_opt( 'title_custom', '' ); 
                $desc_page = brighthub()->get_page_opt( 'desc_page', '' ); 
                wp_enqueue_script('stellar-parallax'); 
                if(is_singular('post')){ 
                    ?>
                    <div id="pxl-ptit__default" class="<?php echo sidebar_active('blog') ? 'single-post__has-sidebar' : 'single-post__no-sidebar'; ?>">
                        <div class="container">
                            <?php if(!sidebar_active('blog')){brighthub()->blog->pxl_get_author(48, true);} ?>

                            <?php if(!sidebar_active('blog')){ ?>
                                <h1 class="pxl-ptit__text"><?php echo brighthub_html(!empty($title_custom) ? $title_custom : $titles['title']); ?></h1>
                            <?php } ?>
                            <?php if($desc_page){ ?>
                                <p class="pxl-ptit__desc">
                                    <?php echo esc_html($desc_page); ?>
                                </p>
                            <?php } ?>
                            <?php if(!sidebar_active('blog')){
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
                        </div>
                    </div>
                <?php } 
                elseif(is_singular('career')){ ?>
                    <div id="pxl-ptit__default" class="<?php echo sidebar_active('blog') ? 'single-post__has-sidebar' : 'single-post__no-sidebar'; ?>">
                        <div class="container">
                           
                        </div>
                    </div>
                <?php }
                elseif(is_singular('product')){ 
                    return;
                }
                else { ?>
                    <div id="pxl-ptit__default">
                        <div class="container">
                            <?php if($slogan_before && $slogan_after){ ?>
                                <div class="pxl-ptit__slg">
                                    <span class="pxl-ptit__slg-bef">
                                        <?php echo esc_html($slogan_before); ?>
                                    </span>
                                    <span class="pxl-ptit__slg-aft">
                                        <?php echo esc_html($slogan_after); ?>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </span>
                                </div>
                            <?php } ?>
                            <?php if (class_exists('WooCommerce') && (is_cart() || class_exists('WooCommerce') && is_checkout() )) { ?>
                                <div class="pxl-ptit__breadcrumb">
                                    <a href="<?php echo wc_get_page_permalink('shop'); ?>">
                                        <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6.87891 12.0469L2.83224 8.00021L6.87891 3.95354" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M14.168 8L2.94797 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        <?php echo esc_html__('Back to Shop Page', 'brighthub'); ?>
                                    </a>
                                </div>
                            <?php } ?>
                            <?php if (class_exists('WooCommerce') && (is_shop() || is_product_category() || is_product_tag())) { ?>
                                <div class="pxl-ptit__breadcrumb">
                                    <a href="<?php echo esc_url(home_url()); ?>">
                                        <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6.87891 12.0469L2.83224 8.00021L6.87891 3.95354" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M14.168 8L2.94797 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        <?php echo esc_html__('Back to Home', 'brighthub'); ?>
                                    </a>
                                </div>
                            <?php } ?>
                            <h1 class="pxl-ptit__text"><?php echo brighthub_html(!empty($title_custom) ? $title_custom : $titles['title']); ?></h1>
                            <?php if($desc_page){ ?>
                                <p class="pxl-ptit__desc">
                                    <?php echo esc_html($desc_page); ?>
                                </p>
                            <?php } ?>
                        </div>
                    </div>
                <?php }
                ?>
                
            <?php } 
        } 

        public function get_title() {
            $title = '';
            // Default titles
            if ( ! is_archive() ) {
                // Posts page view
                if ( is_home() ) {
                    // Only available if posts page is set.
                    if ( ! is_front_page() && $page_for_posts = get_option( 'page_for_posts' ) ) {
                        $title = get_post_meta( $page_for_posts, 'custom_title', true );
                        if ( empty( $title ) ) {
                            $title = get_the_title( $page_for_posts );
                        }
                    }
                    if ( is_front_page() ) {
                        $title = esc_html__( 'Blog', 'brighthub' );
                    }
                } // Single page view
                elseif ( is_page() ) {
                    $title = get_post_meta( get_the_ID(), 'custom_title', true );
                    if ( ! $title ) {
                        $title = get_the_title();
                    }
                } elseif ( is_404() ) {
                    $title = esc_html__( '404 Error', 'brighthub' );
                } elseif ( is_search() ) {
                    $title = esc_html__( 'Search results', 'brighthub' );
                } elseif ( is_singular('lp_course') ) {
                    $title = esc_html__( 'Course', 'brighthub' );
                } else {
                    $title = get_post_meta( get_the_ID(), 'custom_title', true );
                    if ( ! $title ) {
                        $title = get_the_title();
                    }
                }
            } else {
                $title = get_the_archive_title();
                if( (class_exists( 'WooCommerce' ) && is_shop()) ) {
                    $title = get_post_meta( wc_get_page_id('shop'), 'custom_title', true );
                    if(!$title) {
                        $title = get_the_title( get_option( 'woocommerce_shop_page_id' ) );
                    }
                }
            }

            return array(
                'title' => $title,
            );
        }

        public function get_breadcrumb(){

            if ( ! class_exists( 'CASE_Breadcrumb' ) )
            {
                return;
            }

            $breadcrumb = new CASE_Breadcrumb();
            $entries = $breadcrumb->get_entries();

            if ( empty( $entries ) )
            {
                return;
            }

            ob_start();

            foreach ( $entries as $entry )
            {
                $entry = wp_parse_args( $entry, array(
                    'label' => '',
                    'url'   => ''
                ) );

                $entry_label = $entry['label'];

                if(!empty($_GET['blog_title'])) {
                    $blog_title = $_GET['blog_title'];
                    $custom_title = explode('_', $blog_title);
                    foreach ($custom_title as $index => $value) {
                        $arr_str_b[$index] = $value;
                    }
                    $str = implode(' ', $arr_str_b);
                    $entry_label = $str;
                }

                if ( empty( $entry_label ) )
                {
                    continue;
                }

                echo '<li>';

                if ( ! empty( $entry['url'] ) )
                {
                    printf(
                        '<a class="breadcrumb-hidden" href="%1$s">%2$s<i class="caseicon-breadcrumb text-gradient3"></i></a>',
                        esc_url( $entry['url'] ),
                        esc_attr( $entry_label )
                    );
                }
                else
                {
                    $sg_post_title = brighthub()->get_theme_opt('sg_post_title', 'default');
                    $sg_post_title_text = brighthub()->get_theme_opt('sg_post_title_text');
                    if(is_singular('post') && $sg_post_title == 'custom_text' && !empty($sg_post_title_text)) {
                        $entry_label = $sg_post_title_text;
                    }
                    $sg_product_ptitle = brighthub()->get_theme_opt('sg_product_ptitle', 'default');
                    $sg_product_ptitle_text = brighthub()->get_theme_opt('sg_product_ptitle_text');
                    if(is_singular('product') && $sg_product_ptitle == 'custom_text' && !empty($sg_product_ptitle_text)) {
                        $entry_label = $sg_product_ptitle_text;
                    }
                    printf( '<span class="breadcrumb-entry" >%s</span>', esc_html( $entry_label ) );
                }

                echo '</li>';
            }

            $output = ob_get_clean();

            if ( $output )
            {
                printf( '<ul class="pxl-breadcrumb">%s</ul>', wp_kses_post($output));
            }
        }

        public function get_pagination( $query = null, $ajax = false ){

            if($ajax){
                add_filter('paginate_links', 'brighthub_ajax_paginate_links');
            }

            $classes = array();

            if ( empty( $query ) )
            {
                $query = $GLOBALS['wp_query'];
            }

            if ( empty( $query->max_num_pages ) || ! is_numeric( $query->max_num_pages ) || $query->max_num_pages < 2 )
            {
                return;
            }

            $paged = $query->get( 'paged', '' );

            if ( ! $paged && is_front_page() && ! is_home() )
            {
                $paged = $query->get( 'page', '' );
            }

            $paged = $paged ? intval( $paged ) : 1;

            $pagenum_link = html_entity_decode( get_pagenum_link() );
            $query_args   = array();
            $url_parts    = explode( '?', $pagenum_link );

            if ( isset( $url_parts[1] ) )
            {
                wp_parse_str( $url_parts[1], $query_args );
            }

            $pagenum_link = remove_query_arg( array_keys( $query_args ), $pagenum_link );
            $pagenum_link = trailingslashit( $pagenum_link ) . '%_%';
            $paginate_links_args = array(
                'base'     => $pagenum_link,
                'total'    => $query->max_num_pages,
                'current'  => $paged,
                'mid_size' => 1,
                'add_args' => array_map( 'urlencode', $query_args ),
                'prev_text' =>  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M6.37992 3.95312L2.33325 7.99979L6.37992 12.0465" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M13.6665 8H2.44653" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>',
                'next_text' =>  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M9.61987 3.95312L13.6665 7.99979L9.61987 12.0465" stroke="#6938EF" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M2.33325 8H13.5533" stroke="#6938EF" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>',
                'before_page_number' => '<span>',
                'after_page_number' => '</span>',
            );
            if($ajax){
                $paginate_links_args['format'] = '?page=%#%';
            }
            $links = paginate_links( $paginate_links_args );
            if ( $links ):
            ?>
            <nav class="pxl-posts__pagination<?php echo esc_attr($ajax?'ajax':''); ?>">
                <?php echo wp_kses_post($links); ?>
            </nav>
            <?php
            endif;
        }
        public function get_loadmore($query = null, $ajax = false, $number = 9) {
            $loadmore_txt = brighthub()->get_page_opt('btn_loadmore_txt','Load More');
            ?>
            <button type="button" class="btn-glossy pxl-posts__loadmore btn btn-primary">
                <?php echo esc_html($loadmore_txt); ?>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M9.92737 3.38823C9.34737 3.2149 8.70737 3.10156 8.0007 3.10156C4.80737 3.10156 2.2207 5.68823 2.2207 8.88156C2.2207 12.0816 4.80737 14.6682 8.0007 14.6682C11.194 14.6682 13.7807 12.0816 13.7807 8.88823C13.7807 7.70156 13.4207 6.5949 12.8074 5.6749" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10.7528 3.54536L8.82617 1.33203" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10.7535 3.54688L8.50684 5.18688" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <?php
        }
    }
}
