<?php 
 
if(!function_exists('brighthub_get_post_grid')){
    function brighthub_get_post_grid($posts = [], $settings = []){ 
        if (empty($posts) || !is_array($posts) || empty($settings) || !is_array($settings)) {
            return false;
        }
        switch ($settings['layout']) {
            case 'post-1':
                brighthub_get_post_grid_layout1($posts, $settings);
                break;
            
            case 'post-2':
                brighthub_get_post_grid_layout2($posts, $settings);
                break;

            case 'post-3':
                brighthub_get_post_grid_layout3($posts, $settings);
                break;

            case 'career-1':
                brighthub_get_career_grid_layout1($posts, $settings);
                break; 
                
            case 'template-1':
                brighthub_get_template_grid_layout1($posts, $settings);
                break;

            case 'b2b-1':
                brighthub_get_b2b_grid_layout1($posts, $settings);
                break;

            default:
                return false;
                break;
        }
    }
}

//--------------------------------------------------
// Start Post Grid

function brighthub_get_post_grid_layout1($posts = [], $settings = []){ 
    extract($settings);
    // Set default values for display settings
    $show_date = isset($show_date) ? $show_date : 'true';
    $images_size = !empty($img_size) ? $img_size : '80x80';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
                
                $img_size_m = $grid_masonry[$key]['img_size_m'];
                if(!empty($img_size_m)) {
                    $images_size = $img_size_m;
                }
            } elseif (!empty($img_size)) {
                $images_size = $img_size;
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = ''; 
            $current_user = wp_get_current_user();?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?>" data-wow-duration="1.2s">
                    <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                        $img_id = get_post_thumbnail_id($post->ID);
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $images_size
                        ) );
                        $thumbnail    = $img['thumbnail'];
                        ?>
                    <a class="pxl-grid__item-featured" href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo wp_kses_post($thumbnail); ?></a>
                    <?php endif; ?>
                    <?php if($show_date == 'true'): ?>
                        <div class="pxl-grid__item-date">
                            <img width="14" height="14" src="<?php echo esc_url(get_template_directory_uri().'/assets/img/clock.png'); ?>" alt="clock" loading="lazy"/>
                            <?php echo get_the_date('M d', $post->ID); ?>, <?php echo get_the_date('Y', $post->ID); ?>        
                        </div>
                    <?php endif; ?>
                    <<?php echo esc_attr($title_tag); ?> class="pxl-grid__item-title"><a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a></<?php echo esc_attr($title_tag); ?>>
                </div>
            </div>
        <?php
        endforeach;
    endif;
}
function brighthub_get_post_grid_layout2($posts = [], $settings = []){ 
    extract($settings);
    // Set default values for display settings
    $show_date = isset($show_date) ? $show_date : 'true';
    $show_author = isset($show_author) ? $show_author : 'true';
    $show_category = isset($show_category) ? $show_category : 'true';
    $show_excerpt = isset($show_excerpt) ? $show_excerpt : 'true';
    $show_button = isset($show_button) ? $show_button : 'true';
    $button_text = isset($button_text) && !empty($button_text) ? $button_text : 'Read the Article';
    $num_words = isset($num_words) ? (int)$num_words : 3;
    $images_size = !empty($img_size) ? $img_size : '640x466';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
                
                $img_size_m = $grid_masonry[$key]['img_size_m'];
                if(!empty($img_size_m)) {
                    $images_size = $img_size_m;
                }
            } elseif (!empty($img_size)) {
                $images_size = $img_size;
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = ''; 
            $current_user = wp_get_current_user();?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?> pxl-posts__style-3" data-wow-duration="1.2s">
                    <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                        $img_id = get_post_thumbnail_id($post->ID);
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $images_size
                        ) );
                        $thumbnail    = $img['thumbnail'];
                        ?>
                    <div class="pxl-posts__item-img">
                        <a href="#" class="pxl-posts__item-editor">
                            <img src="<?php echo esc_url(get_template_directory_uri(). '/assets/img/sparkles.png' ) ?>" alt="<?php esc_attr_e('sparkle', 'brighthub'); ?>" loading="lazy" />
                                <?php echo esc_html__('Editor’s Pick', 'brighthub'); ?>
                        </a>
                        <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                            <?php echo wp_kses_post($thumbnail); ?>
                        </a>
                    </div>
                    <?php endif; ?>
                    <div class="pxl-posts__item-cont">
                        <?php if($show_category == 'true'): ?>
                            <?php brighthub()->blog->pxl_get_post_meta(true, true, false, $post->ID); ?>
                        <?php endif; ?>
                        <<?php echo esc_attr($title_tag2); ?> class="pxl-posts__item-tit"><a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a></<?php echo esc_attr($title_tag2); ?>>
                        <?php if($show_excerpt == 'true'): ?>
                            <div class="pxl-posts__item-exc">
                                <?php
                                    $post_excerpt = get_the_excerpt($post->ID);
                                    if(!empty($post_excerpt)) {
                                        echo wp_trim_words($post_excerpt, $num_words, '...');
                                    } else {
                                        $content = apply_filters('the_content', strip_shortcodes($post->post_content));
                                        $content = str_replace(']]>', ']]&gt;', $content);
                                        echo wp_trim_words($content, $num_words, '...');
                                    }
                                ?>
                            </div>
                        <?php endif; ?>
                        <?php if($show_author == 'true'): ?>
                            <?php brighthub()->blog->pxl_get_author(48, true, $post->ID); ?>
                        <?php endif; ?>
                        <?php if($show_button == 'true'): ?>
                            <a class="pxl-post__item-gts" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                <?php echo esc_html($button_text); ?>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php
        endforeach;
    endif;
}

