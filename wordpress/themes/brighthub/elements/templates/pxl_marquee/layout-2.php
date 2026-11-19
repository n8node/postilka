<?php
$fading_direction_desktop = esc_attr($settings['fading']) == 'true' && ($settings['direction'] == 'left' || $settings['direction'] == 'right') ? 'horizontal' : 'vertical';
$fading_direction_mobile = esc_attr($settings['fading']) == 'true' && ($settings['direction_mobile'] == 'left' || $settings['direction_mobile'] == 'right') ? 'mb-horizontal' : 'mb-vertical';
?>

<div class="pxl-marquee  <?php echo esc_attr($settings['fading'] ) == 'true' ? 'pxl-marquee--fading' : ''; ?> <?php echo esc_attr($fading_direction_desktop); ?> <?php echo esc_attr($fading_direction_mobile); ?> pxl-marquee__style-2 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <ul class="pxl-marquee__list pxl-marquee__<?php echo esc_attr($settings['direction'].' pxl-marquee__'.esc_attr($settings['pause_on_hover'])); ?> pxl-marquee__mb-<?php echo esc_attr($settings['direction_mobile']); ?>" data-show="<?php echo esc_attr($settings['item_to_show']); ?>">
        <?php foreach ($settings['item'] as $key => $value):
            $image = isset($value['image']) ? $value['image'] : '';
            $link_key = $widget->get_repeater_setting_key( 'link', 'value', $key );
            if ( ! empty( $value['link']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $value['link']['url'] );

                if ( $value['link']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }

                if ( $value['link']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key );
            $text = $widget->parse_text_editor($value['text']);
            ?>
            <li class="pxl-marquee__item">
                <?php if(!empty($image['id'])) { 
                    $img_image = pxl_get_image_by_size( array(
                        'attach_id'  => $image['id'],
                        'thumb_size' => 'full',
                        'class' => '',
                    ));
                    $thumbnail_image = $img_image['thumbnail'];?>
                    <a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                        <?php echo wp_kses_post($thumbnail_image); ?>
                        <span> <?php echo wp_kses_post($text); ?> </span>
                    </a>
                <?php } ?>
            </li>
        <?php endforeach; ?>
    </ul>
</div>
