<?php 
if ( ! empty( $settings['image_link']['url'] ) ) {
    $widget->add_render_attribute( 'image_link', 'href', $settings['image_link']['url'] );

    if ( $settings['image_link']['is_external'] ) {
        $widget->add_render_attribute( 'image_link', 'target', '_blank' );
    }

    if ( $settings['image_link']['nofollow'] ) {
        $widget->add_render_attribute( 'image_link', 'rel', 'nofollow' );
    }
}
$html_id = pxl_get_element_id($settings); 
if($settings['img_effect'] == 'pxl-image-parallax') { wp_enqueue_script( 'pxl-parallax-move-mouse'); }
?>
<div id="<?php echo esc_attr($html_id) ?>" class="pxl-image <?php if($settings['hide_parallax_sm'] !== 'false') { echo 'pxl-disable-parallax-sm'; } ?> <?php if(!empty($settings['img_effect'])) { echo esc_attr($settings['img_effect']); } ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms"  <?php if($settings['img_effect'] == 'pxl-image__tilt') : ?>data-maxtilt="<?php echo esc_attr($settings['max_tilt']); ?>" data-speedtilt="<?php echo esc_attr($settings['speed_tilt']); ?>" data-perspectivetilt="<?php echo esc_attr($settings['perspective_tilt']); ?>"<?php endif; ?> <?php if($settings['img_effect'] == 'pxl_image__parallax' || $settings['img_effect'] == 'pxl-image__parallax-scroll') : ?>data-parallax='{"<?php echo esc_attr($settings['parallax_scroll_type']); ?>":<?php echo esc_attr($settings['parallax_scroll_value_x'] ? $settings['parallax_scroll_value_x'] : $settings['parallax_value']); ?>}'<?php endif; ?>>
    <div class="pxl-image__inner" data-wow-delay="120ms">
        <?php if($settings['image_overlay'] == 'gradient') : ?>
            <div class="pxl-variant">
                <div class="pxl-variant__container" >
                    <div class="pxl-variant__group">
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                        <div class="pxl-variant__item"></div>
                    </div>
                </div>
            </div>
        <?php elseif($settings['image_overlay'] == 'angle') : ?>
            <div class="pxl-angle">
                <span class="pxl-angle__item pxl-angle__item-1"></span>
                <span class="pxl-angle__item pxl-angle__item-2"></span>
                <span class="pxl-angle__item pxl-angle__item-3"></span>
                <span class="pxl-angle__item pxl-angle__item-4"></span>
            </div>
        <?php endif; ?>
        <?php if($settings['source_type'] == 's_img' && !empty($settings['image']['id']) || $settings['source_type'] == 'f_img' && has_post_thumbnail()) : 
            $image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
            if(!empty($settings['image']['id'])) : $img_id = $settings['image']['id']; endif;
            if ($settings['source_type'] == 'f_img' && has_post_thumbnail()) {
                $img_id = get_post_thumbnail_id(get_the_ID());
            }
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $image_size,
                'class' => ''
            ) );
            $thumbnail    = $img['thumbnail'];
            $thumbnail_url    = $img['url']; ?>

            <?php switch ($settings['image_type']) {
                case 'bg': ?>
                    <div class="pxl-image__bg" style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);">
                        <?php if(!empty($settings['overlay_color'])) : ?>
                            <div class="pxl-overlay-color"></div>
                        <?php endif; ?>
                    </div>
                    <?php break;

                default: ?>
                    <div class="pxl-image__item" <?php if($settings['img_effect'] == 'pxl-image__parallax-scroll' || $settings['img_effect'] == 'pxl-image__parallax') : ?>data-parallax-value="<?php echo esc_attr($settings['parallax_value']); ?>"<?php endif; ?> <?php if($settings['img_effect'] == 'pxl-image__3d-ui') : ?>data-rotateX_from="<?php echo esc_attr($settings['data_rotateX_from']); ?>" data-rotateY_from="<?php echo esc_attr($settings['data_rotateY_from']); ?>" data-rotateX_to="<?php echo esc_attr($settings['data_rotateX_to']); ?>" data-rotateY_to="<?php echo esc_attr($settings['data_rotateY_to']); ?>"<?php endif; ?> >
                        <?php if($settings['img_bg']):?>
                            <div class="pxl-image__bgr"></div>
                        <?php endif;?>
                        <?php if ( ! empty( $settings['image_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'image_link' )); ?>><?php } ?>
                            <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
                        <?php if ( ! empty( $settings['image_link']['url'] ) ) { ?></a><?php } ?>
                        <?php if(!empty($settings['overlay_color'])) : ?>
                            <div class="pxl-image__overlay"></div>
                        <?php endif; ?>
                    </div>
                    <?php break;
            } ?>
        <?php endif; ?>
    </div>
</div>