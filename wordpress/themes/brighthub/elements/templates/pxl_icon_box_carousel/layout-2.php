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
    'speed'                         => (int)$speed
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);

$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';

if(isset($settings['icon_box_list']) && !empty($settings['icon_box_list']) && count($settings['icon_box_list'])): ?>
    <div class="pxl-swiper-slider pxl-icon-box-carousel pxl-icon-box-carousel--layout-2 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms"  <?php if($drag !== false) : ?>data-cursor-drag="<?php echo esc_attr__('DRAG', 'brighthub'); ?>"<?php endif; ?>>
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['icon_box_list'] as $key => $item):
                        $icon_type = isset($item['icon_type']) ? $item['icon_type'] : '';
                        $icon = isset($item['icon']) ? $item['icon'] : '';
                        $image = isset($item['image']) ? $item['image'] : '';
                        $title = isset($item['title']) ? $item['title'] : '';
                        $desc = isset($item['desc']) ? $item['desc'] : '';
                        $button_text = isset($item['button_text']) ? $item['button_text'] : '';
                        $link_key = $widget->get_repeater_setting_key( 'button_link', 'value', $key );
                        if ( ! empty( $item['button_link']['url'] ) ) {
                            $widget->add_render_attribute( $link_key, 'href', $item['button_link']['url'] );

                            if ( $item['button_link']['is_external'] ) {
                                $widget->add_render_attribute( $link_key, 'target', '_blank' );
                            }

                            if ( $item['button_link']['nofollow'] ) {
                                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes = $widget->get_render_attribute_string( $link_key ); ?>
                        <div class="pxl-swiper-slider__item pxl-icon-box__item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
                            <div class="pxl-icon-box__item-inner">
                                <div class="pxl-icon-box__item-content">
                                    <?php if($icon_type == 'icon'): ?>
                                        <div class="pxl-icon-box__item-icon">
                                            <?php \Elementor\Icons_Manager::render_icon( $icon, [ 'aria-hidden' => 'true' ] ); ?>
                                            <div class="pxl-icon-box-line1"></div>
                                            <div class="pxl-icon-box-line2"></div>
                                        </div>
                                    <?php endif; ?>
                                    <?php if ( $icon_type == 'image' && !empty($image['id']) ) : ?>
                                        <div class="pxl-icon-box__item-icon">
                                            <?php $img_icon  = pxl_get_image_by_size( array(
                                                'attach_id'  => $image['id'],
                                                'thumb_size' => 'full',
                                            ) );
                                            $thumbnail_icon    = $img_icon['thumbnail'];
                                            echo pxl_print_html($thumbnail_icon); ?>
                                            <div class="pxl-icon-box-line1"></div>
                                            <div class="pxl-icon-box-line2"></div>
                                        </div>
                                    <?php endif; ?> 
                                    <<?php echo esc_attr($title_tag); ?> class="pxl-icon-box__item-title">
                                        <?php echo esc_html($title); ?>
                                    </div>
                                    <<?php echo esc_attr($title_tag); ?> class="pxl-icon-box__item-desc">
                                        <?php echo wp_kses_post($desc); ?>
                                    </div>
                                </div>
                                <?php if($button_text): ?>
                                    <div class="pxl-icon-box__item-button">
                                        <a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                                            <span><?php echo esc_html($button_text); ?></span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                                                <path d="M13.3355 6.02328L8.27297 11.0858C8.16742 11.1913 8.02427 11.2506 7.875 11.2506C7.72573 11.2506 7.58258 11.1913 7.47703 11.0858C7.37148 10.9802 7.31219 10.8371 7.31219 10.6878C7.31219 10.5385 7.37148 10.3954 7.47703 10.2898L11.5798 6.18781H0.5625C0.413316 6.18781 0.270242 6.12855 0.164753 6.02306C0.0592633 5.91757 0 5.7745 0 5.62531C0 5.47613 0.0592633 5.33305 0.164753 5.22757C0.270242 5.12208 0.413316 5.06281 0.5625 5.06281H11.5798L7.47703 0.960781C7.37148 0.855234 7.31219 0.71208 7.31219 0.562813C7.31219 0.413546 7.37148 0.270392 7.47703 0.164844C7.58258 0.0592961 7.72573 0 7.875 0C8.02427 0 8.16742 0.0592961 8.27297 0.164844L13.3355 5.22734C13.3878 5.27958 13.4293 5.34162 13.4576 5.40991C13.4859 5.4782 13.5004 5.55139 13.5004 5.62531C13.5004 5.69923 13.4859 5.77243 13.4576 5.84072C13.4293 5.909 13.3878 5.97104 13.3355 6.02328Z" fill="black"/>
                                            </svg>  
                                        </a>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
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
<?php endif; ?>
