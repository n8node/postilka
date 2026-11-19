<?php 
$position = brighthub()->get_page_opt('career_position','');
$type = brighthub()->get_page_opt('career_type','');
$team = brighthub()->get_page_opt('career_team','');
$location = brighthub()->get_page_opt('career_location','');
$location_icon = brighthub()->get_page_opt('career_location_icon','');
$salary = brighthub()->get_page_opt('career_salary','');
$slot = brighthub()->get_page_opt('career_slot','');
?>
<div class="pxl-cinfo pxl-cinfo__layout-1">
    <ul class="pxl-cinfo__list">
        <?php if(!empty($location) && $settings['show_location']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-loc">
                <?php 
                    if ( is_array($location_icon) && isset($location_icon['url']) ) {
                        $img_url = $location_icon['url'];
                    } elseif ( is_string($location_icon) ) {
                        $img_url = $location_icon;
                    } else {
                        $img_url = '';
                    }
                    if ( !empty($img_url) ) {
                        $img_id = attachment_url_to_postid($img_url);
                        if ( $img_id ) {
                            $img = pxl_get_image_by_size(array(
                                'attach_id'  => $img_id,
                                'thumb_size' => 'full'
                            ));
                            echo wp_kses_post($img['thumbnail']);
                        }
                    }
                ?>
                <?php echo esc_html($location); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($position) && $settings['show_pos']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-pos">
                <?php echo esc_html($position) ?>
            </li>
        <?php endif; ?>
        <?php if($settings['show_time']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-type">
                <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/clock.png'); ?>" alt="clock" loading="lazy"> <?php echo get_the_date('M d'); ?>,<?php echo get_the_date('Y'); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($slot) && $settings['show_slot']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-slot">
                <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/slot.png'); ?>" alt="slot" loading="lazy"> <?php echo esc_html($slot); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($type) && $settings['show_type']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-type">
                <?php echo esc_html($type); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($team) && $settings['show_team']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-team">
                <?php echo esc_html($team); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($salary) && $settings['show_salary']) : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-sal">
                <?php echo esc_html($salary); ?>
            </li>
        <?php endif; ?>
    </ul>
</div>