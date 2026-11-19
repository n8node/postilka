<?php if (!empty($settings['select_list']) && is_array($settings['select_list'])): ?>
    <?php 
    $first_item = reset($settings['select_list']); 
    $position = !empty($settings['options_position']) ? $settings['options_position'] : 'center';
    ?>
    <div class="pxl-selects pxl-selects--<?php echo esc_attr($position); ?>">
        <div class="pxl-selects__current">
            <?php if (!empty($first_item['image']['url'])): ?>
                <img src="<?php echo esc_url($first_item['image']['url']); ?>" 
                     alt="<?php echo esc_attr(!empty($first_item['select_label']) ? $first_item['select_label'] : ''); ?>">
            <?php endif; ?>
            <span><?php echo esc_html(!empty($first_item['select_label']) ? $first_item['select_label'] : ''); ?></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M8.45589 4.08128L5.33089 7.20628C5.28734 7.24998 5.2356 7.28465 5.17862 7.30831C5.12164 7.33197 5.06055 7.34415 4.99886 7.34415C4.93717 7.34415 4.87608 7.33197 4.8191 7.30831C4.76212 7.28465 4.71038 7.24998 4.66683 7.20628L1.54183 4.08128C1.45377 3.99322 1.4043 3.87379 1.4043 3.74925C1.4043 3.62471 1.45377 3.50528 1.54183 3.41722C1.62989 3.32916 1.74932 3.27969 1.87386 3.27969C1.9984 3.27969 2.11783 3.32916 2.20589 3.41722L4.99925 6.21058L7.79261 3.41683C7.88067 3.32877 8.0001 3.2793 8.12464 3.2793C8.24918 3.2793 8.36861 3.32877 8.45667 3.41683C8.54473 3.50489 8.5942 3.62432 8.5942 3.74886C8.5942 3.8734 8.54473 3.99283 8.45667 4.08089L8.45589 4.08128Z" fill="currentColor"/>
            </svg>
        </div>
        <ul class="pxl-selects__options">
            <?php foreach ($settings['select_list'] as $item): ?>
                <li data-value="<?php echo esc_attr(!empty($item['select_value']) ? $item['select_value'] : ''); ?>" 
                    class="pxl-selects__option">
                    <?php if (!empty($item['image']['url'])): ?>
                        <img src="<?php echo esc_url($item['image']['url']); ?>" 
                             alt="<?php echo esc_attr(!empty($item['select_label']) ? $item['select_label'] : ''); ?>">
                    <?php endif; ?>
                    <span><?php echo esc_html(!empty($item['select_label']) ? $item['select_label'] : ''); ?></span>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>