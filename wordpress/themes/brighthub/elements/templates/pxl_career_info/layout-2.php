<?php    
$position = brighthub()->get_page_opt('career_position','');
$type = brighthub()->get_page_opt('career_type','');
$team = brighthub()->get_page_opt('career_team','');
$location = brighthub()->get_page_opt('career_location','');
$location_icon = brighthub()->get_page_opt('career_location_icon','');
$salary = brighthub()->get_page_opt('career_salary','');
$slot = brighthub()->get_page_opt('career_slot','');
?>
<div class="pxl-cinfo pxl-cinfo__layout-2">
    <?php if(!empty($settings['title_2'])): ?>
        <h3 class="pxl-cinfo__title">
            <img src="<?php echo esc_url(get_template_directory_uri().'/assets/img/search-left.png'); ?>" alt="slot" loading="lazy">
            <?php echo esc_html($settings['title_2']); ?>
        </h3>
    <?php endif; ?>
    <ul class="pxl-cinfo__list">
        <?php if(!empty($position) && $settings['show_pos_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-pos">
                <?php if(!empty($settings['position_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['position_title_2']); ?>: 
                    </span>
                <?php endif; ?>
                <?php echo esc_html($position) ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($type) && $settings['show_type_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-type">
                <?php if(!empty($settings['type_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['type_title_2']); ?>: 
                    </span>
                <?php endif; ?>
                <span class="pxl-cinfo__item-gray"><?php echo esc_html($type); ?></span>
            </li>
        <?php endif; ?>
        <?php if(!empty($team) && $settings['show_team_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-team">
                <?php if(!empty($settings['team_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['team_title_2']); ?>: 
                    </span>
                <?php endif; ?>
                <?php echo esc_html($team); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($location) && $settings['show_location_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-loc">
                <?php if(!empty($settings['location_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['location_title_2']); ?>:
                    </span>
                <?php endif; ?>
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
        <?php if(!empty($salary) && $settings['show_salary_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-sal">
                <?php if(!empty($settings['salary_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['salary_title_2']); ?>: 
                    </span>
                <?php endif; ?>
                <?php echo esc_html($salary); ?>
            </li>
        <?php endif; ?>
        <?php if(!empty($slot) && $settings['show_slot_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-slot">
                <?php if(!empty($settings['slot_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['slot_title_2']); ?>: 
                    </span>
                <?php endif; ?>
            </li>
        <?php endif; ?>
        <?php if($settings['show_time_2'] === 'true') : ?>
            <li class="pxl-cinfo__item pxl-cinfo__item-time">
                <?php if(!empty($settings['time_title_2'])): ?>
                    <span>
                        <?php echo esc_html($settings['time_title_2']); ?>: 
                    </span>
                <?php endif; ?>
                <span class="pxl-cinfo__item-gray">
                    <?php echo get_the_date('M d'); ?>, <?php echo get_the_date('Y'); ?>
                </span>
            </li>
        <?php endif; ?>
    </ul>
</div>
<?php