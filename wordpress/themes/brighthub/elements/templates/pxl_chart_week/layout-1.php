<div class="pxl-chart-week pxl-chart-week--style-1 pxl-chart-week--<?php echo esc_attr($settings['chart_week_item_active_color_type']); ?>">
    <?php foreach ($settings['chart_week_list'] as $item) : ?>
        <div class="pxl-chart-week__item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?> <?php echo $item['chart_week_item_active'] === 'true' ? 'active' : ''; ?>">
            <span class="pxl-chart-week__item-value"><span class="line"></span></span>
            <span class="pxl-chart-week__item-day"><?php echo $item['chart_week_day']; ?></span>
        </div>
    <?php endforeach; ?>
</div>