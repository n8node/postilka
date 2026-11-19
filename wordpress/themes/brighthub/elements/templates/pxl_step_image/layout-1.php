<div class="pxl-step-image pxl-step-image__<?php echo esc_attr($settings['style']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
   
    <ul class="pxl-step-image__list">
        <?php foreach ($settings['step_image'] as $key => $value):  ?>
        <li class="pxl-step-image__item <?php echo esc_attr($key === 0 ? 'active' : ''); ?>">
            <?php if($settings['style'] === 'style-1') : ?>
                <div class="pxl-variant">
                    <div class="pxl-variant__container" >
                        <div class="pxl-variant__group">
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                            <div class="pxl-variant__item"></div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            <?php
                $image = isset($value['step_image_item']) ? $value['step_image_item'] : '';
                if(!empty($image['id'])) { 
                    $img = pxl_get_image_by_size( array(
                        'attach_id'  => $image['id'],
                        'thumb_size' => 'full',
                        'class' => '',
                    ));
                    $thumbnail = $img['thumbnail'];
                    echo wp_kses_post($thumbnail);
                ?>
                <?php } ?>
            <?php endforeach; ?>
        </li>
    </ul>
</div>