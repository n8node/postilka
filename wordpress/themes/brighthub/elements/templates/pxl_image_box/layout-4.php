<?php $title_tag = !empty($settings['title_tag4']) && $settings['title_tag4'] !== 'df' ? $settings['title_tag4'] : 'div'; ?>
<div class="pxl-image-box pxl-image-box--layout-4 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-image-box__image">
        <?php $image_size = 'full';
            if(!empty($settings['image_l4']['id'])) : $img_id = $settings['image_l4']['id']; endif;
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $image_size,
                'class' => ''
            ) );
            $thumbnail    = $img['thumbnail'];
            $thumbnail_url    = $img['url']; ?>
        <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
        <div class="pxl-image-box__button">
            <?php \Elementor\Icons_Manager::render_icon( $settings['button_icon_l4'], [ 'aria-hidden' => 'true' ] ); ?>
        </div>
    </div>
    <div class="pxl-image-box__content">
        <div class="pxl-image-box__content-sub-title"><?php echo esc_html($settings['sub_title_l4']); ?></div>
        <<?php echo esc_attr($title_tag); ?> class="pxl-image-box__content-title"><?php echo esc_html($settings['title_l4']); ?></<?php echo esc_attr($title_tag); ?>>
        <div class="pxl-image-box__content-excerpt"><?php echo esc_html($settings['excerpt_l4']); ?></div>
        <div class="pxl-image-box__content-feature-list">
            <?php foreach ($settings['feature_list_l4'] as $feature) : ?>
                <div class="pxl-image-box__content-feature-item">
                    <?php \Elementor\Icons_Manager::render_icon( $feature['feature_icon_l4'], [ 'aria-hidden' => 'true' ] ); ?>
                    <span><?php echo esc_html($feature['feature_text_l4']); ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php if(!empty($settings['link_l4']['url'])) : ?>
        <a href="<?php echo esc_url($settings['link_l4']['url']); ?>" class="pxl-image-box__link-item"></a>
    <?php endif; ?>
</div>