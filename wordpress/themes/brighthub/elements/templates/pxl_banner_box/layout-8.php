<?php
    if ( ! empty( $settings['scl8_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl8_link', 'href', $settings['scl8_link']['url'] );
    
        if ( $settings['scl8_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl8_link', 'target', '_blank' );
        }
    
        if ( $settings['scl8_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl8_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag8']) && $settings['title_tag8'] !== 'df' ? $settings['title_tag8'] : 'span';
?>
<div class="pxl-banner-box pxl-banner-box__style-8">
    <?php if ( ! empty( $settings['scl8_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl8_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
    <?php if ( ! empty( $settings['scl8_link']['url'] ) ) { ?></a><?php } ?>
    <div class="pxl-banner-box__image">
        <?php $image_size = 'full';
            if(!empty($settings['scl8_img_1']['id'])) : $img_id = $settings['scl8_img_1']['id']; endif;
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $image_size,
                'class' => ''
            ) );
            $thumbnail    = $img['thumbnail'];
            $thumbnail_url    = $img['url']; ?>
        <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
    </div>
    <div class="pxl-banner-box__meta">
        <div class="pxl-banner-box__title">
            <span class="pxl-banner-box__title-icon">
                <?php if (!empty($settings['scl8_icon']['value']) ) : ?>
                    <?php \Elementor\Icons_Manager::render_icon( $settings['scl8_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                <?php endif; ?>
            </span>
            <<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title-text">
                <?php echo esc_html($settings['scl8_title']); ?>
            </<?php echo esc_attr($title_tag); ?>>
        </div>
        <div href="" class="pxl-banner-box__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10.5018 0.935547C8.34557 0.935547 6.18932 0.935547 4.00182 0.935547C3.68932 0.935547 3.37682 0.935547 3.09557 0.935547C2.18932 0.935547 2.18932 2.37305 3.09557 2.37305H8.68932C6.43932 4.5293 4.22057 6.7168 1.97057 8.87305C1.65807 9.18555 1.31432 9.49805 1.00182 9.81055C0.314317 10.4668 1.37682 11.5293 2.06432 10.8418C4.34557 8.62305 6.65807 6.4043 8.93932 4.1543C9.22057 3.87305 9.50182 3.62305 9.78307 3.3418V8.1543V9.06055C9.78307 9.9668 11.2206 9.9668 11.2206 9.06055C11.2206 6.9043 11.2206 4.7168 11.2206 2.56055C11.2206 2.24805 11.2206 1.93555 11.2206 1.6543C11.2206 1.2793 10.9081 0.935547 10.5018 0.935547Z" fill="#181D27"/>
            </svg>
        </div>
    </div>
</div>