<form action="javascript:void(0)" class="pxl-select-change-counter">
    <select class="pxl-select-change-counter__select" name="pxl-select-change-counter" id="pxl-select-change-counter">
        <?php foreach ( $settings['select_change_counter_value_list'] as $key => $item ) : 
            ?>
            <option value="<?php echo esc_attr( $item['select_value'] ); ?>" <?php echo $key == $settings['active_item'] - 1 ? 'selected' : ''; ?>>
                <?php echo esc_html( $item['select_key'] ); ?>
            </option>
        <?php endforeach; ?>
    </select>
</form>