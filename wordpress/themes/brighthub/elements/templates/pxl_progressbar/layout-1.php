<?php
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
if(isset($settings['progressbar']) && !empty($settings['progressbar'])): 
    $is_new = \Elementor\Icons_Manager::is_migration_allowed(); ?>
    <div class="pxl-progressbar pxl-progressbar__layout-1">
        <?php foreach ($settings['progressbar'] as $key => $item): 
            $value = trim($item['value']);
            if (strpos($value, '/') !== false) {
                list($numerator, $denominator) = explode('/', $value);
                $percent = (floatval($numerator) / floatval($denominator)) * 100;
            } else {
                $percent = floatval($value);
            }
            ?>
            <div class="pxl-progressbar__item <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
                <span class="pxl-progressbar__item-meta">
                    <<?php echo esc_attr($title_tag); ?> class="pxl-progressbar__item-title"><?php echo pxl_print_html($item['title']); ?></<?php echo esc_attr($title_tag); ?>>
                    <?php if($settings['show_percent']) : ?>
                        <span class="pxl-progressbar__item-percentage"><?php echo esc_html($percent); ?>%</span>
                    <?php else: ?>
                        <span class="pxl-progressbar__item-value"><?php echo esc_html($item['value']); ?></span>
                    <?php endif; ?>
                </span>
                <span class="pxl-progressbar__item-wrap elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
                    <span class="pxl-progressbar__item-fill" role="progressbar" data-valuetransitiongoal="<?php echo esc_attr($percent); ?>"></span>
                </span>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>