function brighthub_get_post_grid_layout3($posts = [], $settings = []){ 
    extract($settings);
    // Set default values for display settings
    $show_date = isset($show_date) ? $show_date : 'true';
    $show_excerpt = isset($show_excerpt) ? $show_excerpt : 'true';
    $show_button = isset($show_button) ? $show_button : 'true';
    $button_text = isset($button_text) && !empty($button_text) ? $button_text : 'Read the Article';
    $num_words = isset($num_words) ? (int)$num_words : 3;
    $images_size = !empty($img_size) ? $img_size : '500x327';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
                
                $img_size_m = $grid_masonry[$key]['img_size_m'];
                if(!empty($img_size_m)) {
                    $images_size = $img_size_m;
                }
            } elseif (!empty($img_size)) {
                $images_size = $img_size;
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = ''; 
            $current_user = wp_get_current_user();?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?> pxl-posts__item pxl-posts__style-1" data-wow-duration="1.2s">
                    <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                        $img_id = get_post_thumbnail_id($post->ID);
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $images_size
                        ) );
                        $thumbnail    = $img['thumbnail'];
                        ?>
                        <div class="pxl-posts__item-img">
                            <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo wp_kses_post($thumbnail); ?></a>
                        </div>
                    <?php endif; ?>
                    <div class="pxl-posts__item-cnt">
                        <?php if($show_date == 'true'): ?>
                            <?php brighthub()->blog->pxl_get_post_meta(false, true, false, $post->ID); ?>
                        <?php endif; ?>
                        <<?php echo esc_attr($title_tag3); ?> class="pxl-posts__item-tit"><a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a></<?php echo esc_attr($title_tag3); ?>>
                        <?php if($show_excerpt == 'true'): ?>
                            <div class="pxl-posts__item-exc">
                                <?php
                                    $post_excerpt = get_the_excerpt($post->ID);
                                    if(!empty($post_excerpt)) {
                                        echo wp_trim_words($post_excerpt, $num_words, '...');
                                    } else {
                                        $content = apply_filters('the_content', strip_shortcodes($post->post_content));
                                        $content = str_replace(']]>', ']]&gt;', $content);
                                        echo wp_trim_words($content, $num_words, '...');
                                    }
                                ?>
                            </div>
                        <?php endif; ?>
                        <?php if($show_button == 'true'): ?>
                            <a class="pxl-post__item-gts" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                <?php echo esc_html($button_text); ?>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php
        endforeach;
    endif;
}

// End Post Grid
//--------------------------------------------------

//--------------------------------------------------
// Start Career Grid

