<?php
if (isset($settings['vendor_list']) && !empty($settings['vendor_list']) && count($settings['vendor_list'])): ?>
    <div id="pxl-top-vender-<?php echo esc_attr($widget->get_id()); ?>" class="pxl-top-vender pxl-top-vender--layout-1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <?php foreach ($settings['vendor_list'] as $key => $item): 
            $item_id = isset($item['_id']) ? $item['_id'] : 'item-' . $key;
            $image = isset($item['image']) ? $item['image'] : [];
            $title = isset($item['title']) ? $item['title'] : '';
            $pxl_icon = isset($item['pxl_icon']) ? $item['pxl_icon'] : [];
            $has_image = !empty($image['id']) || !empty($image['url']);
            $has_icon = !empty($pxl_icon['value']);
            ?>
            <div class="pxl-top-vender__item elementor-repeater-item-<?php echo esc_attr($item_id); ?> wow fadeInRight" data-wow-delay="800ms">
                <?php if($key === 0): ?>
                    <div class="pxl-top-vender__item-wave">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                <?php endif; ?>
                <div class="pxl-top-vender__item-inner">
                    <?php if ($has_image): ?>
                        <div class="pxl-top-vender__image">
                            <?php 
                            if (!empty($image['id'])) {
                                $img = pxl_get_image_by_size(array(
                                    'attach_id'  => $image['id'],
                                    'thumb_size' => 'full',
                                ));
                                $thumbnail = isset($img['thumbnail']) ? $img['thumbnail'] : '';
                                echo pxl_print_html($thumbnail);
                            } elseif (!empty($image['url'])) {
                                echo '<img src="' . esc_url($image['url']) . '" alt="' . esc_attr($title) . '" />';
                            }
                            ?>
                        </div>
                    <?php endif; ?>
                    
                    <div class="pxl-top-vender__content">
                        <?php if (!empty($title)): ?>
                            <div class="pxl-top-vender__title"><?php echo esc_html($title); ?></div>
                        <?php endif; ?>
                        
                        <?php if ($has_icon): ?>
                            <div class="pxl-top-vender__icon">
                                <?php \Elementor\Icons_Manager::render_icon($pxl_icon, ['aria-hidden' => 'true'], 'i'); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
