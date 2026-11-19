<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing__style-5 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <?php if (!empty($settings['plan_l5'])) : ?>
        <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
            <?php echo esc_html($widget->parse_text_editor($settings['plan_l5'])); ?>
        </<?php echo esc_attr($title_tag); ?>>
    <?php endif; ?> 
    <?php if (!empty($settings['desc_l5'])) : ?>
        <div class="pxl-pricing__desc">
            <?php echo esc_html($widget->parse_text_editor($settings['desc_l5'])); ?>
        </div>
    <?php endif; ?>
    <div class="pxl-pricing__price">
        <?php if($settings['sale_price_l5']): ?>
            <span class="pxl-pricing__price-currency" data-price-st="<?php echo esc_attr($settings['price_l5']) ?>" data-price-nd="<?php echo esc_attr($settings['price_l5_option_2']) ?>"><?php echo esc_html($settings['currency_l5']); ?><?php echo esc_html($settings['price_l5']); ?></span>
            <span class="pxl-pricing__price-sale" data-price-sale-st="<?php echo esc_attr($settings['sale_price_l5']) ?>" data-price-sale-nd="<?php echo esc_attr($settings['sale_price_l5_option_2']) ?>"><?php echo esc_html($settings['currency_l5']); ?><?php echo esc_html($settings['sale_price_l5']); ?></span>
        <?php else: ?>
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency_l5']); ?><span data-price-st="<?php echo esc_attr($settings['price_l5']) ?>" data-price-nd="<?php echo esc_attr($settings['price_l5_option_2']) ?>"><?php echo esc_html($settings['price_l5']); ?></span></span>
        <?php endif; ?>
        <span class="pxl-pricing__price-period"
            <?php if ($settings['period_l5']) : ?>
                data-period-st="<?php echo esc_attr($settings['period_l5']); ?>"
            <?php endif; ?>
            <?php if ($settings['period_l5_option_2']) : ?>
                data-period-nd="<?php echo esc_attr($settings['period_l5_option_2']); ?>"
            <?php endif; ?>>
            <?php echo esc_html($settings['period_l5']); ?>
        </span>
    </div>
    <?php if(!empty($settings['desc_price_l5'])): ?>
        <div class="pxl-pricing__price-desc">
            <?php echo esc_html($settings['desc_price_l5']); ?>
        </div>
    <?php endif; ?>
    <a href="<?php echo esc_attr($settings['btn_link_l5']['url']); ?>" class="pxl-pricing__button" target="<?php echo esc_attr($settings['btn_link_l5']['is_external'] ? '_blank' : '_self'); ?>" rel="<?php echo esc_attr($settings['btn_link_l5']['nofollow'] ? 'nofollow' : ''); ?>" >
        <?php echo esc_html($settings['btn_text_l5']); ?>
    </a>
    <div class="pxl-pricing__option">
        <?php if($settings['text_below_button_l5']): ?>
            <span class="pxl-pricing__option-text"
                <?php if ($settings['text_below_button_l5']): ?>
                    data-tb-st="<?php echo esc_attr($settings['text_below_button_l5']); ?>"
                <?php endif; ?>
                <?php if ($settings['text_below_button_l5_option_2']): ?>
                    data-tb-nd="<?php echo esc_attr($settings['text_below_button_l5_option_2']); ?>"
                <?php endif; ?>>
                <?php echo esc_html($settings['text_below_button_l5']); ?>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.71299 2.93164C8.20362 2.93164 6.69424 2.93164 5.16299 2.93164C4.94424 2.93164 4.72549 2.93164 4.52862 2.93164C3.89424 2.93164 3.89424 3.93789 4.52862 3.93789H8.44424C6.86924 5.44727 5.31612 6.97852 3.74112 8.48789C3.52237 8.70664 3.28174 8.92539 3.06299 9.14414C2.58174 9.60352 3.32549 10.3473 3.80674 9.86602C5.40362 8.31289 7.02237 6.75977 8.61924 5.18477C8.81612 4.98789 9.01299 4.81289 9.20987 4.61602V7.98477V8.61914C9.20987 9.25352 10.2161 9.25352 10.2161 8.61914C10.2161 7.10977 10.2161 5.57852 10.2161 4.06914C10.2161 3.85039 10.2161 3.63164 10.2161 3.43477C10.2161 3.17227 9.99737 2.93164 9.71299 2.93164Z" fill="#A4A7AE"/>
            </svg>
        <?php endif; ?>
    </div>
    <?php if(isset($settings['feature_l5']) && !empty($settings['feature_l5']) && count($settings['feature_l5'])): ?>
        <ul class="pxl-pricing__fea">
            <?php
                foreach ($settings['feature_l5'] as $key => $item):
                    $feature_text = $widget->parse_text_editor( $item['feature_text_l5'] ); 
                    $icon_key = $widget->get_repeater_setting_key( 'feature_icon_l5', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $item['feature_icon_l5'],
                        'aria-hidden' => 'true',
                    ] );
                    ?>
                    <li class="pxl-pricing__fea-item">
                        <?php 
                        if($icon_key) {
                            \Elementor\Icons_Manager::render_icon( $item['feature_icon_l5'], [ 'aria-hidden' => 'true' ], 'i' );
                        }
                        if($feature_text) {
                            echo pxl_print_html($feature_text);
                        } ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</div>