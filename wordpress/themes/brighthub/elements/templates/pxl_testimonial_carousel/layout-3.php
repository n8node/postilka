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
    'center_slide'                  => true  
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
if(isset($settings['testimonial_l3']) && !empty($settings['testimonial_l3']) && count($settings['testimonial_l3'])): ?>
    <div class="pxl-swiper-slider testimonial testimonial-3">
        <svg width="1172" height="900" viewBox="0 0 1172 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path id="rightPath" d="M858.5 1011L858.5 802C858.5 766.654 887.154 738 922.5 738L1082 738C1117.35 738 1146 709.346 1146 674L1146 222C1146 186.654 1117.35 158 1082 158L922.5 158C887.154 158 858.5 129.346 858.5 94L858.5 -115" stroke="#2F3E4E" stroke-width="1.5"/>
            <path id="leftPath" d="M313.5 1011L313.5 802C313.5 766.654 284.846 738 249.5 738L90 738C54.6538 738 26 709.346 26 674L25.9999 222C25.9999 186.654 54.6537 158 89.9999 158L249.5 158C284.846 158 313.5 129.346 313.5 94L313.5 -115" stroke="#2F3E4E" stroke-width="1.5"/>

            <circle r="8" fill="#7DEABC" stroke="#717680" stroke-width="5">
            <animateMotion repeatCount="indefinite" dur="4s" begin="0s">
                <mpath href="#leftPath"/>
            </animateMotion>
            </circle>

            <circle r="8" fill="#659DF8" stroke="#717680" stroke-width="5">
            <animateMotion repeatCount="indefinite" dur="4s" begin="0s" keyPoints="1;0" keyTimes="0;1">
                <mpath href="#rightPath"/>
            </animateMotion>
            </circle>

            <defs>
            <filter id="filter0_d_62_584" x="0.909092" y="377.182" width="50.1818" height="50.1818" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="3.27273"/>
            <feGaussianBlur stdDeviation="6.54545"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0941176 0 0 0 0 0.113725 0 0 0 0 0.152941 0 0 0 0.12 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_62_584"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_62_584" result="shape"/>
            </filter>
            <filter id="filter1_d_62_584" x="6.24259" y="382.515" width="39.5151" height="39.5153" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="3.27273"/>
            <feGaussianBlur stdDeviation="6.54545"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0941176 0 0 0 0 0.113725 0 0 0 0 0.152941 0 0 0 0.12 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_62_584"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_62_584" result="shape"/>
            </filter>
            <filter id="filter2_d_62_584" x="1120.91" y="548.182" width="50.1818" height="50.1818" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="3.27273"/>
            <feGaussianBlur stdDeviation="6.54545"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0941176 0 0 0 0 0.113725 0 0 0 0 0.152941 0 0 0 0.12 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_62_584"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_62_584" result="shape"/>
            </filter>
            <filter id="filter3_d_62_584" x="1126.24" y="553.515" width="39.5152" height="39.5153" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="3.27273"/>
            <feGaussianBlur stdDeviation="6.54545"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0941176 0 0 0 0 0.113725 0 0 0 0 0.152941 0 0 0 0.12 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_62_584"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_62_584" result="shape"/>
            </filter>
            </defs>
        </svg>

        <div class="pxl-swiper-slider__avatars">
            <?php foreach ($settings['testimonial_l3'] as $key => $value):
                $image = isset($value['image_l3']) ? $value['image_l3'] : '';
                $img = pxl_get_image_by_size([
                    'attach_id'  => $image['id'],
                    'thumb_size' => '64x64',
                    'class' => '',
                ]);
                $thumbnail = $img['thumbnail'];
                ?>
                <div class="pxl-swiper-slider__avatar" data-index="<?php echo esc_attr($key); ?>">
                    <?php echo wp_kses_post($thumbnail); ?>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="pxl-swiper-slider__inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-slider__wrapper">
                    <?php foreach ($settings['testimonial_l3'] as $key => $value):
                        $name = isset($value['name_l3']) ? $value['name_l3'] : '';
                        $position = isset($value['pos_l3']) ? $value['pos_l3'] : '';
                        $content = isset($value['content_l3']) ? $value['content_l3'] : '';
                        ?>
                        <div class="pxl-swiper-slider__item testimonial-item">
                            <div class="testimonial-item__inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                                <div class="testimonial-item__content">
                                    <div class="testimonial-item__content-text">
                                        <?php echo wp_kses_post($content); ?>
                                    </div>
                                </div>
                                <div class="testimonial-item__meta">
                                    <<?php echo esc_attr($title_tag); ?> class="testimonial-item__meta-name">
                                        <?php echo esc_html($name); ?>, 
                                    </<?php echo esc_attr($title_tag); ?>>
                                    <span class="testimonial-item__meta-position">
                                        <?php echo esc_html($position); ?>
                                    </span>
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