function brighthub_get_career_grid_layout1($posts = [], $settings = []){ 
    extract($settings);
    $images_size = !empty($img_size) ? $img_size : '400x400';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $location = brighthub()->get_page_opt('career_location','', $post->ID);
            $location_icon = brighthub()->get_page_opt('career_location_icon','',$post->ID);
            $icon_before_title = brighthub()->get_page_opt('career_icon_before_title','',$post->ID);
            $type = brighthub()->get_page_opt('career_type', '', $post->ID);
            $slot = brighthub()->get_page_opt('career_slot', '', $post->ID);
            $salary = brighthub()->get_page_opt('career_salary_loop', '', $post->ID);
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
                
                $img_size_m = $grid_masonry[$key]['img_size_m'];
                if(!empty($img_size_m)) {
                    $images_size = $img_size_m;
                }
            } elseif (!empty($img_size)) {
                $images_size = $img_size;
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = ''; 
            $current_user = wp_get_current_user();?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?>" data-wow-duration="1.2s">
                    <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                        $img_id = get_post_thumbnail_id($post->ID);
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $images_size
                        ) );
                        $thumbnail    = $img['thumbnail'];
                        ?>
                        
                    <?php endif; ?>
                    <div class="pxl-grid__item-left">
                        <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):?>
                            <a class="pxl-grid__item-featured" href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo wp_kses_post($thumbnail); ?></a>
                        <?php endif; ?>
                        <div class="pxl-grid__item-content">
                            <?php if($show_location === 'true' || $show_type === 'true' || $show_slot === 'true'): ?>
                                <div class="pxl-grid__item-meta pxl-cinfo__list">
                                    <?php if($show_location === 'true'): ?>
                                        <div class="pxl-cinfo__item pxl-cinfo__item-loc">
                                        <?php if(!empty($settings['location_title_2'])): ?>
                                                <span>
                                                    <?php echo esc_html($settings['location_title_2']); ?>:
                                                </span>
                                            <?php endif; ?>
                                            <?php 
                                                if ( is_array($location_icon) && isset($location_icon['url']) ) {
                                                    $img_location_url = $location_icon['url'];
                                                } elseif ( is_string($location_icon) ) {
                                                    $img_location_url = $location_icon;
                                                } else {
                                                    $img_location_url = '';
                                                }
                                                if ( !empty($img_location_url) ) {
                                                    $img_location_id = attachment_url_to_postid($img_location_url);
                                                    if ( $img_location_id ) {
                                                        $img_location = pxl_get_image_by_size(array(
                                                            'attach_id'  => $img_location_id,
                                                            'thumb_size' => 'full'
                                                        ));
                                                        echo wp_kses_post($img_location['thumbnail']);
                                                    }
                                                }
                                            ?>
                                            <?php echo esc_html($location); ?>
                                        </div>
                                    <?php endif; ?>
                                    <?php if($show_type === 'true'): ?>
                                        <div class="pxl-cinfo__item pxl-cinfo__item-type">
                                            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/clock.png'); ?>" alt="clock" loading="lazy"/>
                                            <?php echo esc_html($type); ?>
                                        </div>
                                    <?php endif; ?>
                                    <?php if($show_slot === 'true'): ?>
                                        <div class="pxl-cinfo__item pxl-cinfo__item-slot">
                                            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/slot.png'); ?>" alt="slot" loading="lazy">
                                            <?php echo esc_html($slot); ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                            <<?php echo esc_attr($title_tag4); ?> class="pxl-grid__item-title">
                                <?php if(!empty($icon_before_title)): ?>
                                    <div class="pxl-grid__item-icon">
                                        <?php 
                                            if ( is_array($icon_before_title) && isset($icon_before_title['url']) ) {
                                                $img_icon_before_title_url = $icon_before_title['url'];
                                            } elseif ( is_string($icon_before_title) ) {
                                                $img_icon_before_title_url = $icon_before_title;
                                            } else {
                                                $img_icon_before_title_url = '';
                                            }
                                            if ( !empty($img_icon_before_title_url) ) {
                                                $img_icon_before_title_id = attachment_url_to_postid($img_icon_before_title_url);
                                                if ( $img_icon_before_title_id ) {
                                                    $img_icon_before_title = pxl_get_image_by_size(array(
                                                        'attach_id'  => $img_icon_before_title_id,
                                                        'thumb_size' => 'full',
                                                        'class' => 'pxl-grid__item-icon-img'
                                                    ));
                                                    echo wp_kses_post($img_icon_before_title['thumbnail']);
                                                }
                                            }
                                        ?>
                                    </div>
                                <?php endif; ?><a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a>
                            </<?php echo esc_attr($title_tag4); ?>>
                            <?php if($show_excerpt == 'true'): ?>
                                <div class="pxl-grid__item-excerpt">
                                    <?php echo wp_trim_words( $post->post_excerpt, $num_words, $more = null ); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                   
                    <?php if($show_button == 'true') : ?>
                        <div class="pxl-grid__item-right">
                            <div class="pxl-grid__item-price">
                                <img src="<?php echo esc_url(get_template_directory_uri(). '/assets/img/money.png' ) ?>" alt="<?php esc_attr_e('Salary', 'brighthub'); ?>" loading="lazy" />
                                <span class="pxl-grid__item-salary"><?php echo esc_html($salary); ?></span>
                            </div>
                            <a class="pxl-grid__item-button" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                <?php if(!empty($button_text)) {
                                    echo esc_attr($button_text);
                                } else {
                                    echo esc_html__('Apply Now', 'brighthub');
                                } ?>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M12.3116 3C10.2465 3 8.18138 3 6.08633 3C5.78704 3 5.48774 3 5.21838 3C4.35043 3 4.35043 4.41917 5.21838 4.41917H10.5757C8.42081 6.54793 6.29583 8.70754 4.14092 10.8363C3.84163 11.1448 3.51241 11.4533 3.21312 11.7618C2.55467 12.4097 3.57227 13.4587 4.23071 12.7799C6.41555 10.5895 8.63032 8.39903 10.8152 6.17771C11.0845 5.90005 11.3539 5.65324 11.6233 5.37557V10.1267V11.0214C11.6233 11.9161 13 11.9161 13 11.0214C13 8.89265 13 6.73304 13 4.60428C13 4.29577 13 3.98725 13 3.70959C13 3.33937 12.7007 3 12.3116 3Z" fill="#181D27"/>
                                </svg>
                            </a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php
        endforeach;
    endif;
}

