<?php $data_table = $settings['table']; ?>
<div class="pxl-table <?php if($settings['row']) echo esc_attr('pxl-table__title-row'); ?> <?php if($settings['row']) echo esc_attr('pxl-table__title-column'); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <?php renderTable($data_table, $settings['row'], $settings['column'], $settings['res_type'] === 'column', $settings['res_screen']); ?>
    <?php if($settings['res_type'] === 'column') :?>
        <div class="pxl-table__mobile"></div>
    <?php endif; ?>
</div>