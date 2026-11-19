<?php
if ( ! empty( $settings['logo_link']['url'] ) ) {
    $widget->add_render_attribute( 'logo_link', 'href', $settings['logo_link']['url'] );

    if ( $settings['logo_link']['is_external'] ) {
        $widget->add_render_attribute( 'logo_link', 'target', '_blank' );
    }

    if ( $settings['logo_link']['nofollow'] ) {
        $widget->add_render_attribute( 'logo_link', 'rel', 'nofollow' );
    }
}
if(!empty($settings['logo']['id']) && $settings['logo_style'] == '1') : 
    $img  = pxl_get_image_by_size( array(
        'attach_id'  => $settings['logo']['id'],
        'thumb_size' => 'full',
    ) );
    $thumbnail    = $img['thumbnail'];
    ?>
    <div class="pxl-logo <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'logo_link' )); ?>><?php } ?>
            <?php echo wp_kses_post($thumbnail); ?>
        <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?></a><?php } ?>
    </div>

<?php elseif(!empty($settings['logo']['id']) && $settings['logo_style'] == '2') : 
    $img  = pxl_get_image_by_size( array(
        'attach_id'  => $settings['logo']['id'],
        'thumb_size' => 'full',
    ) );
    $thumbnail    = $img['thumbnail'];
    ?>
    <div class="pxl-logo pxl-logo__style-circle <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <canvas class="pxl-star" data-star="<?php echo esc_attr($settings['number_of_star'] ?? 20); ?>"></canvas>
        <svg class="curve circle-1" xmlns="http://www.w3.org/2000/svg" width="218" height="212" viewBox="0 0 218 212" fill="none">
            <path d="M74.1182 70.0643C102.356 42.8368 131.834 22.2757 156.652 11.0364C169.063 5.41585 180.283 2.13903 189.585 1.50881C198.89 0.878405 206.202 2.89935 210.91 7.78242C215.619 12.6655 217.372 20.0466 216.403 29.3223C215.434 38.5947 211.75 49.6873 205.681 61.8851C193.545 86.2771 171.924 114.987 143.686 142.215C115.448 169.442 85.9693 190.003 61.1513 201.242C48.7402 206.863 37.5204 210.141 28.2188 210.771C18.914 211.401 11.6016 209.38 6.89329 204.497C2.185 199.614 0.431804 192.233 1.40078 182.957C2.36942 173.685 6.05344 162.591 12.1225 150.393C24.2586 126.001 45.88 97.2918 74.1182 70.0643Z" 
                    stroke="url(#paint0_linear_62_90)" 
                    stroke-width="2"/>
            <defs>
                <linearGradient id="paint0_linear_62_90" x1="140.002" y1="143.983" x2="74.5376" y2="80.0509" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#5DF7F7" stop-opacity="1">
                        <animate attributeName="stop-color" 
                                    values="#5DF7F7;#186A6A;#5DF7F7;#379191;#5DF7F7" 
                                    dur="3s" 
                                    repeatCount="indefinite"/>
                        <animate attributeName="stop-opacity" 
                                    values="1;0.8;1;0.6;1" 
                                    dur="3s" 
                                    repeatCount="indefinite"/>
                    </stop>
                    
                    <stop offset="40%" stop-color="#186A6A" stop-opacity="0.56">
                        <animate attributeName="stop-color" 
                                    values="#186A6A;#379191;#5DF7F7;#186A6A;#379191" 
                                    dur="3s" 
                                    begin="0s"
                                    repeatCount="indefinite"/>
                        <animate attributeName="stop-opacity" 
                                    values="0.56;0.4;0.8;0.56;0.3" 
                                    dur="3s" 
                                    begin="0s"
                                    repeatCount="indefinite"/>
                    </stop>
                    
                    <stop offset="100%" stop-color="#379191" stop-opacity="0"/>
                </linearGradient>
            </defs>
        </svg>
        <svg class="curve circle-2" width="239" height="142" viewBox="0 0 239 142" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M137.417 36.937C169.832 53.8493 197.138 73.0312 215.082 90.3607C224.056 99.0277 230.667 107.211 234.413 114.397C238.166 121.598 238.986 127.683 236.601 132.255C234.216 136.827 228.755 139.635 220.702 140.676C212.666 141.714 202.171 140.973 189.929 138.57C165.45 133.766 134.096 122.343 101.681 105.431C69.2657 88.5185 41.9601 69.3366 24.0161 52.0072C15.0417 43.3401 8.43047 35.1564 4.68516 27.9711C0.931771 20.7702 0.111181 14.6845 2.49635 10.1129C4.88157 5.54144 10.3426 2.73295 18.3959 1.69217C26.4319 0.653688 36.9265 1.39469 49.1691 3.79742C73.648 8.60171 105.002 20.0247 137.417 36.937Z" 
                stroke="url(#paint0_linear_62_89)" 
                stroke-width="2"/>
            <defs>
                <linearGradient id="paint0_linear_62_89" x1="98.8824" y1="102.98" x2="130.034" y2="39.4573" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#5DF7F7" stop-opacity="1">
                        <animate attributeName="stop-color" 
                                values="#5DF7F7;#186A6A;#5DF7F7;#379191;#5DF7F7" 
                                dur="3s" 
                                repeatCount="indefinite"/>
                        <animate attributeName="stop-opacity" 
                                values="1;0.8;1;0.6;1" 
                                dur="3s" 
                                repeatCount="indefinite"/>
                    </stop>
                    
                    <stop offset="0.4" stop-color="#186A6A" stop-opacity="0.56">
                        <animate attributeName="stop-color" 
                                values="#186A6A;#379191;#5DF7F7;#186A6A;#379191" 
                                dur="3s" 
                                begin="3s"
                                repeatCount="indefinite"/>
                        <animate attributeName="stop-opacity" 
                                values="0.56;0.4;0.8;0.56;0.3" 
                                dur="3s" 
                                begin="3s"
                                repeatCount="indefinite"/>
                    </stop>
                    
                    <stop offset="1" stop-color="#379191" stop-opacity="0"/>
                </linearGradient>
            </defs>
        </svg>
        <div class="pxl-logo__image">
            <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'logo_link' )); ?>><?php } ?>
                <?php echo wp_kses_post($thumbnail); ?>
            <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?></a><?php } ?>
        </div>
    </div>

<?php elseif(!empty($settings['logo']['id']) && $settings['logo_style'] == '3') : 
    $img  = pxl_get_image_by_size( array(
        'attach_id'  => $settings['logo']['id'],
        'thumb_size' => 'full',
    ) );
    $thumbnail    = $img['thumbnail'];
    ?>
    <div class="pxl-logo pxl-logo__style-3 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <div class="pxl-logo__line-1"></div>
        <div class="pxl-logo__line-2"></div>
        <div class="pxl-logo__line-3"></div>    
        <div class="pxl-logo__image">
            <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'logo_link' )); ?>><?php } ?>
                <?php echo wp_kses_post($thumbnail); ?>
            <?php if ( ! empty( $settings['logo_link']['url'] ) ) { ?></a><?php } ?>
        </div>
    </div>
<?php endif; ?>
