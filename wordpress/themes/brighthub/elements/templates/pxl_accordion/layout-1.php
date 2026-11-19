<?php
$active = intval($settings['active']);
$accordion = $widget->get_settings('accordion');
$wg_id = pxl_get_element_id($settings);
if(!empty($accordion)) : ?>
    <div class="pxl-accordion pxl-accordion--<?php echo esc_attr($settings['style']) ?> <?php echo esc_attr($settings['hide_overlay'] == 'true' ? 'pxl-accordion--hide-overlay' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <?php foreach ($accordion as $key => $value):
            $is_active = ($key + 1) == $active;
            $pxl_id = isset($value['_id']) ? $value['_id'] : '';
            $title = isset($value['title']) ? $value['title'] : '';
            $desc = isset($value['desc']) ? $value['desc'] : '';
            $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
            $widget->add_render_attribute( $icon_key, [
                'class' => $value['pxl_icon'],
                'aria-hidden' => 'true',
            ] ); ?>
            <div class="pxl-accordion__item <?php echo esc_attr($is_active ? 'active' : ''); ?>">
                <?php 
                if (!empty($settings['style']) && $settings['style'] === 'style-5' && !empty($settings['pxl_background_reveal_dot_pos']) && $settings['pxl_background_reveal_dot_pos'] !== 'none') {
                    $pos = $settings['pxl_background_reveal_dot_pos'];
                    $uid = uniqid('pxl-reveal-');

                    echo '<div class="pxl-background-reveal-dot-wrap pxl-background-reveal-dot__' . esc_attr($pos) . '" data-reveal-pos="' . esc_attr($pos) . '">';
                    echo '<svg class="pxl-background-reveal-dot-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">';
                    echo '<defs>
                        <pattern id="'.$uid.'-dots" x="0" y="0" width="35" height="35" patternUnits="userSpaceOnUse">
                            <circle cx="0" cy="0" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="17.5" cy="0" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="35" cy="0" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="8.75" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="26.25" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="43.75" cy="17.5" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="0" cy="35" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="17.5" cy="35" r="0.8" fill="white" opacity="0.3" />
                            <circle cx="35" cy="35" r="0.8" fill="white" opacity="0.3" />
                        </pattern>
                        <radialGradient id="'.$uid.'-light-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stop-color="white" stop-opacity="1" />
                            <stop offset="25%" stop-color="white" stop-opacity="0.9" />
                            <stop offset="50%" stop-color="white" stop-opacity="0.7" />
                            <stop offset="70%" stop-color="white" stop-opacity="0.4" />
                            <stop offset="85%" stop-color="white" stop-opacity="0.15" />
                            <stop offset="100%" stop-color="white" stop-opacity="0" />
                        </radialGradient>
                        <mask id="'.$uid.'-light-mask">
                            <rect width="100%" height="100%" fill="black" />
                            <ellipse id="'.$uid.'-light" cx="50%" cy="50%" rx="40%" ry="25%" fill="url(#'.$uid.'-light-grad)" />
                        </mask>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#'.$uid.'-dots)" mask="url(#'.$uid.'-light-mask)" />
                    </svg>';

                    echo '<span class="pxl-background-reveal-dot pxl-background-reveal-dot__' . esc_attr($pos) . '"></span>';
                    echo '</div>';
                }

                // Extra Light Background for style-5
                if (!empty($settings['style']) && $settings['style'] === 'style-5' && !empty($settings['pxl_background_reveal_extra_light_pos']) && $settings['pxl_background_reveal_extra_light_pos'] !== 'none') {
                    $extra_light_pos = $settings['pxl_background_reveal_extra_light_pos'];
                    echo '<div class="pxl-background-reveal-extra-light pxl-background-reveal-extra-light__' . esc_attr($extra_light_pos) . '"></div>';
                }
                ?>
                <<?php pxl_print_html($settings['title_tag']); ?> class="pxl-accordion__item-title" data-target="<?php echo esc_attr('#'.$wg_id.'-'.$pxl_id); ?>">
                    <span class="pxl-accordion__item-number">
                        <?php 
                            echo esc_html($key + 1); 
                            if (!empty($settings['style']) && $settings['style'] !== 'style-6') { 
                                echo '.'; 
                            } 
                        ?>
                    </span>
                    <span class="pxl-accordion__item-text"><?php echo wp_kses_post($title); ?></span>
                    <span class="pxl-accordion__item-action">
                        <?php if (!empty($settings['style']) && $settings['style'] === 'style-6') { ?>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M15.0233 7.14828L9.39828 12.7733C9.34604 12.8256 9.284 12.8671 9.21572 12.8954C9.14743 12.9237 9.07423 12.9383 9.00031 12.9383C8.92639 12.9383 8.8532 12.9237 8.78491 12.8954C8.71662 12.8671 8.65458 12.8256 8.60234 12.7733L2.97734 7.14828C2.8718 7.04273 2.8125 6.89958 2.8125 6.75031C2.8125 6.60105 2.8718 6.45789 2.97734 6.35234C3.08289 6.2468 3.22605 6.1875 3.37531 6.1875C3.52458 6.1875 3.66773 6.2468 3.77328 6.35234L9.00031 11.5801L14.2273 6.35234C14.2796 6.30008 14.3417 6.25863 14.4099 6.23034C14.4782 6.20206 14.5514 6.1875 14.6253 6.1875C14.6992 6.1875 14.7724 6.20206 14.8407 6.23034C14.909 6.25863 14.971 6.30008 15.0233 6.35234C15.0755 6.40461 15.117 6.46665 15.1453 6.53493C15.1736 6.60322 15.1881 6.6764 15.1881 6.75031C15.1881 6.82422 15.1736 6.89741 15.1453 6.96569C15.117 7.03398 15.0755 7.09602 15.0233 7.14828Z" fill="black"/>
                            </svg>
                        <?php } ?>
                    </span>
                </<?php pxl_print_html($settings['title_tag']); ?>>
                <div id="<?php echo esc_attr($wg_id.'-'.$pxl_id); ?>" class="pxl-accordion__item-content" <?php if($is_active){ ?>style="display: block;"<?php } ?>><?php echo wp_kses_post($desc); ?></div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>