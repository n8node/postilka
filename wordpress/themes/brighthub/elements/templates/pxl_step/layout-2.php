<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span'; ?>
<div class="pxl-step pxl-step__style-2 <?php echo esc_attr($settings['auto_play_once_l2'] ? 'auto-play-1-time' : ''); ?> <?php echo esc_attr($settings['auto_play_l2'] ? 'auto-play' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-step__feature-line"></div>
    <ul class="pxl-step__feature">
        <?php
            foreach ($settings['step_l2'] as $key => $item):
                $number = $widget->parse_text_editor( $item['l2_number'] ); 
                $title = $widget->parse_text_editor( $item['l2_title'] ); 
                $desc = $widget->parse_text_editor( $item['l2_desc'] ); ?>
                <li class="pxl-step__feature-item <?php echo esc_attr($desc ? 'has-content' : ''); ?> <?php echo esc_attr($key === 0 ? 'active' : ''); ?>">
                    <?php if($number) : ?>
                        <span class="pxl-step__feature-number"><?php echo pxl_print_html($number); ?></span>
                    <?php endif; ?>
                    <?php if($title || $desc) : ?>
                        <span class="pxl-step__feature-content">
                            <?php if($title) : ?>
                                <<?php echo esc_attr($title_tag); ?> class="pxl-step__feature-title"><?php echo pxl_print_html($title); ?></<?php echo esc_attr($title_tag); ?>>
                            <?php endif; ?>
                            <?php if($desc) : ?>
                                <span class="pxl-step__feature-desc"><?php echo pxl_print_html($desc); ?></span>
                            <?php endif; ?>
                        </span>
                    <?php endif; ?>
                </li>
        <?php endforeach; ?>
    </ul>
</div>