// End Career Grid
//--------------------------------------------------

// Start Template Postype Grid
//--------------------------------------------------
function brighthub_get_template_grid_layout1($posts = [], $settings = []){ 
    extract($settings);

    $readmore_text = !empty($settings['button_text']) ? $settings['button_text'] : esc_html('Explore Now', 'brighthub');
    $num_words = !empty($settings['num_words']) ? $settings['num_words'] : 10;
    $show_excerpt = !empty($settings['show_excerpt']) ? $settings['show_excerpt'] : 'true';
    $show_tags = !empty($settings['show_tags']) ? $settings['show_tags'] : 'true';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = '';

            $template_excerpt = get_post_meta($post->ID, 'template_excerpt', true);
            $template_external_link = get_post_meta($post->ID, 'template_external_link', true);
            
            ?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?>" data-wow-duration="1.2s">
                    <?php if($show_tags == 'true'): ?>
                        <div class="pxl-grid__item-tags">
                            <?php the_terms( $post->ID, 'template-tag', '', ' ' ); ?>
                        </div>
                    <?php endif; ?>
                    <<?php echo esc_attr($title_tag_tmp); ?> class="pxl-grid__item-title">
                            <a href="<?php if(!empty($template_external_link)) { echo esc_url($template_external_link); } else { echo esc_url(get_permalink( $post->ID )); } ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a>
                    </<?php echo esc_attr($title_tag_tmp); ?>>
                    <?php if($show_excerpt == 'true'): ?>
                        <div class="pxl-grid__item-excerpt">
                            <?php echo wp_trim_words( $post->post_excerpt, $num_words, $more = null ); ?>
                        </div>
                    <?php endif; ?>
                    <?php if($show_button == 'true') : ?>
                        <a class="pxl-grid__item-button" href="<?php if(!empty($template_external_link)) { echo esc_url($template_external_link); } else { echo esc_url(get_permalink( $post->ID )); } ?>">
                            <?php echo esc_html($readmore_text); ?>
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none">
                                <path d="M9.08398 3.45898L12.6248 6.99982L9.08398 10.5407" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2.70825 7H12.5258" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach;
    endif;
}
// End Template Grid
//-------------------------------------------------


