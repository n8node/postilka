<div class="pxl-image-box pxl-image-box--layout-2 <?php if($settings['active'] == 'true') echo esc_attr('active'); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-image-box__image">
        <?php $image_size = 'full';
            if(!empty($settings['image_2']['id'])) : $img_id = $settings['image_2']['id']; endif;
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $image_size,
                'class' => ''
            ) );
            $thumbnail    = $img['thumbnail'];
            $thumbnail_url    = $img['url']; ?>
        <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
    </div>
    <div class="pxl-image-box__button">
        <?php if($settings['button_1_text']) :?>
            <a class="btn btn-primary btn-glossy" href="<?php echo esc_url($settings['button_1_link']['url']); ?>" <?php if($settings['button_1_link']['is_external']) echo 'target="_blank"'; ?>>
                <?php echo esc_html($settings['button_1_text']); ?>
            </a>
        <?php endif; ?>
        <?php if($settings['button_2_text']) :?>
            <a class="btn btn-primary btn-glossy" href="<?php echo esc_url($settings['button_2_link']['url']); ?>" <?php if($settings['button_2_link']['is_external']) echo 'target="_blank"'; ?>>
                <?php echo esc_html($settings['button_2_text']); ?>
            </a>
        <?php endif; ?>
    </div>
    <?php if($settings['active_text']) :?>
        <div class="pxl-image-box__active-text">
            <?php echo esc_html($settings['active_text']); ?>
        </div>
    <?php endif; ?>
</div>