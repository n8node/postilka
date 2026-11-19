<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');
if($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}
$slides_to_scroll = $widget->get_setting('slides_to_scroll');
$arrows = $widget->get_setting('arrows', false);  
$pagination = $widget->get_setting('pagination', false);
$pagination_type = $widget->get_setting('pagination_type', 'bullets');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', 5000);
$infinite = $widget->get_setting('infinite', false);  
$speed = $widget->get_setting('speed', 500);
$drag = $widget->get_setting('drag', false);  
$creativeEffect = $widget->get_setting('creativeEffect', 'normal');  
$style_slide = $widget->get_setting('style_slide', 'normal');
$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
    'slide_mode'                    => 'slide', 
    'slides_to_show'                => (int)$col_xl,
    'slides_to_show_xxl'            => (int)$col_xxl, 
    'slides_to_show_lg'             => (int)$col_lg, 
    'slides_to_show_md'             => (int)$col_md, 
    'slides_to_show_sm'             => (int)$col_sm, 
    'slides_to_show_xs'             => (int)$col_xs, 
    'slides_to_scroll'              => (int)$slides_to_scroll,
    'arrow'                         => (bool)$arrows,
    'pagination'                    => (bool)$pagination,
    'pagination_type'               => $pagination_type,
    'autoplay'                      => (bool)$autoplay,
    'pause_on_hover'                => (bool)$pause_on_hover,
    'pause_on_interaction'          => true,
    'delay'                         => (int)$autoplay_speed,
    'loop'                          => (bool)$infinite,
    'speed'                         => (int)$speed,
    'creativeEffect'                => $creativeEffect,
    'centeredSlides'                => true,
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]); 

$pxl_g_id = uniqid(); 
$settings = $widget->get_settings_for_display();
$image_box_list = isset($settings['image_box_list']) ? $settings['image_box_list'] : [];
?>
<?php if(!empty($image_box_list) && is_array($image_box_list) && count($image_box_list)): 
    $image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full'; ?>
    <div id="pxl-image-box-carousel-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-swiper-slider pxl-image-box--carousel pxl-image-box--carousel-layout-4 pxl-image-box-carousel-<?php echo esc_attr($style_slide); ?>" <?php if($drag !== false) : ?>data-cursor-drag="<?php echo esc_attr__('DRAG', 'brighthub'); ?>"<?php endif; ?>>
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($image_box_list as $key => $value):
                        $image = isset($value['image_l4']) ? $value['image_l4'] : [];
                        $button_icon = isset($value['button_icon_l4']) ? $value['button_icon_l4'] : [];
                        $link = isset($value['link_l4']) ? $value['link_l4'] : [];
                        $sub_title = isset($value['sub_title_l4']) ? $value['sub_title_l4'] : '';
                        $title = isset($value['title_l4']) ? $value['title_l4'] : '';
                        $excerpt = isset($value['excerpt_l4']) ? $value['excerpt_l4'] : '';
                        $pxl_lists_raw = isset($value['pxl_lists']) ? $value['pxl_lists'] : '';
                        // Parse JSON string to array
                        $pxl_lists = [];
                        if (!empty($pxl_lists_raw)) {
                            if (is_string($pxl_lists_raw)) {
                                $pxl_lists = json_decode($pxl_lists_raw, true);
                                if (json_last_error() !== JSON_ERROR_NONE) {
                                    $pxl_lists = [];
                                }
                            } elseif (is_array($pxl_lists_raw)) {
                                $pxl_lists = $pxl_lists_raw;
                            }
                        }
                        // Get default icon from widget settings
                        $pxl_lists_icon = $widget->get_setting('pxl_lists_icon', []);
                        ?>
                        <div class="pxl-swiper-slider__item">
                            <div class="pxl-swiper-slider__item-inner"> 
                        <div class="pxl-image-box__image">
                        <?php 
                            $img_id = !empty($image['id']) ? $image['id'] : 0;
                            if ( ! empty( $img_id ) ) {
                                $img  = pxl_get_image_by_size( array(
                                    'attach_id'  => $img_id,
                                    'thumb_size' => $image_size,
                                    'class' => ''
                                ) );
                                $thumbnail = isset($img['thumbnail']) ? $img['thumbnail'] : '';
                                echo wp_kses_post($thumbnail);
                            }
                        ?>
                        <?php if(!empty($button_icon)) : ?>
                        <div class="pxl-image-box__button">
                            <?php \Elementor\Icons_Manager::render_icon( $button_icon, [ 'aria-hidden' => 'true' ] ); ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    <div class="pxl-image-box__content">
                        <?php if(!empty($sub_title)) : ?>
                        <div class="pxl-image-box__content-sub-title"><?php echo esc_html($sub_title); ?></div>
                        <?php endif; ?>
                        <?php if(!empty($title)) : ?>
                        <div class="pxl-image-box__content-title"><?php echo esc_html($title); ?></div>
                        <?php endif; ?>
                        <?php if(!empty($excerpt)) : ?>
                        <div class="pxl-image-box__content-excerpt"><?php echo esc_html($excerpt); ?></div>
                        <?php endif; ?>
                        <?php if(!empty($pxl_lists) && is_array($pxl_lists)) : ?>
                        <div class="pxl-image-box__content-feature-list">
                            <?php foreach ($pxl_lists as $list_item) : 
                                $item_content = isset($list_item['content']) ? $list_item['content'] : '';
                                $item_icon = isset($list_item['icon']) && !empty($list_item['icon']) ? $list_item['icon'] : null;
                                
                                // Skip if no content
                                if(empty($item_content)) continue;
                            ?>
                                <div class="pxl-image-box__content-feature-item">
                                    <?php 
                                    // If item has icon (class string), render as HTML
                                    if (!empty($item_icon) && is_string($item_icon)) : 
                                    ?>
                                        <i class="<?php echo esc_attr($item_icon); ?>" aria-hidden="true"></i>
                                    <?php 
                                    // If no item icon, use default icon from widget settings (Elementor format)
                                    elseif (!empty($pxl_lists_icon)) : 
                                    ?>
                                        <?php \Elementor\Icons_Manager::render_icon( $pxl_lists_icon, [ 'aria-hidden' => 'true' ] ); ?>
                                    <?php endif; ?>
                                    <span><?php echo esc_html($item_content); ?></span>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    <?php if(!empty($link['url'])) : ?>
                        <a href="<?php echo esc_url($link['url']); ?>" 
                           class="pxl-image-box__link-item"
                           <?php if(!empty($link['is_external'])) : ?>target="_blank"<?php endif; ?>
                           <?php if(!empty($link['nofollow'])) : ?>rel="nofollow"<?php endif; ?>></a>
                    <?php endif; ?>
                        </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <?php if($pagination !== false): ?>
                <div class="pxl-swiper-dots style-1"></div>
            <?php endif; ?>

            <?php if($arrows !== false): ?>
                <div class="pxl-swiper__nav pxl-swiper__nav-style-1">
                    <div class="pxl-swiper__nav-item pxl-swiper__nav-prev">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M7.17773 13.5527L2.62524 9.00023L7.17774 4.44774" stroke="#717680" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M15.375 9L2.7525 9" stroke="#717680" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="pxl-swiper__nav-item pxl-swiper__nav-next">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M10.8223 4.44727L15.3748 8.99977L10.8223 13.5523" stroke="#717680" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M2.625 9H15.2475" stroke="#717680" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            <?php endif; ?>
            
        </div>
    </div>
<?php endif; ?>
