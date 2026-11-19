<div class="pxl-icon-box pxl-icon-box--layout-6 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-icon-box__bg">
        <?php
        $list_count = 3;
        $item_per_list = 32;
        $line_min = 2;
        $line_max = 4;
        $line_width_min = 60;
        $line_width_max = 100;
        $marquee_data = [];
        for ($i = 0; $i < $list_count; $i++) {
            $marquee_data[$i] = [];
            for ($j = 0; $j < $item_per_list; $j++) {
                $random_item = mt_rand($line_min, $line_max);
                $widths = [];
                for ($k = 0; $k < $random_item; $k++) {
                    $widths[] = mt_rand($line_width_min, $line_width_max);
                }
                $marquee_data[$i][] = $widths;
            }
        }
        ?>

        <?php foreach ($marquee_data as $i => $items): ?>
            <div class="pxl-marquee__list pxl-marquee__<?php echo esc_attr($i % 2 === 0 ? 'bottom' : 'top'); ?>">
                <?php foreach ($items as $widths): ?>
                    <div class="pxl-marquee__item">
                        <?php foreach ($widths as $width): ?>
                            <span class="pxl-marquee__item-line" style="max-width: <?php echo esc_attr($width); ?>%;"></span>
                        <?php endforeach; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
    </div>
    <div class="pxl-icon-box__content">
        <?php if ( $settings['icon_type_layout_6'] == 'icon' && !empty($settings['pxl_icon_layout_6']['value']) ) : ?>
            <div class="pxl-icon-box__icon">
                <span class="pxl-icon-box__icon-inner">
                    <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon_layout_6'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                </span>
            </div>
        <?php endif; ?>

        <?php if ( $settings['icon_type_layout_6'] == 'image' && !empty($settings['icon_image_layout_6']['id']) ) : ?>
            <div class="pxl-icon-box__icon">
                <span class="pxl-icon-box__icon-inner">
                    <?php 
                    $img_icon  = pxl_get_image_by_size( array(
                        'attach_id'  => $settings['icon_image_layout_6']['id'],
                        'thumb_size' => 'full',
                    ) );
                    $thumbnail_icon = $img_icon['thumbnail'];
                    echo pxl_print_html($thumbnail_icon); 
                    ?>
                </span>
            </div>
        <?php endif; ?>
        <?php if ( !empty($settings['content_layout_6']) ) : ?>
            <?php if (!empty($settings['pxl_background_reveal_dot_pos']) && $settings['pxl_background_reveal_dot_pos'] !== 'none') : 
                $pos = $settings['pxl_background_reveal_dot_pos'];
                $uid = uniqid('pxl-reveal-');
            ?>
                <div class="pxl-icon-box__desc-wrapper">
                    <div class="pxl-background-reveal-dot-wrap pxl-background-reveal-dot__<?php echo esc_attr($pos); ?>" data-reveal-pos="<?php echo esc_attr($pos); ?>">
                        <svg class="pxl-background-reveal-dot-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                            <defs>
                                <pattern id="<?php echo esc_attr($uid); ?>-dots" x="0" y="0" width="35" height="35" patternUnits="userSpaceOnUse">
                                    <circle cx="0" cy="0" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="17.5" cy="0" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="35" cy="0" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="8.75" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="26.25" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="43.75" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="0" cy="35" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="17.5" cy="35" r="0.8" fill="white" opacity="0.3" />
                                    <circle cx="35" cy="35" r="0.8" fill="white" opacity="0.3" />
                                </pattern>
                                <radialGradient id="<?php echo esc_attr($uid); ?>-light-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                    <stop offset="0%" stop-color="white" stop-opacity="1" />
                                    <stop offset="25%" stop-color="white" stop-opacity="0.9" />
                                    <stop offset="50%" stop-color="white" stop-opacity="0.7" />
                                    <stop offset="70%" stop-color="white" stop-opacity="0.4" />
                                    <stop offset="85%" stop-color="white" stop-opacity="0.15" />
                                    <stop offset="100%" stop-color="white" stop-opacity="0" />
                                </radialGradient>
                                <mask id="<?php echo esc_attr($uid); ?>-light-mask">
                                    <rect width="100%" height="100%" fill="black" />
                                    <ellipse id="<?php echo esc_attr($uid); ?>-light" cx="50%" cy="50%" rx="40%" ry="25%" fill="url(#<?php echo esc_attr($uid); ?>-light-grad)" />
                                </mask>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#<?php echo esc_attr($uid); ?>-dots)" mask="url(#<?php echo esc_attr($uid); ?>-light-mask)" />
                        </svg>
                        <span class="pxl-background-reveal-dot pxl-background-reveal-dot__<?php echo esc_attr($pos); ?>"></span>
                    </div>
                    <p class="pxl-icon-box__desc"><?php echo pxl_print_html($settings['content_layout_6']); ?></p>
                </div>
            <?php else : ?>
                <p class="pxl-icon-box__desc"><?php echo pxl_print_html($settings['content_layout_6']); ?></p>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>