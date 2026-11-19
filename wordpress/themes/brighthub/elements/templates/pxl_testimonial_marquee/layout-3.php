<?php
$fading_direction_desktop = esc_attr($settings['fading']) == 'true' && ($settings['direction'] == 'left' || $settings['direction'] == 'right') ? 'horizontal' : 'vertical';
$fading_direction_mobile = esc_attr($settings['fading']) == 'true' && ($settings['direction_mobile'] == 'left' || $settings['direction_mobile'] == 'right') ? 'mb-horizontal' : 'mb-vertical';
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
?>
<div class="pxl-marquee  <?php echo esc_attr($settings['fading'] ) == 'true' ? 'pxl-marquee--fading' : ''; ?> <?php echo esc_attr($fading_direction_desktop); ?> <?php echo esc_attr($fading_direction_mobile); ?>">
    <ul class="pxl-marquee__list pxl-marquee__list--testimonial pxl-marquee__list--testimonial-layout-3<?php if(isset($settings['highlight_item']) && $settings['highlight_item'] == 'yes') : ?> pxl-marquee__list--testimonial-highlight<?php endif; ?> pxl-marquee__<?php echo esc_attr($settings['direction']); ?> pxl-marquee__mb-<?php echo esc_attr($settings['direction_mobile']); ?>">
        <?php if (isset($settings['items']) && is_array($settings['items'])) : ?>
            <?php foreach ($settings['items'] as $item) : 
                ?>
                <li class="pxl-marquee__item<?php if(isset($item['highlight_item']) && $item['highlight_item'] == 'true') echo ' pxl-marquee__item--highlight'; ?>">
                    <span class="pxl-marquee__item-content">
                        <?php echo esc_html($item['content']); ?>
                    </span>
                    <span class="pxl-marquee__item-author">
                        <?php if (!empty($item['avatar']) && !empty($item['avatar']['id'])) : 
                            $img = pxl_get_image_by_size( array(
                                'attach_id'  => $item['avatar']['id'],
                                'thumb_size' => '40x40',
                                'class' => '',
                            ));
                            $thumbnail = $img['thumbnail']; ?>
                            <span class="pxl-marquee__item-avatar">
                                <?php echo wp_kses_post($thumbnail); ?>
                            </span>
                        <?php endif; ?>
                        <?php if (!empty($item['name'])) : ?>
                            <<?php echo esc_attr($title_tag); ?> class="pxl-marquee__item-name"><?php echo esc_html($item['name']); ?></<?php echo esc_attr($title_tag); ?>>
                        <?php endif; ?>
                        <?php if (!empty($item['position'])) : ?>
                            <span class="pxl-marquee__item-pos"><?php echo esc_html($item['position']); ?></span>
                        <?php endif; ?>
                    </span>
                </li>
            <?php endforeach; ?>
        <?php endif; ?>
    </ul>
</div>