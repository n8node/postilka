<?php
$fading_direction_desktop = esc_attr($settings['fading']) == 'true' && ($settings['direction'] == 'left' || $settings['direction'] == 'right') ? 'horizontal' : 'vertical';
$fading_direction_mobile = esc_attr($settings['fading']) == 'true' && ($settings['direction_mobile'] == 'left' || $settings['direction_mobile'] == 'right') ? 'mb-horizontal' : 'mb-vertical';
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
?>
<div class="pxl-marquee <?php echo esc_attr($settings['fading'] ) == 'true' ? 'pxl-marquee--fading' : ''; ?> <?php echo esc_attr($fading_direction_desktop); ?> <?php echo esc_attr($fading_direction_mobile); ?>">
    <ul class="pxl-marquee__list pxl-marquee__list--testimonial pxl-marquee__list--testimonial-layout-2 pxl-marquee__<?php echo esc_attr($settings['direction']); ?> pxl-marquee__mb-<?php echo esc_attr($settings['direction_mobile']); ?>">
        <?php if(isset($settings['items_l2']) && !empty($settings['items_l2']) && count($settings['items_l2'])): ?>
            <?php foreach ($settings['items_l2'] as $item) : ?>
            <li class="pxl-marquee__item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
                <?php if($item['show_grid'] === 'true'): ?>
                    <span class="pxl-marquee__item-grid"></span>
                <?php endif; ?>
                <?php if (!empty($item['avatar_l2'])) : ?>
                    <?php if(!empty($item['avatar_l2']['id'])) { 
                        $img = pxl_get_image_by_size( array(
                            'attach_id'  => $item['avatar_l2']['id'],
                            'thumb_size' => 'full',
                            'class' => '',
                        ));
                        $thumbnail = $img['thumbnail'];?>
                        <span class="pxl-marquee__item-avatar">
                            <?php echo wp_kses_post($thumbnail); ?>
                        </span>
                    <?php } ?>
                <?php endif; ?>
                <span class="pxl-marquee__item-content">
                    <?php echo esc_html($item['content_l2']); ?>
                </span>
                <span class="pxl-marquee__item-author">
                    <span class="pxl-marquee__item-author-info">
                        <?php if ($item['name_l2']) : ?>
                            <<?php echo esc_attr($title_tag); ?> class="pxl-marquee__item-author-name"><?php echo esc_html($item['name_l2']); ?></<?php echo esc_attr($title_tag); ?>>
                        <?php endif; ?>
                        <?php if ($item['position_l2']) : ?>
                            <span class="pxl-marquee__item-author-pos"><?php echo esc_html($item['position_l2']); ?></span>
                        <?php endif; ?>
                    </span>
                    
                    <?php if (!empty($item['star_l2'])) : ?>
                        <span class="pxl-marquee__item-author-star">
                            <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 0L9.88091 5.41115L15.6085 5.52786L11.0434 8.98885L12.7023 14.4721L8 11.2L3.29772 14.4721L4.95662 8.98885L0.391548 5.52786L6.11909 5.41115L8 0Z" fill="#181D27"/>
                            </svg>
                            <span class="pxl-marquee__item-author-star-value">
                                <?php 
                                    $value = floatval($item['star_l2']);
                                    echo (floor($value) == $value) 
                                        ? number_format($value, 1)
                                        : $value;
                                ?>
                            </span>
                        </span>
                    <?php endif; ?>
                </span>
            </li>
            <?php endforeach; ?>
        <?php endif; ?>
    </ul>
</div>