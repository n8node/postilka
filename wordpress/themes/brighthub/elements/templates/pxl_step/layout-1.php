<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-step pxl-step__style-<?php echo esc_attr($settings['style_item']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <?php if($settings['l1_number']) : ?>
        <div class="pxl-step__number">
            <?php echo esc_html($settings['l1_number']); ?>
        </div>
    <?php endif; ?>
    <?php if($settings['style_item'] == '1') : ?>
        <div class="pxl-step__line"></div>
    <?php endif; ?>
    <div class="pxl-step__content">
        <?php if($settings['l1_title']) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-step__content-title">
                <?php echo esc_html($settings['l1_title']); ?>
            </<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
        <?php if($settings['l1_desc']) : ?>
            <div class="pxl-step__content-desc">
                <?php echo esc_html($settings['l1_desc']); ?>
            </div>
        <?php endif; ?>
    </div>
</div>