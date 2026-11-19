<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');

$col_xl = 12 / intval($col_xl);
$col_lg = 12 / intval($col_lg);
$col_md = 12 / intval($col_md);
$col_sm = 12 / intval($col_sm);
$col_xs = 12 / intval($col_xs);

$grid_sizer = "col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
$item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs} pxl-team__item";
$image_size = !empty($settings['img_size']) ? $settings['img_size'] : '354x354';

if ( ! empty( $settings['wg_btn_link']['url'] ) ) {
    $widget->add_render_attribute( 'button', 'href', $settings['wg_btn_link']['url'] );

    if ( $settings['wg_btn_link']['is_external'] ) {
        $widget->add_render_attribute( 'button', 'target', '_blank' );
    }

    if ( $settings['wg_btn_link']['nofollow'] ) {
        $widget->add_render_attribute( 'button', 'rel', 'nofollow' );
    }
}

$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h3'; ?>
<?php if(isset($settings['team']) && !empty($settings['team']) && count($settings['team'])): ?>
    <div class="pxl-grid pxl-team pxl-team--grid pxl-team__style-1">
        <div class="pxl-grid__inner pxl-grid__masonry row" data-gutter="15">
            <?php foreach ($settings['team'] as $key => $value):
    			$title = isset($value['title']) ? $value['title'] : '';
                $position = isset($value['position']) ? $value['position'] : '';
                $image = isset($value['image']) ? $value['image'] : '';
                $social = isset($value['social']) ? $value['social'] : '';
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
                <div class="<?php echo esc_attr($item_class); ?>">
                    <div class="pxl-swiper-slider__item-inner pxl-team__item-inner <?php echo esc_attr($settings['pxl_animate']); ?>">
                        <?php if(!empty($image['id'])) { 
                            $img = pxl_get_image_by_size( array(
                                'attach_id'  => $image['id'],
                                'thumb_size' => $image_size,
                                'class' => '',
                            ));
                            $thumbnail = $img['thumbnail']; ?>
                            <div class="pxl-team__item-image">
                                <?php if ( ! empty( $value['item_link']['url'] ) ) { ?><a <?php echo implode( ' ', [ $link_attributes ] ); ?>><?php } ?>
                                    <?php echo wp_kses_post($thumbnail); ?>
                                <?php if ( ! empty( $value['item_link']['url'] ) ) { ?></a><?php } ?>
                                <?php if(!empty($social)): 
                                    $team_social = json_decode($social, true); ?>
                                    <div class="pxl-item--social">
                                        <?php foreach ($team_social as $value): ?>
                                            <a href="<?php echo esc_url($value['url']); ?>" target="_blank"><i class="<?php echo esc_attr($value['icon']); ?>"></i></a>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php } ?>
                        <div class="pxl-team__item-content">
                            <<?php echo esc_attr($title_tag); ?> class="pxl-team__item-title"><?php echo pxl_print_html($title); ?></<?php echo esc_attr($title_tag); ?>>
                            <div class="pxl-team__item-pos"><span><?php echo pxl_print_html($position); ?></span></div>
                        </div>
                   </div>
                </div>
            <?php endforeach; ?>
            <div class="pxl-grid__sizer <?php echo esc_attr($grid_sizer); ?>"></div>
        </div>
    </div>
<?php endif; ?>
