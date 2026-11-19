<div class="pxl-image-box pxl-image-box--layout-3 <?php echo esc_attr($settings['is_comming_soon'] == 'true' ? 'pxl-image-box--coming-soon' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-image-box__dot">
        <span class="pxl-image-box__dot-1"></span>
        <span class="pxl-image-box__dot-2"></span>
        <span class="pxl-image-box__dot-3"></span>
    </div>    
    <div class="pxl-image-box__inner">
        <div class="pxl-image-box__feature">
            <?php foreach($settings['feature_3'] as $feature) : ?>
                <div class="pxl-image-box__feature-item elementor-repeater-item-<?php echo esc_attr($feature['_id']); ?>">
                    <?php echo esc_html($feature['feature_text']); ?>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="pxl-image-box__image">
            <?php $image_size = 'full';
                if(!empty($settings['image_3']['id'])) : $img_id = $settings['image_3']['id']; endif;
                $img  = pxl_get_image_by_size( array(
                    'attach_id'  => $img_id,
                    'thumb_size' => $image_size,
                    'class' => ''
                ) );
                $thumbnail    = $img['thumbnail'];
                $thumbnail_url    = $img['url']; ?>
            <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
        </div>
        <div class="pxl-image-box__button pxl-image-box__button--<?php echo esc_attr($settings['button_3_position']); ?>">
            <?php foreach($settings['button_3'] as $button) : ?>
                <a class="btn <?php echo esc_attr($button['button_style']); ?> elementor-repeater-item-<?php echo esc_attr($button['_id']); ?>" href="<?php echo esc_url($button['button_link']['url']); ?>" <?php if($button['button_link']['is_external']) echo 'target="_blank"'; ?>>
                    <span class="btn-text"><?php echo esc_html($button['button_text']); ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</div>