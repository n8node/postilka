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
$item_class = "pxl-grid__item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h6';
?>
<?php if(isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
    <div class="pxl-grid pxl-testimonial-grid pxl-testimonial-grid1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <div class="pxl-grid__inner pxl-grid__masonry row" data-gutter="15">
            <?php foreach ($settings['testimonial'] as $key => $value):
    			$title = isset($value['title']) ? $value['title'] : '';
                $position = isset($value['position']) ? $value['position'] : '';
                $desc = isset($value['description']) ? $value['description'] : '';
                $image = isset($value['image']) ? $value['image'] : '';
                ?>
                <div class="<?php echo esc_attr($item_class); ?>">
                    <div class="pxl-swiper-slider__item-inner <?php echo esc_attr($settings['pxl_animate']); ?>">
                        <div class="pxl-item--star">
                            <span class="pxl-star--inner text-gradient">
                                <i class="caseicon-star"></i>
                                <i class="caseicon-star"></i>
                                <i class="caseicon-star"></i>
                                <i class="caseicon-star"></i>
                                <i class="caseicon-star"></i>
                            </span>
                        </div>
                        <div class="pxl-item--desc el-empty"><?php echo pxl_print_html($desc); ?></div>
                        <div class="pxl-item--divider"></div>
                        <div class="pxl-item--holder">
                            <?php if(!empty($image['id'])) { 
                                $img = pxl_get_image_by_size( array(
                                    'attach_id'  => $image['id'],
                                    'thumb_size' => '128x128',
                                    'class' => '',
                                ));
                                $thumbnail = $img['thumbnail'];?>
                                <div class="pxl-item--avatar ">
                                    <?php echo wp_kses_post($thumbnail); ?>
                                </div>
                            <?php } ?>
                            <div class="pxl-item--meta ">
                                <<?php echo esc_attr($title_tag); ?> class="pxl-item--title el-empty"><?php echo pxl_print_html($title); ?></<?php echo esc_attr($title_tag); ?>>
                                <?php if(!empty($position)) : ?>
                                    <div class="pxl-item--position"><?php echo pxl_print_html($position); ?></div>
                                <?php endif; ?>
                            </div>
                            <div class="pxl-item--icon"><i class="caseicon-quote-2 text-gradient"></i></div>
                        </div>
                   </div>
                </div>
            <?php endforeach; ?>
            <div class="pxl-grid__sizer <?php echo esc_attr($grid_sizer); ?>"></div>
        </div>
    </div>
<?php endif; ?>
