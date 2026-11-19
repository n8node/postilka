<?php

if (!class_exists('BrightHub_Blog')) {

    class BrightHub_Blog
    {
        
        public function get_archive_meta() {
            $archive_date = brighthub()->get_theme_opt( 'archive_date', true );
            $archive_category = brighthub()->get_theme_opt( 'archive_category', true ); 
            $cat_terms = get_the_terms( get_the_ID(), 'category' );
            if($archive_category || $archive_date) : ?>
                <div class="pxl-pmeta">
                    <?php if($archive_date) : ?>
                        <div class="pxl-pmeta__item pxl-pmeta__date">
                            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/clock.png'); ?>" alt="clock" loading="lazy"><?php echo get_the_date('M d'); ?>,<?php echo get_the_date('Y'); ?>
                        </div>
                    <?php endif; ?>
                    <?php if ($archive_category) : ?>
                        <div class="pxl-pmeta__item pxl-pmeta__cat">
                            <?php
                            $cat_terms = get_the_terms(get_the_ID(), 'category');
                            if (!empty($cat_terms) && !is_wp_error($cat_terms)) {
                                foreach ($cat_terms as $term) {
                                    $term_link = get_term_link($term);
                                    if (!is_wp_error($term_link)) {
                                        echo '<a href="' . esc_url($term_link) . '" class="pxl-category-link">';
                                            dp_catimg($term);
                                            echo '<span class="category-name">' . esc_html($term->name) . '</span>';
                                        echo '</a>';
                                    }
                                }
                            }
                            ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endif; 
        }

        public function pxl_get_post_meta($show_categories = true, $show_date = true, $show_author = true, $post_id = null){
            $post_category = brighthub()->get_theme_opt( 'post_category', true );
            $post_date = brighthub()->get_theme_opt( 'post_date', true );
            $post_author = brighthub()->get_theme_opt( 'post_author', true );
        
            $post_id = $post_id ? $post_id : get_the_ID();
            $author_id = get_post_field( 'post_author', $post_id );
            $author_name = get_the_author_meta( 'display_name', $author_id );
        
            if($post_category || $post_date || $post_author) : ?>
                <div class="pxl-pmeta">
                    <?php if ($post_category && $show_categories) : ?>
                        <div class="pxl-pmeta__item pxl-pmeta__cat">
                            <?php
                            $cat_terms = get_the_terms( $post_id, 'category' );
                            if (!empty($cat_terms) && !is_wp_error($cat_terms)) {
                                foreach ($cat_terms as $term) {
                                    $term_link = get_term_link($term);
                                    if (!is_wp_error($term_link)) {
                                        echo '<a href="' . esc_url($term_link) . '" class="pxl-category-link">';
                                            dp_catimg($term->term_id);
                                            echo '<span class="category-name">' . esc_html($term->name) . '</span>';
                                        echo '</a>';
                                    }
                                }
                            }
                            ?>
                        </div>
                    <?php endif; ?>
        
                    <?php if($post_date && $show_date) : ?>
                        <div class="pxl-pmeta__item pxl-pmeta__date">
                            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/clock.png'); ?> " alt="clock" loading="lazy"> <?php echo get_the_date('M d', $post_id); ?>,<?php echo get_the_date('Y', $post_id); ?>
                        </div>
                    <?php endif; ?>
        
                    <?php if($post_author && $show_author && $author_id ) : ?>
                        <div class="pxl-pmeta__item pxl-pmeta__author">
                            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/pen.png'); ?> " alt="pen" loading="lazy"> <?php echo esc_html__('By ', 'brighthub'); echo esc_html($author_name); ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endif;
        }
        
        public function pxl_get_author( $avatar_size = 48, $show_time = true, $post_id = null ) {
            $post_id = $post_id ? $post_id : get_the_ID();
            $post_author = brighthub()->get_theme_opt( 'post_author', false );
            $post_time_read = brighthub()->get_page_opt( 'post_time_read', null, $post_id );
        
            if ( ! $post_id || ! $post_author ) {
                return '';
            }
        
            $time_show = '';
            if ( $post_time_read !== null && $show_time === true ) {
                if ( $post_time_read < 60 ) {
                    $time_show = sprintf( '%d min read', $post_time_read );
                } else {
                    $time_h = floor( $post_time_read / 60 );  
                    $time_m = $post_time_read % 60; 
                    $time_show = sprintf( '%d hour %d min read', $time_h, $time_m );
                }
            }
        
            $author_id = get_post_field( 'post_author', $post_id );
            if ( ! $author_id ) {
                return '';
            }
        
            $author_avatar = get_avatar( $author_id, $avatar_size );
            $author_name = get_the_author_meta( 'display_name', $author_id );
            ?>
            <div class="pxl-post__author">
                <div class="pxl-post__author-avatar"><?php echo wp_kses_post($author_avatar); ?></div>
                <div class="pxl-post__author-name"><?php echo esc_html__('Author: ', 'brighthub') . esc_html($author_name); ?></div>
                <?php if ( $post_time_read !== null && $show_time === true ): ?>
                    <div class="pxl-post__author-time"><?php echo esc_html($time_show); ?></div>
                <?php endif; ?> 
            </div>
            <?php
        }
        
        

        public function get_excerpt(){
            $archive_excerpt_length = brighthub()->get_theme_opt('archive_excerpt_length', '50');
            $brighthub_the_excerpt = get_the_excerpt();
            if(!empty($brighthub_the_excerpt)) {
                echo wp_trim_words( $brighthub_the_excerpt, $archive_excerpt_length, $more = null );
            } else {
                echo wp_kses_post($this->get_excerpt_more( $archive_excerpt_length ));
            }
        }

        public function get_excerpt_more( $post = null ) {
            $archive_excerpt_length = brighthub()->get_theme_opt('archive_excerpt_length', '50');
            $post = get_post( $post );

            if ( empty( $post ) || 0 >= $archive_excerpt_length ) {
                return '';
            }

            if ( post_password_required( $post ) ) {
                return esc_html__( 'Post password required.', 'brighthub' );
            }

            $content = apply_filters( 'the_content', strip_shortcodes( $post->post_content ) );
            $content = str_replace( ']]>', ']]&gt;', $content );

            $excerpt_more = apply_filters( 'brighthub_excerpt_more', '&hellip;' );
            $excerpt      = wp_trim_words( $content, $archive_excerpt_length, $excerpt_more );

            return $excerpt;
        }

        public function get_tagged_in(){
            $tags_list = get_the_tag_list( '<label class="label">'.esc_attr__('Tags: ', 'brighthub'). '</label>', ' ' );
            if ( $tags_list )
            {
                echo '<div class="pxl-tags">';
                printf('%2$s', '', $tags_list);
                echo '</div>';
            }
        }
        
        public function get_lastest_post() {
            $archive_style = brighthub()->get_theme_opt('archive_style', 'listing');
            $post_img_size = $archive_style === 'listing' ? '800x498' : '640x466';
            $args = array(
                'post_type'      => 'post',
                'posts_per_page' => 1,
                'orderby'        => 'date',
                'order'          => 'DESC',
            );
        
            $query = new WP_Query($args);
            $readmore_txt = brighthub()->get_theme_opt('archive_readmore_text', 'Read the Article' );

        
            if ($query->have_posts()) {
                $query->the_post();
                $post_data = array(
                    'ID'      => get_the_ID(),
                    'title'   => get_the_title(),
                    'excerpt' => get_the_excerpt(),
                    'link'    => get_permalink(),
                    'date'    => get_the_date(),
                );
                wp_reset_postdata();
            } ?>
            
            <article id="post-<?php echo esc_attr($post_data['ID']); ?>" class="pxl-posts__item post post-<?php echo esc_attr($post_data['ID']); ?> pxl-post__item-lastest <?php if(!has_post_thumbnail()) : ?> pxl-post__item-no-img <?php endif; ?> pxl-posts__style-<?php echo esc_attr($archive_style === 'listing' ? '2' : '3'); ?>">
                <?php 
                    if ( has_post_thumbnail( $post_data['ID'] ) ) : ?>
                        <?php
                        $img = pxl_get_image_by_size( array(
                            'attach_id'  => get_post_thumbnail_id( $post_data['ID'] ),
                            'thumb_size' => $post_img_size,
                        ));
                        $thumbnail = $img['thumbnail'];
                        ?>
                        <div class="pxl-posts__item-img">
                            <a href="#" class="pxl-posts__item-editor">
                                <img src="<?php echo esc_url( get_template_directory_uri(). '/assets/img/sparkles.png' ); ?>" alt="<?php esc_attr_e('sparkle', 'brighthub'); ?>" loading="lazy" />
                                <?php echo esc_html__( 'Editor’s Pick', 'brighthub' ); ?>
                            </a>
                            <?php if ( $archive_style === 'grid' ) : ?>
                                <a class="pxl-post__link" href="<?php echo esc_url( $post_data['link'] ); ?>">
                            <?php endif; ?>
                                <?php echo wp_kses_post( $thumbnail ); ?>
                            <?php if ( $archive_style === 'grid' ) : ?>
                                </a>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    <div class="pxl-posts__item-cont">
                        <?php $this->pxl_get_post_meta( true, true, $archive_style === 'grid' ? false : true, $post_data['ID']); ?>
                        <h3 class="pxl-posts__item-tit">
                            <a href="<?php echo esc_url($post_data['link']); ?>">
                                <?php echo esc_html($post_data['title']); ?>
                            </a>
                        </h3>
                        <div class="pxl-posts__item-exc">
                            <?php echo esc_html($post_data['excerpt']); ?>
                        </div>
                        <?php if($archive_style === 'grid') :
                            $this->pxl_get_author(48, true, $post_data['ID']); ?>
                            <a class="pxl-post__item-gts" href="<?php echo esc_url($post_data['link']); ?>">
                                <?php echo esc_html($readmore_txt); ?>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </a>
                        <?php endif; ?>
                    </div>
            </article>
        
        <?php }
        

        public function get_socials_share() { 
            $img_url = '';
            if (has_post_thumbnail(get_the_ID()) && wp_get_attachment_image_src(get_post_thumbnail_id(get_the_ID()), false)) {
                $img_url = wp_get_attachment_image_src(get_post_thumbnail_id(get_the_ID()), false);
            }
            $social_facebook = brighthub()->get_theme_opt( 'social_facebook', true );
            $social_x = brighthub()->get_theme_opt( 'social_x', true );
            $social_pinterest = brighthub()->get_theme_opt( 'social_pinterest', true );
            $social_linkedin = brighthub()->get_theme_opt( 'social_linkedin', true );
            $img_src = is_array($img_url) && !empty($img_url[0]) ? esc_url($img_url[0]) : '';
            ?>
            <div class="pxl-social">
                <?php if($social_facebook) : ?>
                    <a class="pxl-social__item pxl-social__item-fb" title="<?php echo esc_attr__('Facebook', 'brighthub'); ?>" target="_blank" href="http://www.facebook.com/sharer/sharer.php?u=<?php the_permalink(); ?>">
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12" fill="none">
                            <path d="M4.92971 12V6.52664H6.76615L7.04167 4.39294H4.92971V3.03088C4.92971 2.41332 5.10049 1.99246 5.98708 1.99246L7.116 1.99199V0.083538C6.92077 0.0581672 6.25061 0 5.47061 0C3.84186 0 2.72678 0.994179 2.72678 2.81956V4.39294H0.884766V6.52664H2.72678V12H4.92971Z" fill="#181D27"/>
                        </svg>
                    </a>
                <?php endif; ?>
                <?php if($social_x) : ?>
                    <a class="pxl-social__item pxl-social__item-x" title="<?php echo esc_attr__('X', 'brighthub'); ?>" target="_blank" href="https://twitter.com/intent/tweet?url=<?php the_permalink(); ?>&text=<?php the_title(); ?>%20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <g clip-path="url(#clip0_2237_7596)">
                            <path d="M7.11697 5.08118L11.4882 0H10.4523L6.65683 4.41192L3.62535 0H0.128906L4.71309 6.6716L0.128906 12H1.1648L5.17297 7.34086L8.37443 12H11.8709L7.11672 5.08118H7.11697ZM5.69817 6.73038L5.2337 6.06604L1.53805 0.779804H3.12913L6.11156 5.04596L6.57603 5.71031L10.4528 11.2557H8.86176L5.69817 6.73063V6.73038Z" fill="#181D27"/>
                            </g>
                            <defs>
                            <clipPath id="clip0_2237_7596">
                            <rect width="12" height="12" fill="white"/>
                            </clipPath>
                            </defs>
                        </svg>
                    </a>
                <?php endif; ?>
                <?php if($social_pinterest && $img_src) : ?>
                    <a class="pxl-social__item pxl-social__item-pin" title="<?php echo esc_attr__('Pinterest', 'brighthub'); ?>" target="_blank"
                    href="http://pinterest.com/pin/create/button/?url=<?php the_permalink(); ?>&media=<?php echo $img_src; ?>&description=<?php the_title(); ?>%20">
                        <i class="caseicon-pinterest"></i>
                    </a>
                <?php endif; ?>
                <?php if($social_linkedin) : ?>
                    <a class="pxl-social__item pxl-social__item-in" title="<?php echo esc_attr__('LinkedIn', 'brighthub'); ?>" target="_blank" href="http://www.linkedin.com/shareArticle?mini=true&url=<?php the_permalink(); ?>&title=<?php the_title(); ?>%20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <g clip-path="url(#clip0_2237_7599)">
                            <path d="M10.3636 0H1.63636C1.20237 0 0.786158 0.172402 0.47928 0.47928C0.172402 0.786158 0 1.20237 0 1.63636L0 10.3636C0 10.7976 0.172402 11.2138 0.47928 11.5207C0.786158 11.8276 1.20237 12 1.63636 12H10.3636C10.7976 12 11.2138 11.8276 11.5207 11.5207C11.8276 11.2138 12 10.7976 12 10.3636V1.63636C12 1.20237 11.8276 0.786158 11.5207 0.47928C11.2138 0.172402 10.7976 0 10.3636 0ZM4.09091 9.49636C4.091 9.52964 4.08452 9.56261 4.07185 9.59337C4.05918 9.62414 4.04056 9.65211 4.01706 9.67567C3.99356 9.69923 3.96565 9.71793 3.93491 9.73068C3.90418 9.74343 3.87123 9.75 3.83795 9.75H2.76C2.72667 9.75009 2.69364 9.74359 2.66283 9.73088C2.63202 9.71816 2.60402 9.69948 2.58045 9.67591C2.55688 9.65234 2.5382 9.62435 2.52549 9.59353C2.51277 9.56272 2.50627 9.5297 2.50636 9.49636V4.97727C2.50636 4.91 2.53309 4.84549 2.58065 4.79792C2.62822 4.75036 2.69273 4.72364 2.76 4.72364H3.83795C3.90511 4.72382 3.96944 4.75062 4.01686 4.79817C4.06428 4.84571 4.09091 4.91012 4.09091 4.97727V9.49636ZM3.29864 4.29545C3.09636 4.29545 2.89863 4.23547 2.73044 4.12309C2.56225 4.01072 2.43117 3.85099 2.35376 3.66411C2.27635 3.47723 2.2561 3.27159 2.29556 3.0732C2.33502 2.87481 2.43243 2.69258 2.57546 2.54955C2.71849 2.40652 2.90072 2.30911 3.09911 2.26965C3.2975 2.23019 3.50314 2.25044 3.69002 2.32785C3.8769 2.40526 4.03662 2.53634 4.149 2.70453C4.26138 2.87272 4.32136 3.07045 4.32136 3.27273C4.32136 3.54397 4.21361 3.80411 4.02181 3.9959C3.83002 4.1877 3.56988 4.29545 3.29864 4.29545ZM9.72545 9.51409C9.72554 9.54474 9.71957 9.5751 9.70789 9.60343C9.6962 9.63176 9.67903 9.65751 9.65736 9.67918C9.63569 9.70085 9.60995 9.71802 9.58161 9.72971C9.55328 9.74139 9.52292 9.74736 9.49227 9.74727H8.33318C8.30254 9.74736 8.27217 9.74139 8.24384 9.72971C8.21551 9.71802 8.18977 9.70085 8.1681 9.67918C8.14643 9.65751 8.12925 9.63176 8.11757 9.60343C8.10588 9.5751 8.09991 9.54474 8.1 9.51409V7.39705C8.1 7.08068 8.19273 6.01159 7.27295 6.01159C6.56045 6.01159 6.41523 6.74318 6.38659 7.07182V9.51682C6.3866 9.57808 6.3625 9.63688 6.3195 9.68051C6.27651 9.72414 6.21807 9.7491 6.15682 9.75H5.03727C5.00668 9.75 4.97639 9.74396 4.94814 9.73224C4.91989 9.72051 4.89423 9.70332 4.87263 9.68166C4.85103 9.66 4.83392 9.63429 4.82227 9.606C4.81063 9.57771 4.80468 9.54741 4.80477 9.51682V4.9575C4.80468 4.92691 4.81063 4.8966 4.82227 4.86832C4.83392 4.84003 4.85103 4.81432 4.87263 4.79266C4.89423 4.77099 4.91989 4.75381 4.94814 4.74208C4.97639 4.73035 5.00668 4.72432 5.03727 4.72432H6.15682C6.21866 4.72432 6.27797 4.74889 6.3217 4.79262C6.36543 4.83635 6.39 4.89566 6.39 4.9575V5.35159C6.65455 4.95409 7.04659 4.64864 7.88318 4.64864C9.73636 4.64864 9.72409 6.37909 9.72409 7.32955L9.72545 9.51409Z" fill="#181D27"/>
                            </g>
                            <defs>
                            <clipPath id="clip0_2237_7599">
                            <rect width="12" height="12" fill="white"/>
                            </clipPath>
                            </defs>
                        </svg>
                    </a>
                <?php endif; ?>
            </div>
            <?php
        }

        public function get_post_nav($show_prev = true, $show_next = true) {
            global $post;
            $previous = ( is_attachment() ) ? get_post( $post->post_parent ) : get_adjacent_post( false, '', true );
            $next     = get_adjacent_post( false, '', false );

            if ( ! $next && ! $previous )
                return;
            ?>
            <?php
            $next_post = get_next_post();
            $previous_post = get_previous_post();

            if( !empty($next_post) || !empty($previous_post) ) { 
                $page_for_posts = get_option( 'page_for_posts' );
                ?>
                <div class="pxl-navigation">
                    <?php if ( is_a( $previous_post , 'WP_Post' ) && get_the_title( $previous_post->ID ) != '' && $show_prev === true) { ?>
                        <div class="pxl-navigation__col pxl-navigation__prev">
                            <a  href="<?php echo esc_url(get_permalink( $previous_post->ID )); ?>">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M6.37891 12.0469L2.33224 8.00021L6.37891 3.95354" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M13.668 8L2.44797 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <?php echo esc_html__('Previous Post','brighthub'); ?>
                            </a>
                        </div>
                    <?php } ?>
                    <?php if ( is_a( $next_post , 'WP_Post' ) && get_the_title( $next_post->ID ) != '' && $show_next === true) { ?>
                        <div class="pxl-navigation__col pxl-navigation__next">
                            <a  href="<?php echo esc_url(get_permalink( $next_post->ID )); ?>">
                                <?php echo esc_html__('Next Post','brighthub'); ?>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M9.62109 3.95312L13.6678 7.99979L9.62109 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2.33203 8L13.552 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </a>
                        </div>
                    <?php } ?>
                </div>
            <?php }
        }

        public function get_post_author_info() { ?>
            <div class="pxl-post--author-info pxl-item--flexnw">
                <div class="pxl-post--author-image"><?php echo get_avatar( get_the_author_meta( 'ID' ), 280 ); ?></div>
                <div class="pxl-post--author-meta">
                    <?php brighthub_get_user_name(); ?>
                    <div class="pxl-post--author-description"><?php the_author_meta( 'description' ); ?></div>
                    <?php brighthub_get_user_social(); ?>
                </div>
            </div>
        <?php }

        public function get_related_post(){
            $post_related_on = brighthub()->get_theme_opt( 'post_related_on', false );

            if($post_related_on) {
                global $post;
                $current_id = $post->ID;
                $posttags = get_the_category($post->ID);
                if (empty($posttags)) return;

                $tags = array();

                foreach ($posttags as $tag) {

                    $tags[] = $tag->term_id;
                }
                $post_number = '6';
                $query_similar = new WP_Query(array('posts_per_page' => $post_number, 'post_type' => 'post', 'post_status' => 'publish', 'category__in' => $tags));
                if (count($query_similar->posts) > 1) {
                    wp_enqueue_script( 'swiper' );
                    wp_enqueue_script( 'pxl-swiper' );
                    $opts = [
                        'slide_direction'               => 'horizontal',
                        'slide_percolumn'               => '1', 
                        'slide_mode'                    => 'slide', 
                        'slides_to_show'                => 3, 
                        'slides_to_show_lg'             => 3, 
                        'slides_to_show_md'             => 2, 
                        'slides_to_show_sm'             => 2, 
                        'slides_to_show_xs'             => 1, 
                        'slides_to_scroll'              => 1, 
                        'slides_gutter'                 => 30, 
                        'arrow'                         => false,
                        'dots'                          => true,
                        'dots_style'                    => 'bullets'
                    ];
                    $data_settings = wp_json_encode($opts);
                    $dir           = is_rtl() ? 'rtl' : 'ltr';
                    ?>
                    <div class="pxl-related-post">
                        <h4 class="widget-title"><?php echo esc_html__('Related Posts', 'brighthub'); ?></h4>
                        <div class="class" data-settings="<?php echo esc_attr($data_settings) ?>" data-rtl="<?php echo esc_attr($dir) ?>">
                            <div class="pxl-related-post-inner pxl-swiper-slider__wrapper swiper-wrapper">
                            <?php foreach ($query_similar->posts as $post):
                                $thumbnail_url = '';
                                if (has_post_thumbnail(get_the_ID()) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)) :
                                    $thumbnail_url = wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), 'pxl-blog-small', false);
                                endif;
                                if ($post->ID !== $current_id) : ?>
                                    <div class="pxl-swiper-slider__item swiper-slide grid-item">
                                        <div class="pxl-grid__item-inner">
                                            <?php if (has_post_thumbnail()) { ?>
                                                <div class="item-featured">
                                                    <a href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($thumbnail_url[0]); ?>" /></a>
                                                </div>
                                            <?php } ?>
                                            <h3 class="item-title">
                                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                                            </h3>
                                        </div>
                                    </div>
                                <?php endif;
                            endforeach; ?>
                            </div>
                        </div>
                    </div>
                <?php }
            }

            wp_reset_postdata();
        }
    }
}