// Start B2B Postype Grid
//--------------------------------------------------
function brighthub_get_b2b_grid_layout1($posts = [], $settings = []){ 
    extract($settings);
    $num_words = !empty($settings['num_words']) ? $settings['num_words'] : 10;
    $show_excerpt = !empty($settings['show_excerpt']) ? $settings['show_excerpt'] : 'true';
    $show_button = !empty($settings['show_button']) ? $settings['show_button'] : 'true';
    $show_price = !empty($settings['show_price']) ? $settings['show_price'] : 'true';
    $show_badge = !empty($settings['show_badge']) ? $settings['show_badge'] : 'true';
    $show_category = !empty($settings['show_category']) ? $settings['show_category'] : 'true';
    $img_size = !empty($settings['img_size']) ? $settings['img_size'] : '1000x1000';
    if (is_array($posts)):
        foreach ($posts as $key => $post):
            $item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
            if(isset($grid_masonry) && !empty($grid_masonry[$key]) && (count($grid_masonry) > 1)) {
                if($grid_masonry[$key]['col_xl_m'] == 'col-66') {
                    $col_xl_m = '66-pxl';
                } else {
                    $col_xl_m = 12 / $grid_masonry[$key]['col_xl_m'];
                }
                if($grid_masonry[$key]['col_lg_m'] == 'col-66') {
                    $col_lg_m = '66-pxl';
                } else {
                    $col_lg_m = 12 / $grid_masonry[$key]['col_lg_m'];
                }
                $col_md_m = 12 / $grid_masonry[$key]['col_md_m'];
                $col_sm_m = 12 / $grid_masonry[$key]['col_sm_m'];
                $col_xs_m = 12 / $grid_masonry[$key]['col_xs_m'];
                $item_class = "pxl-grid__item col-xl-{$col_xl_m} col-lg-{$col_lg_m} col-md-{$col_md_m} col-sm-{$col_sm_m} col-{$col_xs_m}";
            }

            if(!empty($tax))
                $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
            else 
                $filter_class = '';

            $b2b_excerpt = get_post_meta($post->ID, 'b2b_excerpt', true);
            $b2b_external_link = get_post_meta($post->ID, 'b2b_external_link', true);
            
            ?>
            <div class="<?php echo esc_attr($item_class . ' ' . $filter_class); ?>">
                <div class="pxl-grid__item-inner <?php echo esc_attr($pxl_animate); ?>" data-wow-duration="1.2s">
                    <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                        $img_id = get_post_thumbnail_id($post->ID);
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $img_size
                        ) );
                        $thumbnail    = $img['thumbnail'];
                        ?>
                    <a class="pxl-grid__item-featured" href="<?php echo !empty($b2b_external_link) ? esc_url($b2b_external_link) : esc_url(get_permalink( $post->ID )); ?>"><?php echo wp_kses_post($thumbnail); ?></a>
                    <?php endif; ?>
                    <div class="pxl-grid__item-content">
                        <?php if($show_category == 'true'): ?>
                            <div class="pxl-grid__item-cats">
                                <?php the_terms( $post->ID, 'b2b-category', '', ' ' ); ?>
                            </div>
                        <?php endif; ?>
                        <<?php echo esc_attr($title_tag5); ?> class="pxl-grid__item-title">
                                <a href="<?php if(!empty($b2b_external_link)) { echo esc_url($b2b_external_link); } else { echo esc_url(get_permalink( $post->ID )); } ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a>
                        </<?php echo esc_attr($title_tag5); ?>>
                        <?php if($show_price == 'true'): ?>
                            <div class="pxl-grid__item-price">
                                <?php echo get_post_meta($post->ID, 'b2b_price', true); ?>
                            </div>
                        <?php endif; ?>
                        <?php if($show_button == 'true') : ?>
                            <a class="pxl-grid__item-button" href="<?php if(!empty($b2b_external_link)) { echo esc_url($b2b_external_link); } else { echo esc_url(get_permalink( $post->ID )); } ?>">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none">
                                    <path d="M9.08398 3.45898L12.6248 6.99982L9.08398 10.5407" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2.70825 7H12.5258" stroke="#181D27" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php endforeach;
    endif;
}
// End B2B Grid
//-------------------------------------------------



// Start Product Grid
//--------------------------------------------------
// End Product Grid
//--------------------------------------------------

add_action( 'wp_ajax_brighthub_load_more_post_grid', 'brighthub_load_more_post_grid' );
add_action( 'wp_ajax_nopriv_brighthub_load_more_post_grid', 'brighthub_load_more_post_grid' );

