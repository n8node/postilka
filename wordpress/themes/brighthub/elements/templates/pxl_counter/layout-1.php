<?php
$separator = $settings['thousand_separator_char'];
if($settings['effect'] == 'effect-odometer'){
    switch ($separator) {
        case ',':
            $separator = '(,ddd)';
            break;
        case '.':
            $separator = '(.ddd)';
            break;
        case ' ':
        case '&nbsp;':
            $separator = '( ddd)';
            break;
        case '':
        default:
            $separator = '(,ddd)';
            break;
    }
}

$widget->add_render_attribute( 'counter', [
    'class' => 'pxl-counter__value '.$settings['effect'],
    'data-duration' => $settings['duration'],
    'data-startnumber' => $settings['starting_number'],
    'data-endnumber' => $settings['ending_number'],
    'data-to-value' => $settings['ending_number'],
    'data-delimiter' => $separator,
    'data-delay' => $settings['delay'],
] );

$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
?>

<div class="pxl-counter pxl-counter--style-<?php echo esc_attr($settings['style']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <?php if ( $settings['icon_type'] == 'icon' && !empty($settings['pxl_icon']['value']) ) : ?>
        <div class="pxl-counter__icon">
            <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
        </div>
    <?php endif; ?>

    <?php if ( $settings['icon_type'] == 'image' && !empty($settings['icon_image']['id']) ) : ?>
        <div class="pxl-counter__icon">
            <?php 
                $img_icon = pxl_get_image_by_size([
                    'attach_id'  => $settings['icon_image']['id'],
                    'thumb_size' => 'full',
                ]);
                $thumbnail_icon = $img_icon['thumbnail'];
                echo pxl_print_html($thumbnail_icon); 
            ?>
        </div>
    <?php endif; ?>

    <div class="pxl-counter__holder">
        <?php if (!empty($settings['title']) && $settings['title_position'] == 'top') : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-counter__title"><?php echo pxl_print_html($settings['title']); ?></<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
        
        <div class="pxl-counter__number">
            <?php 
                $starting_number_is_set = (isset($settings['starting_number']) && $settings['starting_number'] !== '' && $settings['starting_number'] !== null);
                $ending_number_is_set = (isset($settings['ending_number']) && $settings['ending_number'] !== '' && $settings['ending_number'] !== null);
            ?>
            <?php if($starting_number_is_set && $ending_number_is_set): ?>
                <span class="pxl-counter__prefix"><?php echo pxl_print_html($settings['prefix']); ?></span>
                <span <?php pxl_print_html($widget->get_render_attribute_string('counter')); ?>>
                    <?php echo esc_html($settings['starting_number']); ?>
                </span>
                <?php if (!empty($settings['suffix'])) : ?>
                    <span class="pxl-counter__suffix"><?php echo pxl_print_html($settings['suffix']); ?></span>
                <?php endif; ?>
            <?php else: ?>
                <span class="pxl-counter__infinity">∞</span>
            <?php endif; ?>
        </div>

        <?php if (!empty($settings['title']) && $settings['title_position'] == 'bottom') : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-counter__title"><?php echo pxl_print_html($settings['title']); ?></<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
    </div>
</div>
