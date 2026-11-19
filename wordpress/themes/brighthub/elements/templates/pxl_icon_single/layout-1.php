<?php
$is_new = \Elementor\Icons_Manager::is_migration_allowed();
$default_settings = [
    'icon_align' => 'left',
    'style' => 'style-default',
    'icon_type' => 'icon',
];
$settings = array_merge($default_settings, $settings);

$has_icon = ($settings['icon_type'] == 'icon' && (!empty($settings['pxl_icon']['value']) || !empty($settings['pxl_icon'])));
$has_image = ($settings['icon_type'] == 'image' && !empty($settings['icon_image']['id']));

if ($has_icon || $has_image) :
    $link_key = 'icon_link';
    $link_attributes = '';
    if (!empty($settings['icon_link']['url'])) {
        $widget->add_render_attribute($link_key, 'href', $settings['icon_link']['url']);

        if ($settings['icon_link']['is_external']) {
            $widget->add_render_attribute($link_key, 'target', '_blank');
        }

        if ($settings['icon_link']['nofollow']) {
            $widget->add_render_attribute($link_key, 'rel', 'nofollow');
        }
        $link_attributes = $widget->get_render_attribute_string($link_key);
    }
    ?>
    <div class="pxl-icon pxl-icon--<?php echo esc_attr($settings['style'] . ' pxl-icon--'.$settings['icon_type'] . ' pxl-icon--'.$settings['style_light_box_position']); ?>">
        <<?php echo esc_attr($link_attributes ? 'a' : 'span'); ?> 
            class="pxl-icon__inner" 
            <?php echo $link_attributes; ?>>
            <?php if ($settings['icon_type'] == 'icon' && $has_icon) : ?>
                <?php if ($is_new) :
                    \Elementor\Icons_Manager::render_icon($settings['pxl_icon'], ['aria-hidden' => 'true']);
                elseif (!empty($settings['pxl_icon']['value'])) : ?>
                    <i class="<?php echo esc_html($settings['pxl_icon']['value']); ?>" aria-hidden="true"></i>
                <?php elseif (!empty($settings['pxl_icon'])) : ?>
                    <i class="<?php echo esc_html($settings['pxl_icon']); ?>" aria-hidden="true"></i>
                <?php endif; ?>
            <?php elseif ($settings['icon_type'] == 'image' && $has_image) : ?>
                <?php 
                $img_icon = pxl_get_image_by_size([
                    'attach_id'  => $settings['icon_image']['id'],
                    'thumb_size' => 'full',
                ]);
                $thumbnail_icon = isset($img_icon['thumbnail']) ? $img_icon['thumbnail'] : '';
                echo pxl_print_html($thumbnail_icon); 
                ?>
            <?php endif; ?>
        </<?php echo esc_attr($link_attributes ? 'a' : 'span'); ?>>
    </div>
<?php endif; ?>