function brighthub_load_more_post_grid(){
    $wpnonce = isset($_POST['wpnonce']) ? sanitize_text_field(wp_unslash($_POST['wpnonce'])) : '';
    
    if (empty($wpnonce)) {
        wp_send_json(array(
            'status' => false,
            'message' => esc_attr__('Security token missing, please reload.', 'brighthub'),
            'data' => array(),
        ));
        return;
    }
    
    if (!wp_verify_nonce($wpnonce, '_ajax_nonce')) {
        wp_send_json(array(
            'status' => false,
            'message' => esc_attr__('Nonce error, please reload.', 'brighthub'),
            'data' => array(),
        ));
        return;
    }
    
    $method = filter_input(INPUT_SERVER, 'REQUEST_METHOD', FILTER_SANITIZE_STRING);
    $method = strtoupper($method);
    
    $allowed_methods = array('GET', 'POST', 'PUT', 'DELETE', 'OPTIONS');
    
    if (!in_array($method, $allowed_methods, true)) {
        $method = '';
    }

    try{
        if(!isset($_POST['settings'])){
            throw new Exception(__('Something went wrong while requesting. Please try again!', 'brighthub'));
        }

        $settings = isset($_POST['settings']) ? wp_unslash($_POST['settings']) : null;
        if (!is_array($settings)) {
            throw new Exception(__('Invalid settings format.', 'brighthub'));
        }
        
        foreach ($settings as $key => $value) {
            if (is_string($value)) {
                $settings[$key] = sanitize_text_field($value);
            }
        }

        $source = isset($settings['source']) ? $settings['source'] : '';
        $term_slug = isset($settings['term_slug']) ? $settings['term_slug'] : '';
        
        if( !empty($term_slug) && $term_slug !='*'){
            $term_slug = sanitize_title($term_slug);
            $term_slug = str_replace('.', '', $term_slug);
            
            if (isset($settings['tax'][0]) && taxonomy_exists($settings['tax'][0])) {
                $source = [$term_slug.'|'.$settings['tax'][0]];
            } else {
                throw new Exception(__('Invalid taxonomy.', 'brighthub'));
            }
        }
        
        if( isset($_POST['handler_click']) && sanitize_text_field(wp_unslash( $_POST[ 'handler_click' ] )) == 'filter'){
            set_query_var('paged', 1);
            $settings['paged'] = 1;
        }else{
            $paged = isset($settings['paged']) ? absint($settings['paged']) : 1;
            set_query_var('paged', $paged);
            $settings['paged'] = $paged;
        }
        
        $post_type = isset($settings['post_type']) ? sanitize_key($settings['post_type']) : 'post';
        if (!post_type_exists($post_type)) {
            throw new Exception(__('Invalid post type.', 'brighthub'));
        }
        
        $query_args = [
            'source' => $source,
            'orderby' => isset($settings['orderby']) ? sanitize_key($settings['orderby']) : 'date',
            'order' => isset($settings['order']) ? sanitize_key($settings['order']) : 'desc',
            'limit' => isset($settings['limit']) ? min(absint($settings['limit']), 100) : 6, // Giới hạn max 100
            'post_ids' => isset($settings['post_ids']) && is_array($settings['post_ids']) ? 
                         array_map('absint', $settings['post_ids']) : [],
            'post_not_in' => isset($settings['post_not_in']) && is_array($settings['post_not_in']) ? 
                            array_map('absint', $settings['post_not_in']) : [],
        ];
        
        $allowed_orderby = ['date', 'title', 'menu_order', 'rand', 'ID', 'author', 'name', 'modified'];
        if (!in_array($query_args['orderby'], $allowed_orderby)) {
            $query_args['orderby'] = 'date';
        }
        
        if (!in_array(strtolower($query_args['order']), ['asc', 'desc'])) {
            $query_args['order'] = 'desc';
        }
        
        $tax = isset($settings['tax']) && is_array($settings['tax']) ? 
               array_map('sanitize_key', $settings['tax']) : [];
        
        if (!function_exists('pxl_get_posts_of_grid')) {
            throw new Exception(__('Required function not available.', 'brighthub'));
        }
        
        extract(pxl_get_posts_of_grid($post_type, $query_args, $tax));

        ob_start();
            if (function_exists('brighthub_get_post_grid')) {
                brighthub_get_post_grid($posts, $settings);
            } else {
                throw new Exception(__('Template function not available.', 'brighthub'));
            }
        $html = ob_get_clean();

        $pagin_html = '';
        if( isset($settings['pagination_type']) && $settings['pagination_type'] == 'pagination' ){
            ob_start();
                if (function_exists('brighthub') && method_exists(brighthub()->page, 'get_pagination')) {
                    brighthub()->page->get_pagination( $query,  true );
                }
            $pagin_html = ob_get_clean();
        }
        
        wp_send_json(array(
            'status' => true,
            'message' => esc_attr__('Load Successfully!', 'brighthub'),
            'data' => array(
                'html' => $html,
                'pagin_html' => $pagin_html,
                'paged' => $settings['paged'],
                'posts' => isset($posts) ? $posts : [],
                'max' => isset($max) ? absint($max) : 0,
            ),
        ));
    }
    catch (Exception $e){
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('BrightHub AJAX Error: ' . $e->getMessage());
        }
        
        wp_send_json(array(
            'status' => false, 
            'message' => $e->getMessage()
        ));
    }
    
    wp_die();
}


