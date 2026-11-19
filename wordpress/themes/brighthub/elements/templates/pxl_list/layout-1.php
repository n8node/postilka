<?php if (isset($settings['lists']) && !empty($settings['lists']) && count($settings['lists'])): ?>
    <?php
        $style_class   = 'pxl-list__style-' . ($settings['style'] ?? 'default');
        $type_class    = 'pxl-list__' . ($settings['type'] ?? 'default');
        $animate_class = $settings['pxl_animate'] ?? '';
        $animate_delay = $settings['pxl_animate_delay'] ?? 0;
    ?>
    <ul class="pxl-list <?php echo esc_attr("$style_class $type_class $animate_class"); ?>" data-wow-delay="<?php echo esc_attr($animate_delay); ?>ms" >
        <?php foreach ($settings['lists'] as $key => $value): ?>
            <?php
                $item_align = $settings['align'] ?? 'left';
                $has_icon = !empty($settings['pxl_icon']['value']) || 
                            !empty($settings['icon_image']['id']) || 
                            (!empty($value['content_icon']['value'] ?? '') || !empty($value['content_icon_image']['id'] ?? ''));
            ?>
            <li class="pxl-list__item pxl-list__item-<?php echo esc_attr($item_align); ?>  elementor-repeater-item-<?php echo esc_attr($value['_id']); ?>">
                <?php if ($has_icon): ?>
                    <div class="pxl-list__item-icon">
                        <?php
                        if (($settings['icon_type'] ?? '') === 'icon' && !empty($settings['pxl_icon']['value']) && empty($value['content_icon']['value'] ?? '')) {
                            \Elementor\Icons_Manager::render_icon($settings['pxl_icon'], ['aria-hidden' => 'true', 'class' => ''], 'i');
                        } elseif (($value['content_icon_type'] ?? '') === 'icon' && !empty($value['content_icon']['value'])) {
                            \Elementor\Icons_Manager::render_icon($value['content_icon'], ['aria-hidden' => 'true', 'class' => ''], 'i');
                        }

                        if (($settings['icon_type'] ?? '') === 'image' && !empty($settings['icon_image']['id']) && empty($value['content_icon_image']['id'] ?? '')) {
                            $img_icon = pxl_get_image_by_size([
                                'attach_id'  => $settings['icon_image']['id'],
                                'thumb_size' => 'full',
                            ]);
                            if (!empty($img_icon['thumbnail'])) {
                                echo pxl_print_html($img_icon['thumbnail']);
                            }
                        } elseif (($value['content_icon_type'] ?? '') === 'image' && !empty($value['content_icon_image']['id'])) {
                            $img_icon = pxl_get_image_by_size([
                                'attach_id'  => $value['content_icon_image']['id'],
                                'thumb_size' => 'full',
                            ]);
                            if (!empty($img_icon['thumbnail'])) {
                                echo pxl_print_html($img_icon['thumbnail']);
                            }
                        }
                        ?>
                    </div>
                <?php endif; ?>

                <?php if (!empty($value['content'])): ?>
                    <div class="pxl-list__item-text">
                        <?php echo pxl_print_html($value['content']); ?>
                    </div>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>
