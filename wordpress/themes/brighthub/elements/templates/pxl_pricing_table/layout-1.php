<?php 
    $data_table = $settings['table']; 
    $col_xs = $widget->get_setting('col_xs', '');
    $col_sm = $widget->get_setting('col_sm', '');
    $col_md = $widget->get_setting('col_md', '');
    $col_lg = $widget->get_setting('col_lg', '');
    $col_xl = $widget->get_setting('col_xl', '');
    $col_xxl = $widget->get_setting('col_xxl', '');

?>
<div class="pxl-pricing-table pxl-pricing-table__layout-1 <?php if($settings['row']) echo esc_attr('pxl-table__title-row'); ?> <?php if($settings['row']) echo esc_attr('pxl-table__title-column'); ?>">
    <?php renderTable($data_table, $settings['row'], $settings['column'], $settings['res_type'] === 'column', $settings['res_screen']); ?>
    <?php if($settings['res_type'] === 'column') :?>
        <div class="pxl-table__mobile column-xxl-<?php echo esc_attr($col_xxl); ?> column-xl-<?php echo esc_attr($col_xl); ?> column-lg-<?php echo esc_attr($col_lg); ?> column-md-<?php echo esc_attr($col_md); ?> column-sm-<?php echo esc_attr($col_sm); ?> column-xs-<?php echo esc_attr($col_xs); ?>"></div>
    <?php endif; ?>
</div>