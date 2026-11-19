<?php ?>
<div class="pxl-search-popup-button pxl-anchor-button <?php echo esc_attr($settings['style'] ?? 'style-default'); ?>" data-target="#pxl-search-popup">
    <?php 
    $icon_type = $settings['icon_image_type'] ?? 'img';
    if($icon_type == 'ic' && !empty($settings['pxl_icon']['value'])) {
        \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' );
    } else if ( !empty($settings['image']['id']) ) { 
        $image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
        if (function_exists('pxl_get_image_by_size')) {
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $settings['image']['id'],
                'thumb_size' => $image_size,
            ) );
            $thumbnail = $img['thumbnail'];
            echo wp_kses_post($thumbnail);
        } else {
            echo wp_get_attachment_image((int) $settings['image']['id'], $image_size, false, ['alt' => '']);
        }
    } else { ?>
        <i class="far fa-search"></i>
    <?php } ?>
    <span class="pxl-search-popup-button__text"><?php echo esc_html($settings['text_search_icon'] ?? 'SEARCH'); ?></span>
</div>

