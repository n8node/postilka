<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing__style-9 <?php echo esc_attr($settings['active_l4'] === 'true' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <?php if (!empty($settings['popular_text_l4'])) : ?>
        <div class="pxl-pricing__popular">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M13.5029 9.5625C13.5043 9.79185 13.4346 10.016 13.3034 10.2041C13.1722 10.3922 12.9859 10.5351 12.7702 10.613L9.14348 11.9531L7.80755 15.5827C7.72843 15.7976 7.5853 15.9831 7.39745 16.1141C7.20961 16.2451 6.9861 16.3154 6.75708 16.3154C6.52805 16.3154 6.30454 16.2451 6.1167 16.1141C5.92886 15.9831 5.78572 15.7976 5.70661 15.5827L4.36223 11.9531L0.732702 10.6172C0.517777 10.5381 0.332291 10.3949 0.20127 10.2071C0.0702496 10.0193 0 9.79574 0 9.56672C0 9.33769 0.0702496 9.11418 0.20127 8.92634C0.332291 8.7385 0.517777 8.59536 0.732702 8.51625L4.36223 7.17187L5.69817 3.54234C5.77728 3.32742 5.92042 3.14193 6.10826 3.01091C6.2961 2.87989 6.51962 2.80964 6.74864 2.80964C6.97766 2.80964 7.20117 2.87989 7.38902 3.01091C7.57686 3.14193 7.72 3.32742 7.79911 3.54234L9.14348 7.17187L12.773 8.50781C12.9889 8.58642 13.175 8.73009 13.3058 8.91901C13.4365 9.10793 13.5054 9.33277 13.5029 9.5625ZM9.56536 2.8125H10.6904V3.9375C10.6904 4.08668 10.7496 4.22976 10.8551 4.33525C10.9606 4.44074 11.1037 4.5 11.2529 4.5C11.402 4.5 11.5451 4.44074 11.6506 4.33525C11.7561 4.22976 11.8154 4.08668 11.8154 3.9375V2.8125H12.9404C13.0895 2.8125 13.2326 2.75324 13.3381 2.64775C13.4436 2.54226 13.5029 2.39918 13.5029 2.25C13.5029 2.10082 13.4436 1.95774 13.3381 1.85225C13.2326 1.74676 13.0895 1.6875 12.9404 1.6875H11.8154V0.5625C11.8154 0.413316 11.7561 0.270242 11.6506 0.164752C11.5451 0.0592632 11.402 0 11.2529 0C11.1037 0 10.9606 0.0592632 10.8551 0.164752C10.7496 0.270242 10.6904 0.413316 10.6904 0.5625V1.6875H9.56536C9.41617 1.6875 9.2731 1.74676 9.16761 1.85225C9.06212 1.95774 9.00286 2.10082 9.00286 2.25C9.00286 2.39918 9.06212 2.54226 9.16761 2.64775C9.2731 2.75324 9.41617 2.8125 9.56536 2.8125ZM15.7529 5.0625H15.1904V4.5C15.1904 4.35082 15.1311 4.20774 15.0256 4.10225C14.9201 3.99676 14.777 3.9375 14.6279 3.9375C14.4787 3.9375 14.3356 3.99676 14.2301 4.10225C14.1246 4.20774 14.0654 4.35082 14.0654 4.5V5.0625H13.5029C13.3537 5.0625 13.2106 5.12176 13.1051 5.22725C12.9996 5.33274 12.9404 5.47582 12.9404 5.625C12.9404 5.77418 12.9996 5.91726 13.1051 6.02275C13.2106 6.12824 13.3537 6.1875 13.5029 6.1875H14.0654V6.75C14.0654 6.89918 14.1246 7.04226 14.2301 7.14775C14.3356 7.25324 14.4787 7.3125 14.6279 7.3125C14.777 7.3125 14.9201 7.25324 15.0256 7.14775C15.1311 7.04226 15.1904 6.89918 15.1904 6.75V6.1875H15.7529C15.902 6.1875 16.0451 6.12824 16.1506 6.02275C16.2561 5.91726 16.3154 5.77418 16.3154 5.625C16.3154 5.47582 16.2561 5.33274 16.1506 5.22725C16.0451 5.12176 15.902 5.0625 15.7529 5.0625Z" fill="url(#paint0_linear_3267_1427)" />
                <defs>
                    <linearGradient id="paint0_linear_3267_1427" x1="0" y1="8.15768" x2="16.3154" y2="8.15768" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#28C6FF" />
                        <stop offset="1" stop-color="#573CF1" />
                    </linearGradient>
                </defs>
            </svg>
            <?php echo pxl_print_html($widget->parse_text_editor($settings['popular_text_l4'])); ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($settings['tit_fea_l4'])): ?>
        <div class="pxl-pricing__bottom-tit">
            <?php echo esc_html($settings['tit_fea_l4']); ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($settings['plan_l4'])) : ?>
        <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
            <?php echo pxl_print_html($widget->parse_text_editor($settings['plan_l4'])); ?>
        </<?php echo esc_attr($title_tag); ?>>
    <?php endif; ?>

    <div class="pxl-pricing__price">
        <span class="pxl-pricing__price-detail">
            <?php echo esc_html($settings['currency_l4']); ?>
            <span class="pxl-pricing__price-detail-item-1">
                <?php echo esc_html($settings['price_l41']); ?>
                <span class="pxl-pricing__price-detail-item-period">
                    <?php echo esc_html($settings['period_l41']); ?>
                </span>
            </span>
            <span class="pxl-pricing__price-detail-item-2">
                <?php echo esc_html($settings['price_l42']); ?>
                <span class="pxl-pricing__price-detail-item-period">
                    <?php echo esc_html($settings['period_l42']); ?>
                </span>
            </span>
        </span>
    </div>

    <p class="pxl-pricing__desc">
        <?php echo esc_html($settings['desc_l4']); ?>
    </p>

    <div class="pxl-pricing__option" data-st="<?php echo esc_attr($settings['other_opt1_l4']); ?>" data-nd="<?php echo esc_attr($settings['other_opt2_l4']); ?>">
        <span class="pxl-pricing__option-text"><?php echo pxl_print_html($settings['other_opt1_l4']); ?></span>
    </div>

    <?php if (!empty($settings['desc_fea_l4'])): ?>
        <div class="pxl-pricing__bottom-desc">
            <?php echo esc_html($settings['desc_fea_l4']); ?>
        </div>
    <?php endif; ?>
    <?php if (isset($settings['feature_l4']) && !empty($settings['feature_l4']) && count($settings['feature_l4'])): ?>
        <ul class="pxl-pricing__fea">
            <?php
            foreach ($settings['feature_l4'] as $key => $item):
                $feature_text = $widget->parse_text_editor($item['feature_text_l4']);
                $icon_key = $widget->get_repeater_setting_key('feature_icon_l4', 'icons', $key);
                $widget->add_render_attribute($icon_key, [
                    'class' => $item['feature_icon_l4'],
                    'aria-hidden' => 'true',
                ]);
            ?>
                <li class="pxl-pricing__fea-item">
                    <?php
                    if ($icon_key) :
                        \Elementor\Icons_Manager::render_icon($item['feature_icon_l4'], ['aria-hidden' => 'true'], 'i');
                    else :
                        echo '<span class="pxl-pricing__fea-item--dot"></span>';
                    endif;

                    if ($feature_text) :
                        echo pxl_print_html($feature_text);
                    endif; ?>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
    <?php if (! empty($settings['btn_text_l4'])) {
        $widget->add_render_attribute('btn_link_l4', 'href', $settings['btn_link_l4']['url']);

        if ($settings['btn_link_l4']['is_external']) {
            $widget->add_render_attribute('btn_link_l4', 'target', '_blank');
        }

        if ($settings['btn_link_l4']['nofollow']) {
            $widget->add_render_attribute('btn_link_l4', 'rel', 'nofollow');
        } ?>
        <a <?php echo $widget->get_render_attribute_string('btn_link_l4'); ?> class="pxl-pricing__button btn btn-glossy <?php echo esc_attr($settings['active'] === 'yes' ? 'btn__pricing-active' : ''); ?>">
            <?php echo pxl_print_html($widget->parse_text_editor($settings['btn_text_l4'])); ?>
        </a>
    <?php } ?>
    <?php if (!empty($settings['text_under_button'])): ?>
        <div class="pxl-pricing__bottom-use">
            <?php echo esc_html($settings['text_under_button']); ?>
        </div>
    <?php endif; ?>
</div>