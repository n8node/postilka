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

if ( ! empty( $settings['wg_btn_link']['url'] ) ) {
    $widget->add_render_attribute( 'button', 'href', $settings['wg_btn_link']['url'] );

    if ( $settings['wg_btn_link']['is_external'] ) {
        $widget->add_render_attribute( 'button', 'target', '_blank' );
    }

    if ( $settings['wg_btn_link']['nofollow'] ) {
        $widget->add_render_attribute( 'button', 'rel', 'nofollow' );
    }
} 
$pxl_g_id = uniqid(); ?>
<?php if(isset($settings['imgs']) && !empty($settings['imgs']) && count($settings['imgs'])): 
    $image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full'; ?>
    <div id="pxl-image-carousel-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-swiper-slider pxl-image-carousel pxl-image-carousel1 pxl-image-carousel-<?php echo esc_attr($style_slide); ?> pxl-image-carousel--<?php echo esc_attr($creativeEffect); ?>" <?php if($drag !== false) : ?>data-cursor-drag="<?php echo esc_attr__('DRAG', 'brighthub'); ?>"<?php endif; ?>>
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['imgs'] as $key => $value):
                        $image = isset($value['image']) ? $value['image'] : '';
                        $link_key = $widget->get_repeater_setting_key( 'item_link', 'value', $key );
                        if ( ! empty( $value['item_link']['url'] ) ) {
                            $widget->add_render_attribute( $link_key, 'href', $value['item_link']['url'] );

                            if ( $value['item_link']['is_external'] ) {
                                $widget->add_render_attribute( $link_key, 'target', '_blank' );
                            }

                            if ( $value['item_link']['nofollow'] ) {
                                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes = $widget->get_render_attribute_string( $link_key ); ?>

                        <div class="pxl-swiper-slider__item">
                            <div class="pxl-swiper-slider__item-inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                
                                <?php if(!$creativeEffect === 'center_move'): ?>
                                    <div class="pxl-swiper-slider__item-dot">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                <?php endif; ?>
                                <?php if(!empty($image['id'])) { 
                                    $img = pxl_get_image_by_size( array(
                                        'attach_id'  => $image['id'],
                                        'thumb_size' => $image_size,
                                        'class' => '',
                                    ));
                                    $thumbnail = $img['thumbnail'];

                                    $img_url = pxl_get_image_by_size( array(
                                        'attach_id'  => $image['id'],
                                        'thumb_size' => 'full',
                                        'class' => '',
                                    ));
                                    $thumbnail_url = $img_url['url']; ?>

                                    <div class="pxl-image__item">
                                        <?php echo wp_kses_post($thumbnail); ?>

                                        <?php if ( $settings['link_type'] == 'external' && !empty( $value['item_link']['url'] ) ) { ?><a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                                            <?php if ( !empty($settings['pxl_icon']['value']) ) : ?>
                                                <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                                            <?php endif; ?>
                                        </a><?php } ?>

                                        <?php if ( $settings['link_type'] == 'media-popup' ) { ?>
                                            <a data-elementor-lightbox-slideshow="pxl-image-carousel-<?php echo esc_attr($pxl_g_id); ?>" href="<?php echo esc_url($thumbnail_url); ?>">
                                                <?php if ( !empty($settings['pxl_icon']['value']) ) : ?>
                                                    <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                                                <?php endif; ?>
                                            </a>
                                        <?php } ?>

                                    </div>
                                <?php } ?>
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
