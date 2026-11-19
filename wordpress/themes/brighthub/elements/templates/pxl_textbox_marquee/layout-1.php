<?php
$fading_direction_desktop = esc_attr($settings['fading']) == 'true' && ($settings['direction'] == 'left' || $settings['direction'] == 'right') ? 'horizontal' : 'vertical';
$fading_direction_mobile = esc_attr($settings['fading']) == 'true' && ($settings['direction_mobile'] == 'left' || $settings['direction_mobile'] == 'right') ? 'mb-horizontal' : 'mb-vertical';
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
?>
<?php if ( !empty($settings['textbox']) && count($settings['textbox']) > 0 ) : ?>
    <div class="pxl-marquee  <?php echo esc_attr($settings['fading'] ) == 'true' ? 'pxl-marquee--fading' : ''; ?> <?php echo esc_attr($fading_direction_desktop); ?> <?php echo esc_attr($fading_direction_mobile); ?>">
        <ul class="pxl-marquee__list pxl-marquee__list--textbox pxl-marquee__list--scrollbar-<?php echo esc_attr($settings['show_scrollbar']); ?> pxl-marquee__<?php echo esc_attr($settings['direction']); ?> pxl-marquee__mb-<?php echo esc_attr($settings['direction_mobile']); ?>">
            <?php foreach ($settings['textbox'] as $key => $item) : ?>
                <li class="pxl-marquee__item">
                    <<?php echo esc_attr($title_tag); ?> class="pxl-marquee__item-title">
                        <?php echo esc_html($item['title']); ?>
                    </<?php echo esc_attr($title_tag); ?>>
                    <div class="pxl-marquee__item-description">
                        <?php echo esc_html($item['description']); ?>
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>