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
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h5';
if(isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
    <div class="pxl-swiper-slider testimonial testimonial-1" <?php if($drag !== false) : ?>data-cursor-drag="<?php echo esc_attr__('DRAG', 'brighthub'); ?>"<?php endif; ?>>
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['testimonial'] as $key => $value):
                        $name = isset($value['name']) ? $value['name'] : '';
                        $position = isset($value['position']) ? $value['position'] : '';
                        $content_1 = isset($value['content_1']) ? $value['content_1'] : '';
                        $content_2 = isset($value['content_2']) ? $value['content_2'] : '';
                        $content_3 = isset($value['content_3']) ? $value['content_3'] : '';
                        $content_4 = isset($value['content_4']) ? $value['content_4'] : '';
                        $image = isset($value['image']) ? $value['image'] : '';
                        $icon_image = isset($value['icon_image']) ? $value['icon_image'] : '';
                        ?>
                        <div class="pxl-swiper-slider__item testimonial-item">
                            <div class="testimonial-item__inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                <div class="testimonial-item__top-content">
                                    <div class="testimonial-item__hidden-content">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <path d="M13.2938 7.43666L14.0968 9.66666C14.9888 12.1417 16.9378 14.0907 19.4128 14.9827L21.6428 15.7857C21.8438 15.8587 21.8438 16.1437 21.6428 16.2157L19.4128 17.0187C16.9378 17.9107 14.9888 19.8597 14.0968 22.3347L13.2938 24.5647C13.2208 24.7657 12.9358 24.7657 12.8638 24.5647L12.0608 22.3347C11.1688 19.8597 9.21976 17.9107 6.74476 17.0187L4.51476 16.2157C4.31376 16.1427 4.31376 15.8577 4.51476 15.7857L6.74476 14.9827C9.21976 14.0907 11.1688 12.1417 12.0608 9.66666L12.8638 7.43666C12.9358 7.23466 13.2208 7.23466 13.2938 7.43666Z" fill="#D5D7DA"/>
                                            <path d="M23.3318 2.07725L23.7388 3.20625C24.1908 4.45925 25.1778 5.44625 26.4308 5.89825L27.5598 6.30525C27.6618 6.34225 27.6618 6.48625 27.5598 6.52325L26.4308 6.93025C25.1778 7.38225 24.1908 8.36925 23.7388 9.62225L23.3318 10.7513C23.2948 10.8533 23.1508 10.8533 23.1138 10.7513L22.7068 9.62225C22.2548 8.36925 21.2678 7.38225 20.0148 6.93025L18.8858 6.52325C18.7838 6.48625 18.7838 6.34225 18.8858 6.30525L20.0148 5.89825C21.2678 5.44625 22.2548 4.45925 22.7068 3.20625L23.1138 2.07725C23.1508 1.97425 23.2958 1.97425 23.3318 2.07725Z" fill="#D5D7DA"/>
                                            <path d="M23.3318 21.2503L23.7388 22.3793C24.1908 23.6323 25.1778 24.6193 26.4308 25.0713L27.5598 25.4783C27.6618 25.5153 27.6618 25.6593 27.5598 25.6963L26.4308 26.1033C25.1778 26.5553 24.1908 27.5423 23.7388 28.7953L23.3318 29.9243C23.2948 30.0263 23.1508 30.0263 23.1138 29.9243L22.7068 28.7953C22.2548 27.5423 21.2678 26.5553 20.0148 26.1033L18.8858 25.6963C18.7838 25.6593 18.7838 25.5153 18.8858 25.4783L20.0148 25.0713C21.2678 24.6193 22.2548 23.6323 22.7068 22.3793L23.1138 21.2503C23.1508 21.1483 23.2958 21.1483 23.3318 21.2503Z" fill="#D5D7DA"/>
                                        </svg>
                                        <span></span>
                                    </div>
                                    <span class="testimonial-item__name-content"><?php echo pxl_print_html($name); ?></span>
                                    <?php if ($content_1): ?>
                                        <p class="testimonial-item__content testimonial-item__content-1">
                                            <?php echo pxl_print_html($content_1); ?>
                                        </p>
                                    <?php endif; ?>
                                    <?php if ($content_2): ?>
                                        <p class="testimonial-item__content testimonial-item__content-2">
                                            <?php echo pxl_print_html($content_2); ?>
                                        </p>
                                    <?php endif; ?>
                                    <?php if ($content_3): ?>
                                        <p class="testimonial-item__content testimonial-item__content-3">
                                            <?php echo pxl_print_html($content_3); ?>
                                        </p>
                                    <?php endif; ?>
                                    <?php if ($content_4): ?>
                                        <p class="testimonial-item__content testimonial-item__content-4">
                                            <?php echo pxl_print_html($content_4); ?>
                                        </p>
                                    <?php endif; ?>
                                </div>
                                <div class="testimonial-item__holder">
                                    <?php if(!empty($image['id'])) { 
                                        $img = pxl_get_image_by_size( array(
                                            'attach_id'  => $image['id'],
                                            'thumb_size' => '48x48',
                                            'class' => '',
                                        ));
                                        $thumbnail = $img['thumbnail'];?>
                                        <div class="testimonial-item__avatar ">
                                            <?php echo wp_kses_post($thumbnail); ?>
                                        </div>
                                    <?php } ?>
                                    <div class="testimonial-item__meta">
                                        <<?php echo esc_attr($title_tag); ?> class="testimonial-item__meta-name el-empty"><?php echo pxl_print_html($name); ?></<?php echo esc_attr($title_tag); ?>>
                                        <div class="testimonial-item__meta-position el-empty"><?php echo pxl_print_html($position); ?></div>
                                    </div>
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
