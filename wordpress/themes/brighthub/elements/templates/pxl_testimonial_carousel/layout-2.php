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
$reverseDirection = $widget->get_setting('reverseDirection');
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
    'speed'                         => (int)$speed,
    'reverseDirection'              => (bool)$reverseDirection,
    'disableOnInteraction'          => false,
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
if(isset($settings['testimonial_l2']) && !empty($settings['testimonial_l2']) && count($settings['testimonial_l2'])): ?>
    <div class="pxl-swiper-slider testimonial testimonial-2">
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['testimonial_l2'] as $key => $value):
                        $name = isset($value['name_l2']) ? $value['name_l2'] : '';
                        $content = isset($value['content_l2']) ? $value['content_l2'] : '';
                        $image = isset($value['image_l2']) ? $value['image_l2'] : '';
                        ?>
                        <div class="pxl-swiper-slider__item testimonial-item">
                            <div class="testimonial-item__inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                <div class="testimonial-item__image">
                                    <?php $img = pxl_get_image_by_size( array(
                                        'attach_id'  => $image['id'],
                                        'thumb_size' => 'full',
                                        'class' => '',
                                    ));
                                    $thumbnail = $img['thumbnail'];
                                     echo wp_kses_post($thumbnail); ?>
                                </div>
                                <div class="testimonial-item__content">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18" fill="none">
                                        <path d="M13.548 17.1096V8.80802L16.6152 1.38601C16.8264 1.01159 17.2152 0.771592 17.6448 0.75L20.3184 0.75C20.712 0.75 20.892 1.03081 20.712 1.38601L17.664 8.80802H22.6872C23.0808 8.80802 23.4 9.12721 23.4 9.52081V17.1096C23.4 17.5032 23.0808 17.8224 22.6872 17.8224H14.2608C13.8672 17.8224 13.548 17.5032 13.548 17.1096Z" fill="#181D27"/>
                                        <path d="M0.600037 17.1096L0.600037 8.80802L3.66484 1.38601C3.87842 1.01159 4.26725 0.771592 4.69685 0.75L7.36803 0.750001C7.76403 0.750001 7.94166 1.03081 7.76403 1.38601L4.71364 8.80802H9.73926C10.1328 8.80802 10.4521 9.12721 10.4521 9.52081L10.452 17.1096C10.452 17.5032 10.1328 17.8224 9.73926 17.8224H1.31283C0.919255 17.8224 0.600037 17.5032 0.600037 17.1096Z" fill="#181D27"/>
                                    </svg>
                                    <div class="testimonial-item__content-text">
                                        <?php echo esc_html($content); ?>
                                    </div>
                                    <<?php echo esc_attr($title_tag); ?> class="testimonial-item__content-name">
                                        <?php echo esc_html($name); ?>
                                    </<?php echo esc_attr($title_tag); ?>>
                                </div>
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
