<?php
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h3';
if(isset($settings['post_list']) && !empty($settings['post_list']) && count($settings['post_list'])): ?>
    <div class="pxl-post-list pxl-post-list1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <?php foreach ($settings['post_list'] as $key => $value): 
            $number = isset($value['number']) ? $value['number'] : '';
            $title = isset($value['title']) ? $value['title'] : '';
            $image = isset($value['image']) ? $value['image'] : ''; 
            $link_key = $widget->get_repeater_setting_key( 'item_link', 'value', $key );
            if ( ! empty( $value['item_link']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $value['item_link']['url'] );

                if ( $value['item_link']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }

                if ( $value['item_link']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key ); ?>
            <div class="pxl-post--item">
                <?php if(!empty($image['id'])) { 
                    $img = pxl_get_image_by_size( array(
                        'attach_id'  => $image['id'],
                        'thumb_size' => '360x360',
                        'class' => '',
                    ));
                    $thumbnail = $img['thumbnail'];
                    $thumbnail_url = $img['url']; ?>
                    <div class="pxl-image__item">
                        <?php echo wp_kses_post($thumbnail); ?>
                        <?php if ( ! empty( $value['item_link']['url'] ) ) { ?>
                            <a class="pxl-item-link" <?php echo implode( ' ', [ $link_attributes ] ); ?>></a>
                        <?php } ?>
                    </div>
                    <div class="pxl-item--bg bg-image" style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);"></div>
                <?php } ?>
                <div class="pxl-item--holder">
                    <div class="pxl-item--number "><?php echo esc_html($number); ?></div>
                    <<?php echo esc_attr($title_tag); ?> class="pxl-item--title "><span><?php echo pxl_print_html($title); ?></span></<?php echo esc_attr($title_tag); ?>>
                    <?php if ( ! empty( $value['item_link']['url'] ) ) { ?>
                        <a class="pxl-item--readmore" <?php echo implode( ' ', [ $link_attributes ] ); ?>><i class="caseicon-right-arrow-2"></i></a>
                    <?php } ?>
                </div>
                <?php if ( ! empty( $value['item_link']['url'] ) ) { ?>
                    <a class="pxl-item-link" <?php echo implode( ' ', [ $link_attributes ] ); ?>></a>
                <?php } ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>