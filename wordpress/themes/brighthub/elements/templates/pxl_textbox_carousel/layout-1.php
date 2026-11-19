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
$direction = $widget->get_setting('direction', 'vertical');
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
    'slide_direction'               => $direction,
    'slide_percolumn'               => 1, 
    'slide_mode'                    => 'slide', 
    'center_slide'                  => 'true', 
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
    'loop'                          => true,
    'speed'                         => (int)$speed,
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
if(isset($settings['textbox']) && !empty($settings['textbox']) && count($settings['textbox'])): ?>
    <div class="pxl-swiper-slider textbox textbox-1 <?php echo esc_attr($direction); ?>" <?php if($drag !== false) : ?>data-cursor-drag="<?php echo esc_attr__('DRAG', 'brighthub'); ?>"<?php endif; ?>>
        <?php if($drag !== false): ?>
            <div class="pxl-swiper-slider__cursor">
                <div class="pxl-swiper-slider__cursor-inner">
                    <div class="pxl-swiper-slider__cursor-text"></div>
                </div>
            </div>
        <?php endif; ?>
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['textbox'] as $key => $value):
                        $title = isset($value['title']) ? $value['title'] : '';
                        $description = isset($value['description']) ? $value['description'] : '';
                        ?>
                        <div class="pxl-swiper-slider__item textbox-item">
                            <div class="textbox-item__inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                <<?php echo esc_attr($title_tag); ?> class="textbox-item__title">
                                    <?php echo esc_html($title); ?>
                                </<?php echo esc_attr($title_tag); ?>>
                                <div class="textbox-item__desc">
                                    <?php echo wp_kses_post($description); ?>
                                </div>  
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php if($arrows !== false): ?>
                <div class="pxl-swiper__nav pxl-swiper__nav-style-2">
                    <div class="pxl-swiper__nav-item pxl-swiper__nav-prev">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="12" viewBox="0 0 22 12" fill="none">
                            <path d="M5.1862 11L1 6L5.1862 0.999999M21 5.99974L1.11727 5.99974" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="pxl-swiper__nav-item pxl-swiper__nav-next">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="12" viewBox="0 0 22 12" fill="none">
                            <path d="M16.8138 1L21 6L16.8138 11M1 6.00026H20.8827" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        
        <?php if($pagination !== false): ?>
            <div class="pxl-swiper-dots pxl-swiper-dots__<?php echo esc_attr($pagination_type); ?>"></div>
        <?php endif; ?>
    </div>
<?php endif; ?>
