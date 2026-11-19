<div class="pxl-rating <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >    
    <ul class="pxl-rating__image">
        <?php
            foreach ($settings['items_l1'] as $key => $item):
                $image = isset($item['pxl_image_l1']) ? $item['pxl_image_l1'] : '';
                $img = pxl_get_image_by_size( array(
                    'attach_id'  => $image['id'],
                    'thumb_size' => '48x48',
                    'class' => '',
                ));
                $thumbnail = $img['thumbnail']; ?>
            
                <li class="pxl-rating__image-item">
                    <?php echo wp_kses_post($thumbnail); ?>
                </li>
        <?php endforeach; ?>
    </ul>
    <div class="pxl-rating__meta">
        <div class="pxl-rating__meta-star">
            <span><?php echo esc_html($settings['l1_star']) ?>/5</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M8.53357 1.20774C8.69828 0.781251 9.30172 0.78125 9.46643 1.20774L11.4051 6.22776C11.476 6.41129 11.6479 6.5362 11.8444 6.54689L17.2178 6.83945C17.6743 6.8643 17.8608 7.4382 17.5061 7.72664L13.3308 11.1217C13.1782 11.2459 13.1125 11.448 13.1631 11.6381L14.5453 16.8389C14.6627 17.2808 14.1746 17.6355 13.7906 17.3872L9.27147 14.4655C9.10625 14.3587 8.89375 14.3587 8.72853 14.4655L4.20939 17.3872C3.82545 17.6355 3.33726 17.2808 3.45469 16.8389L4.83694 11.6381C4.88747 11.448 4.8218 11.2459 4.66916 11.1217L0.493932 7.72664C0.139213 7.4382 0.325684 6.8643 0.782199 6.83945L6.15562 6.54689C6.35207 6.5362 6.52398 6.41129 6.59486 6.22776L8.53357 1.20774Z" fill="#FEC84B"/>
            </svg>
        </div>
        <div class="pxl-rating__meta-desc">
            <?php echo esc_html($settings['l1_desc']); ?>
        </div>
    </div>
</div>