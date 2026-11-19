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
    'loop'                          => (bool)$infinite,
    'speed'                         => (int)$speed,
    'reverseDirection'              => (bool)$reverseDirection ,
    'creativeEffect'                => 'card_rotate' ,
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
if(isset($settings['testimonial_l4']) && !empty($settings['testimonial_l4']) && count($settings['testimonial_l4'])): ?>
    <div class="pxl-swiper-slider testimonial testimonial-4">
        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['testimonial_l4'] as $key => $value):
                        $name = isset($value['name_l4']) ? $value['name_l4'] : '';
                        $position = isset($value['pos_l4']) ? $value['pos_l4'] : '';
                        $star = isset($value['star_l4']) ? $value['star_l4'] : '';
                        $content = isset($value['content_l4']) ? $value['content_l4'] : '';
                        $image = isset($value['image_l4']) ? $value['image_l4'] : '';
                        ?>
                        <div class="pxl-swiper-slider__item testimonial-item">
                            <div class="testimonial-item__inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                <div class="testimonial-item__meta">
                                    <?php if(!empty($image['id'])) { 
                                        $img = pxl_get_image_by_size( array(
                                            'attach_id'  => $image['id'],
                                            'thumb_size' => 'full',
                                            'class' => '',
                                        ));
                                        $thumbnail = $img['thumbnail'];?>
                                        <div class="testimonial-item__avatar ">
                                            <?php echo wp_kses_post($thumbnail); ?>
                                        </div>
                                    <?php } ?>
                                    <<?php echo esc_attr($title_tag); ?> class="testimonial-item__name">
                                        <?php echo esc_html($name); ?>
                                    </<?php echo esc_attr($title_tag); ?>>
                                    <div class="testimonial-item__pos">
                                        <?php echo esc_html($position); ?>
                                    </div>
                                </div>
                                <div class="testimonial-item__content">
                                    <div class="testimonial-item__star">
                                        <span class="testimonial-item__star-wrap">
                                            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.35139 0.406188C8.60668 -0.147291 9.39332 -0.147291 9.64861 0.406189L11.6539 4.75365C11.758 4.97923 11.9717 5.13455 12.2184 5.16379L16.9728 5.7275C17.578 5.79927 17.8211 6.5474 17.3736 6.96123L13.8586 10.2118C13.6762 10.3805 13.5946 10.6318 13.643 10.8754L14.5761 15.5713C14.6948 16.1691 14.0584 16.6315 13.5266 16.3338L9.34889 13.9953C9.13212 13.874 8.86788 13.874 8.65111 13.9953L4.47342 16.3338C3.94156 16.6315 3.30516 16.1691 3.42395 15.5713L4.35701 10.8754C4.40542 10.6318 4.32377 10.3805 4.14138 10.2118L0.626368 6.96123C0.178868 6.5474 0.421951 5.79927 1.02723 5.7275L5.78159 5.16379C6.02827 5.13455 6.24205 4.97923 6.3461 4.75365L8.35139 0.406188Z" fill="#FDB022"/>
                                            </svg>
                                            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.35139 0.406188C8.60668 -0.147291 9.39332 -0.147291 9.64861 0.406189L11.6539 4.75365C11.758 4.97923 11.9717 5.13455 12.2184 5.16379L16.9728 5.7275C17.578 5.79927 17.8211 6.5474 17.3736 6.96123L13.8586 10.2118C13.6762 10.3805 13.5946 10.6318 13.643 10.8754L14.5761 15.5713C14.6948 16.1691 14.0584 16.6315 13.5266 16.3338L9.34889 13.9953C9.13212 13.874 8.86788 13.874 8.65111 13.9953L4.47342 16.3338C3.94156 16.6315 3.30516 16.1691 3.42395 15.5713L4.35701 10.8754C4.40542 10.6318 4.32377 10.3805 4.14138 10.2118L0.626368 6.96123C0.178868 6.5474 0.421951 5.79927 1.02723 5.7275L5.78159 5.16379C6.02827 5.13455 6.24205 4.97923 6.3461 4.75365L8.35139 0.406188Z" fill="#FDB022"/>
                                            </svg>
                                            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.35139 0.406188C8.60668 -0.147291 9.39332 -0.147291 9.64861 0.406189L11.6539 4.75365C11.758 4.97923 11.9717 5.13455 12.2184 5.16379L16.9728 5.7275C17.578 5.79927 17.8211 6.5474 17.3736 6.96123L13.8586 10.2118C13.6762 10.3805 13.5946 10.6318 13.643 10.8754L14.5761 15.5713C14.6948 16.1691 14.0584 16.6315 13.5266 16.3338L9.34889 13.9953C9.13212 13.874 8.86788 13.874 8.65111 13.9953L4.47342 16.3338C3.94156 16.6315 3.30516 16.1691 3.42395 15.5713L4.35701 10.8754C4.40542 10.6318 4.32377 10.3805 4.14138 10.2118L0.626368 6.96123C0.178868 6.5474 0.421951 5.79927 1.02723 5.7275L5.78159 5.16379C6.02827 5.13455 6.24205 4.97923 6.3461 4.75365L8.35139 0.406188Z" fill="#FDB022"/>
                                            </svg>
                                            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.35139 0.406188C8.60668 -0.147291 9.39332 -0.147291 9.64861 0.406189L11.6539 4.75365C11.758 4.97923 11.9717 5.13455 12.2184 5.16379L16.9728 5.7275C17.578 5.79927 17.8211 6.5474 17.3736 6.96123L13.8586 10.2118C13.6762 10.3805 13.5946 10.6318 13.643 10.8754L14.5761 15.5713C14.6948 16.1691 14.0584 16.6315 13.5266 16.3338L9.34889 13.9953C9.13212 13.874 8.86788 13.874 8.65111 13.9953L4.47342 16.3338C3.94156 16.6315 3.30516 16.1691 3.42395 15.5713L4.35701 10.8754C4.40542 10.6318 4.32377 10.3805 4.14138 10.2118L0.626368 6.96123C0.178868 6.5474 0.421951 5.79927 1.02723 5.7275L5.78159 5.16379C6.02827 5.13455 6.24205 4.97923 6.3461 4.75365L8.35139 0.406188Z" fill="#FDB022"/>
                                            </svg>
                                            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.35139 0.406188C8.60668 -0.147291 9.39332 -0.147291 9.64861 0.406189L11.6539 4.75365C11.758 4.97923 11.9717 5.13455 12.2184 5.16379L16.9728 5.7275C17.578 5.79927 17.8211 6.5474 17.3736 6.96123L13.8586 10.2118C13.6762 10.3805 13.5946 10.6318 13.643 10.8754L14.5761 15.5713C14.6948 16.1691 14.0584 16.6315 13.5266 16.3338L9.34889 13.9953C9.13212 13.874 8.86788 13.874 8.65111 13.9953L4.47342 16.3338C3.94156 16.6315 3.30516 16.1691 3.42395 15.5713L4.35701 10.8754C4.40542 10.6318 4.32377 10.3805 4.14138 10.2118L0.626368 6.96123C0.178868 6.5474 0.421951 5.79927 1.02723 5.7275L5.78159 5.16379C6.02827 5.13455 6.24205 4.97923 6.3461 4.75365L8.35139 0.406188Z" fill="#FDB022"/>
                                            </svg>
                                        </span>
                                        <span class="testimonial-item__star-number"><?php echo esc_html($star) ?>/5</span>
                                    </div>
                                    <div class="testimonial-item__content-text">
                                        <?php echo esc_html($content); ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
        
        <?php if($pagination !== false): ?>
            <div class="pxl-swiper-dots pxl-swiper-dots__<?php echo esc_attr($settings['bullet_style']); ?>"></div>
        <?php endif; ?>

        <?php if($arrows !== false): ?>
            <div class="pxl-swiper__nav pxl-swiper__nav-style-1">
                <div class="pxl-swiper__nav-item pxl-swiper__nav-prev"><i class="caseicon-left-chevron rtl-icon"></i></div>
                <div class="pxl-swiper__nav-item pxl-swiper__nav-next"><i class="caseicon-right-chevron rtl-icon"></i></div>
            </div>
        <?php endif; ?>
        
    </div>
<?php endif; ?>
